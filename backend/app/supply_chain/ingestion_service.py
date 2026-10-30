import datetime
import hashlib
import json
import math
import re
import threading
import uuid
from typing import Any, Dict, List, Optional, Tuple
import jcs
from sqlalchemy.orm import Session
from sqlalchemy import desc

from .models import (
    IntelligenceSource,
    ExternalDisruptionEvent,
    EventEvidence,
    EventEvidenceManifest,
    EventCorrelation,
    EventReview,
    IngestionRun,
    Disruption,
    DisruptionShipment,
    Shipment,
    Supplier,
    PurchaseOrder,
    Warehouse,
    CustomerOrder,
)
from .connectors import (
    NormalizedExternalEvent,
    INGESTION_ADAPTERS,
    sanitize_untrusted_text,
)
from backend.app.blockchain.hash_service import ZERO_MANIFEST_SENTINEL

# Threading lock to prevent concurrent polling runs from interleaving
_INGESTION_LOCK = threading.Lock()


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two geographic coordinates in kilometers."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


def canonicalize_evidence_dict(payload_dict: Dict[str, Any]) -> str:
    """
    Produces deterministic RFC 8785 canonical JSON formatting for evidence verification.
    Uses the maintained `jcs` library (RFC 8785 JSON Canonicalization Scheme).
    Keys are sorted by UTF-16 code units, whitespace is eliminated, numbers formatted per ECMAScript,
    and Unicode is encoded directly into UTF-8.
    """
    return jcs.canonicalize(payload_dict).decode("utf-8")


class DisruptionIngestionService:
    """
    Ingestion, Validation, Deduplication, Provenance, and Evidence Integrity Pipeline.
    Transitions raw external feeds into validated Disruption Candidates with explainable trust scores.
    """

    @classmethod
    def initialize_sources(cls, db: Session):
        """Ensures all registered source adapters exist in the database with their current configuration."""
        for src_id, adapter in INGESTION_ADAPTERS.items():
            record = db.query(IntelligenceSource).filter_by(source_id=src_id).first()
            is_live_configured = adapter.is_configured_live
            mode = "LIVE" if is_live_configured else ("MANUAL" if adapter.source_type == "MANUAL_REPORT" else "DEMO")

            # Compute authoritative connection status
            if adapter.source_type == "MANUAL_REPORT":
                conn_status = "HEALTHY"
            elif adapter.env_key_name and not is_live_configured:
                conn_status = "NOT_CONFIGURED"
            elif mode == "DEMO":
                conn_status = "DEMO"
            else:
                conn_status = "HEALTHY"

            if not record:
                record = IntelligenceSource(
                    source_id=adapter.source_id,
                    source_name=adapter.source_name,
                    source_type=adapter.source_type,
                    provider_name=adapter.provider_name,
                    endpoint_url=adapter.endpoint_url,
                    mode=mode,
                    connection_status=conn_status,
                    is_active=True,
                    requires_auth=bool(adapter.env_key_name),
                    env_key_name=adapter.env_key_name,
                    reliability_tier="TIER_1_AUTHORITATIVE" if "AIS" in src_id or "PORT" in src_id else "TIER_2_VERIFIED_FEED",
                    default_confidence_weight=adapter.default_confidence_weight,
                    rate_limit_rpm=adapter.rate_limit_rpm,
                    consecutive_failures=0,
                    events_processed_count=0,
                    duplicates_count=0,
                    rejected_count=0,
                )
                db.add(record)
            else:
                record.mode = mode
                record.is_active = True
                record.requires_auth = bool(adapter.env_key_name)
                # Keep tracked failure state if previously recorded
                if record.consecutive_failures == 0:
                    record.connection_status = conn_status
        db.commit()

    @classmethod
    def run_ingestion_cycle(
        cls, db: Session, organization_id: str, source_id: Optional[str] = None, force_demo: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Executes an ingestion pass for all or specified sources with concurrency protection.
        Prevents concurrent polling runs from causing race conditions or duplicate records.
        """
        acquired = _INGESTION_LOCK.acquire(blocking=True, timeout=2.0)
        if not acquired:
            raise RuntimeError("An ingestion run is currently in progress. Concurrent polling blocked.")

        try:
            cls.initialize_sources(db)
            sources_to_run = [source_id] if source_id else list(INGESTION_ADAPTERS.keys())
            results = []

            for sid in sources_to_run:
                adapter = INGESTION_ADAPTERS.get(sid)
                if not adapter:
                    continue

                source_rec = db.query(IntelligenceSource).filter_by(source_id=sid).first()
                run_id = f"RUN-{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{sid[:8]}"

                if source_rec:
                    source_rec.last_attempted_at = datetime.datetime.utcnow()

                ingest_result = adapter.ingest(force_demo=force_demo)

                # Persist ingestion run log
                run_log = IngestionRun(
                    run_id=run_id,
                    source_id=sid,
                    mode=ingest_result["mode"],
                    status=ingest_result["status"],
                    events_ingested=len(ingest_result["events"]),
                    execution_duration_ms=ingest_result["duration_ms"],
                    error_summary=ingest_result["error"],
                    started_at=datetime.datetime.utcnow(),
                    completed_at=datetime.datetime.utcnow(),
                )
                db.add(run_log)

                validated_count = 0
                duplicates_count = 0
                rejected_count = 0
                latest_evt_time = None

                for norm_evt in ingest_result["events"]:
                    db_event, is_duplicate = cls.process_incoming_event(db, norm_evt, organization_id)
                    if db_event.validation_status == "REJECTED":
                        rejected_count += 1
                    elif is_duplicate:
                        duplicates_count += 1
                    else:
                        validated_count += 1

                    if latest_evt_time is None or norm_evt.event_timestamp > latest_evt_time:
                        latest_evt_time = norm_evt.event_timestamp

                run_log.events_validated = validated_count
                run_log.duplicates_filtered = duplicates_count

                # Update authoritative source telemetry
                if source_rec:
                    source_rec.last_ingestion_at = datetime.datetime.utcnow()
                    source_rec.last_error_message = ingest_result["error"]
                    source_rec.events_processed_count = (source_rec.events_processed_count or 0) + len(ingest_result["events"])
                    source_rec.duplicates_count = (source_rec.duplicates_count or 0) + duplicates_count
                    source_rec.rejected_count = (source_rec.rejected_count or 0) + rejected_count
                    if latest_evt_time:
                        source_rec.last_event_timestamp = latest_evt_time

                    if ingest_result["status"] == "SUCCESS":
                        source_rec.consecutive_failures = 0
                        source_rec.last_successful_at = datetime.datetime.utcnow()
                        if ingest_result["mode"] == "LIVE":
                            source_rec.connection_status = "HEALTHY"
                        elif ingest_result["mode"] == "DEMO":
                            source_rec.connection_status = "DEMO"
                        else:
                            source_rec.connection_status = "HEALTHY"
                    else:
                        source_rec.consecutive_failures = (source_rec.consecutive_failures or 0) + 1
                        if source_rec.consecutive_failures >= 3:
                            source_rec.connection_status = "UNAVAILABLE"
                        else:
                            source_rec.connection_status = "DEGRADED"

                db.commit()
                results.append({
                    "run_id": run_id,
                    "source_id": sid,
                    "provider": adapter.provider_name,
                    "mode": ingest_result["mode"],
                    "status": ingest_result["status"],
                    "connection_status": source_rec.connection_status if source_rec else "UNKNOWN",
                    "events_ingested": len(ingest_result["events"]),
                    "events_validated": validated_count,
                    "duplicates_filtered": duplicates_count,
                    "rejected_count": rejected_count,
                    "error": ingest_result["error"],
                })

            return results
        finally:
            _INGESTION_LOCK.release()

    @classmethod
    def validate_event_payload(cls, event: NormalizedExternalEvent) -> Tuple[bool, List[str]]:
        """
        Validates event schema, timeliness, geographic bounds, and severity range.
        Treats all external input as untrusted.
        """
        reasons = []

        if not event.title or len(event.title.strip()) < 5:
            reasons.append("Title must be at least 5 characters.")
        if not event.description or len(event.description.strip()) < 10:
            reasons.append("Description must be at least 10 characters.")
        if event.severity not in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
            reasons.append(f"Invalid severity level: {event.severity}")

        if event.latitude is not None:
            if not (-90.0 <= event.latitude <= 90.0):
                reasons.append(f"Latitude out of bounds: {event.latitude}")
        if event.longitude is not None:
            if not (-180.0 <= event.longitude <= 180.0):
                reasons.append(f"Longitude out of bounds: {event.longitude}")

        now = datetime.datetime.utcnow()
        if event.event_timestamp > now + datetime.timedelta(minutes=15):
            reasons.append("Event timestamp is in the future (>15m).")
        if event.event_timestamp < now - datetime.timedelta(days=30):
            reasons.append("Event is stale (>30 days old).")

        return (len(reasons) == 0, reasons)

    @classmethod
    def detect_exact_or_approximate_duplicate(
        cls, db: Session, event: NormalizedExternalEvent
    ) -> Optional[Tuple[ExternalDisruptionEvent, str]]:
        """
        Two-stage deduplication:
        1. Exact match on (source_id, external_event_id).
        2. Explainable approximate match on (category, geographic proximity / corridor, 48h time window, title similarity).
        """
        # 1. Exact deduplication check
        exact = db.query(ExternalDisruptionEvent).filter_by(
            source_id=event.source_id, external_event_id=event.external_event_id
        ).first()
        if exact:
            return exact, "EXACT_SOURCE_AND_EVENT_ID_MATCH"

        # 2. Approximate deduplication window (events within 48h of each other)
        time_lower = event.event_timestamp - datetime.timedelta(hours=48)
        time_upper = event.event_timestamp + datetime.timedelta(hours=48)

        candidates = (
            db.query(ExternalDisruptionEvent)
            .filter(
                ExternalDisruptionEvent.category == event.category,
                ExternalDisruptionEvent.event_timestamp >= time_lower,
                ExternalDisruptionEvent.event_timestamp <= time_upper,
            )
            .all()
        )

        evt_words = set(re.findall(r"\b[a-zA-Z]{3,}\b", event.title.lower()))

        for c in candidates:
            c_words = set(re.findall(r"\b[a-zA-Z]{3,}\b", c.title.lower()))
            overlap = 0.0
            if evt_words and c_words:
                overlap = len(evt_words.intersection(c_words)) / float(max(len(evt_words), len(c_words)))

            # Check geographic proximity AND text similarity
            if (
                event.latitude is not None
                and event.longitude is not None
                and c.latitude is not None
                and c.longitude is not None
            ):
                dist = haversine_distance_km(event.latitude, event.longitude, c.latitude, c.longitude)
                if dist <= 50.0 and overlap >= 0.40:
                    return c, f"PROXIMITY_{dist}KM_SIMILARITY_{int(overlap*100)}%"

            # Check affected corridor match AND text similarity
            if event.affected_corridor and c.affected_corridor:
                if event.affected_corridor.strip().lower() == c.affected_corridor.strip().lower():
                    if overlap >= 0.50:
                        return c, f"CORRIDOR_MATCH_SIMILARITY_{int(overlap*100)}%"

        return None

    @classmethod
    def calculate_trust_score(
        cls, db: Session, event: NormalizedExternalEvent, is_duplicate: bool
    ) -> float:
        """
        Computes explainable provenance trust score:
        - Source reliability (40%)
        - Completeness of geospatial and corridor metadata (30%)
        - Timeliness / freshness (20%)
        - Independent source corroboration (10%)
        Prevents duplicate reports from artificially inflating confidence.
        """
        # 1. Source weight (separated from event severity)
        score = event.source_reliability_score * 0.40

        # 2. Metadata completeness
        has_geo = 1.0 if (event.latitude is not None and event.longitude is not None) else 0.0
        has_corridor = 1.0 if event.affected_corridor else 0.0
        completeness = (has_geo * 0.6) + (has_corridor * 0.4)
        score += completeness * 0.30

        # 3. Freshness (within 24h = 100%, decays linearly to 7 days)
        age_hours = max(0.0, (datetime.datetime.utcnow() - event.event_timestamp).total_seconds() / 3600.0)
        if age_hours <= 24.0:
            freshness = 1.0
        else:
            freshness = max(0.0, 1.0 - ((age_hours - 24.0) / 144.0))
        score += freshness * 0.20

        # 4. Independent corroboration (Only check DISTINCT external sources, NOT duplicate re-ingestion)
        has_corroboration = False
        if not is_duplicate:
            independent_sources = (
                db.query(ExternalDisruptionEvent.source_id)
                .filter(
                    ExternalDisruptionEvent.source_id != event.source_id,
                    ExternalDisruptionEvent.category == event.category,
                    ExternalDisruptionEvent.validation_status.in_(["VALIDATED", "CONFIRMED_AS_DISRUPTION"]),
                    ExternalDisruptionEvent.event_timestamp >= event.event_timestamp - datetime.timedelta(hours=48),
                    ExternalDisruptionEvent.event_timestamp <= event.event_timestamp + datetime.timedelta(hours=48),
                )
                .distinct()
                .count()
            )
            has_corroboration = independent_sources > 0

        score += (0.10 if has_corroboration else 0.04)

        return round(min(1.0, max(0.1, score)), 2)

    @classmethod
    def process_incoming_event(
        cls, db: Session, event: NormalizedExternalEvent, organization_id: str
    ) -> Tuple[ExternalDisruptionEvent, bool]:
        """
        Validates, deduplicates, stores external event with canonicalized RFC 8785 evidence,
        and triggers supply-chain correlations.
        """
        is_valid, validation_errors = cls.validate_event_payload(event)
        dup_match = cls.detect_exact_or_approximate_duplicate(db, event)

        is_duplicate = dup_match is not None
        validation_status = "VALIDATED" if is_valid else "REJECTED"
        duplicate_of = None

        if is_duplicate:
            validation_status = "DUPLICATE"
            duplicate_of = dup_match[0].event_id

        trust_score = cls.calculate_trust_score(db, event, is_duplicate)
        event_id = f"EVT-{datetime.datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

        db_event = ExternalDisruptionEvent(
            event_id=event_id,
            external_event_id=event.external_event_id,
            source_id=event.source_id,
            source_type=event.source_type,
            mode=event.mode,
            title=sanitize_untrusted_text(event.title, 255),
            description=sanitize_untrusted_text(event.description, 2000),
            category=event.category,
            severity=event.severity,
            geographic_region=sanitize_untrusted_text(event.geographic_region, 160),
            latitude=event.latitude,
            longitude=event.longitude,
            affected_corridor=sanitize_untrusted_text(event.affected_corridor, 160) if event.affected_corridor else None,
            event_timestamp=event.event_timestamp,
            ingestion_timestamp=datetime.datetime.utcnow(),
            source_url=event.source_url,
            source_reliability_score=event.source_reliability_score,
            confidence_score=trust_score,
            validation_status=validation_status,
            duplicate_of_event_id=duplicate_of,
            raw_payload_preview=event.raw_payload_preview,
        )
        db.add(db_event)
        db.flush()

        # Add evidence items with canonical RFC 8785 JSON representation
        for ev in event.evidence_items:
            summary_clean = sanitize_untrusted_text(ev.get("summary", ""), 1000)
            captured_at_dt = datetime.datetime.utcnow()

            evidence_dict = {
                "event_id": event_id,
                "evidence_type": ev.get("type", "NOTICE"),
                "summary": summary_clean,
                "source_id": event.source_id,
                "source_event_timestamp": event.event_timestamp.isoformat(),
                "captured_at": captured_at_dt.isoformat(),
            }
            canonical_json = canonicalize_evidence_dict(evidence_dict)
            evidence_hash = hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

            evidence_rec = EventEvidence(
                event_id=event_id,
                evidence_type=ev.get("type", "NOTICE"),
                summary=summary_clean,
                hash_sha256=evidence_hash,
                canonical_payload_json=canonical_json,
                source_id=event.source_id,
                source_event_timestamp=event.event_timestamp,
                ingestion_timestamp=captured_at_dt,
                integrity_status="VERIFIED",
                captured_at=captured_at_dt,
            )
            db.add(evidence_rec)

        db.flush()
        if event.evidence_items:
            cls.seal_evidence_manifest(db, event_id, organization_id)

        # Correlate event against organization supply-chain network
        if validation_status in ["VALIDATED", "PENDING_REVIEW"]:
            cls.correlate_event_with_supply_chain(db, db_event, organization_id)

        db.commit()
        return db_event, is_duplicate

    @classmethod
    def seal_evidence_manifest(
        cls, db: Session, event_id: str, organization_id: str = "ORG-APEX-GLOBAL"
    ) -> Optional[EventEvidenceManifest]:
        """
        Creates or updates an authoritative RFC 8785 canonical evidence manifest commitment.
        Binds all associated evidence items into a deterministic Merkle/Manifest root hash,
        enabling non-repudiation, modification detection, and deletion detection.
        """
        event = db.query(ExternalDisruptionEvent).filter_by(event_id=event_id).first()
        if not event:
            return None

        evidences = db.query(EventEvidence).filter_by(event_id=event_id).all()
        if not evidences:
            return None

        sorted_evidences = sorted(evidences, key=lambda x: x.hash_sha256 or "")
        evidence_items = [
            {
                "evidence_type": ev.evidence_type,
                "hash_sha256": ev.hash_sha256,
                "source_id": ev.source_id or "UNKNOWN",
            }
            for ev in sorted_evidences
        ]

        manifest_obj = {
            "event_id": event.event_id,
            "evidence_count": len(evidence_items),
            "evidence_items": evidence_items,
            "organization_id": organization_id,
            "schema_version": "trustchain-evidence-manifest-v1",
        }

        canonical_manifest_bytes = jcs.canonicalize(manifest_obj)
        canonical_manifest_json = canonical_manifest_bytes.decode("utf-8")
        manifest_root_hash = hashlib.sha256(canonical_manifest_bytes).hexdigest()

        manifest = db.query(EventEvidenceManifest).filter_by(event_id=event_id).first()
        now = datetime.datetime.utcnow()
        if not manifest:
            manifest = EventEvidenceManifest(
                manifest_id=f"MAN-{event.event_id}",
                event_id=event.event_id,
                organization_id=organization_id,
                schema_version="trustchain-evidence-manifest-v1",
                evidence_count=len(evidence_items),
                manifest_canonical_json=canonical_manifest_json,
                manifest_root_hash=manifest_root_hash,
                status="SEALED",
                sealed_at=now,
                created_at=now,
            )
            db.add(manifest)
        else:
            manifest.organization_id = organization_id
            manifest.evidence_count = len(evidence_items)
            manifest.manifest_canonical_json = canonical_manifest_json
            manifest.manifest_root_hash = manifest_root_hash
            manifest.status = "SEALED"
            manifest.sealed_at = now

        event.manifest_id = manifest.manifest_id
        event.manifest_root_hash = manifest_root_hash
        db.flush()
        return manifest

    @classmethod
    def verify_evidence_integrity(cls, db: Session, evidence_id: int) -> Dict[str, Any]:
        """
        Inspects an EventEvidence record to verify cryptographic integrity against tampering or silent modification.
        Recomputes SHA-256 hash from canonical payload and checks current summary.
        """
        evidence = db.query(EventEvidence).filter_by(id=evidence_id).first()
        if not evidence:
            return {"is_valid": False, "status": "EVIDENCE_MISSING", "error": f"Evidence id {evidence_id} not found."}

        if not evidence.canonical_payload_json or not evidence.hash_sha256:
            evidence.integrity_status = "CORRUPTED"
            db.commit()
            return {"is_valid": False, "status": "INSUFFICIENT_INTEGRITY_PROOF", "error": "Evidence lacks canonical payload or hash."}

        # Verify hash of canonical json
        computed_hash = hashlib.sha256(evidence.canonical_payload_json.encode("utf-8")).hexdigest()
        if computed_hash != evidence.hash_sha256:
            evidence.integrity_status = "TAMPERED"
            db.commit()
            return {
                "is_valid": False,
                "status": "CONTENT_TAMPERED",
                "evidence_id": evidence.id,
                "error": "Evidence SHA-256 digest mismatch. Stored record does not match canonical payload.",
                "expected_hash": evidence.hash_sha256,
                "computed_hash": computed_hash,
            }

        # Verify current summary and properties match payload
        try:
            payload = json.loads(evidence.canonical_payload_json)
            associated_event_id = payload.get("event_id")

            # Verify that canonical payload matches strict RFC 8785 formatting
            re_canonical_bytes = jcs.canonicalize(payload)
            if re_canonical_bytes.decode("utf-8") != evidence.canonical_payload_json:
                evidence.integrity_status = "TAMPERED"
                db.commit()
                return {
                    "is_valid": False,
                    "status": "CONTENT_TAMPERED",
                    "evidence_id": evidence.id,
                    "error": "Evidence payload violates RFC 8785 JSON canonicalization rules.",
                    "associated_event_id": associated_event_id,
                }

            if payload.get("summary") != evidence.summary:
                evidence.integrity_status = "TAMPERED"
                db.commit()
                return {
                    "is_valid": False,
                    "status": "CONTENT_TAMPERED",
                    "evidence_id": evidence.id,
                    "error": "Evidence summary has been modified from original canonical payload.",
                    "associated_event_id": associated_event_id,
                }
            if payload.get("evidence_type") != evidence.evidence_type:
                evidence.integrity_status = "TAMPERED"
                db.commit()
                return {
                    "is_valid": False,
                    "status": "CONTENT_TAMPERED",
                    "evidence_id": evidence.id,
                    "error": "Evidence type has been modified from original canonical payload.",
                    "associated_event_id": associated_event_id,
                }
        except Exception as e:
            evidence.integrity_status = "CORRUPTED"
            db.commit()
            return {"is_valid": False, "status": "CONTENT_TAMPERED", "evidence_id": evidence.id, "error": str(e)}

        evidence.integrity_status = "VERIFIED"
        db.commit()
        return {
            "is_valid": True,
            "status": "VALID",
            "evidence_id": evidence.id,
            "hash_sha256": evidence.hash_sha256,
            "associated_event_id": associated_event_id,
            "verified_at": datetime.datetime.utcnow().isoformat(),
        }

    @classmethod
    def verify_event_integrity(cls, db: Session, event_id: str, organization_id: str) -> Dict[str, Any]:
        """
        Verifies cryptographic integrity of an ExternalDisruptionEvent and all associated evidence records.
        Evaluates against the sealed RFC 8785 Evidence Manifest commitment to detect:
        - VALID
        - CONTENT_TAMPERED
        - EVIDENCE_MISSING
        - ASSOCIATION_MISMATCH
        - MANIFEST_MISMATCH
        - INSUFFICIENT_INTEGRITY_PROOF
        """
        event = db.query(ExternalDisruptionEvent).filter_by(event_id=event_id).first()
        if not event:
            return {
                "is_valid": False,
                "status": "EVENT_NOT_FOUND",
                "event_id": event_id,
                "evidence_count": 0,
                "proves": "Nothing. Target event ID does not exist in operational database.",
                "cannot_prove": "Cannot verify non-existent event.",
                "details": f"External disruption event '{event_id}' was not found in database.",
            }

        manifest = db.query(EventEvidenceManifest).filter_by(event_id=event_id).first()
        evidences = db.query(EventEvidence).filter_by(event_id=event_id).all()

        # 1. Check INSUFFICIENT_INTEGRITY_PROOF
        if not manifest:
            return {
                "is_valid": False,
                "status": "INSUFFICIENT_INTEGRITY_PROOF",
                "event_id": event_id,
                "evidence_count": len(evidences),
                "expected_evidence_count": 0,
                "manifest_id": None,
                "manifest_root_hash": None,
                "proves": "The event record exists in the database but lacks a sealed cryptographic manifest commitment.",
                "cannot_prove": "Cannot prove authenticity, absence of deletions, or completeness without a manifest.",
                "details": "No evidence manifest commitment has been sealed for this event.",
                "evidence_results": [],
            }

        if manifest.evidence_count == 0 and len(evidences) == 0:
            return {
                "is_valid": False,
                "status": "INSUFFICIENT_INTEGRITY_PROOF",
                "event_id": event_id,
                "evidence_count": 0,
                "expected_evidence_count": 0,
                "manifest_id": manifest.manifest_id,
                "manifest_root_hash": manifest.manifest_root_hash,
                "proves": "Event has an empty evidence manifest.",
                "cannot_prove": "Cannot prove occurrence of disruption without evidentiary backing.",
                "details": "Event has zero evidence records attached.",
                "evidence_results": [],
            }

        # Check Organization Isolation
        if manifest.organization_id and organization_id:
            if manifest.organization_id != "GLOBAL" and organization_id != "GLOBAL" and manifest.organization_id != organization_id:
                return {
                    "is_valid": False,
                    "status": "ASSOCIATION_MISMATCH",
                    "event_id": event_id,
                    "evidence_count": len(evidences),
                    "expected_evidence_count": manifest.evidence_count,
                    "manifest_id": manifest.manifest_id,
                    "manifest_root_hash": manifest.manifest_root_hash,
                    "proves": f"Tenant boundary violation: Manifest is sealed under organization '{manifest.organization_id}' but access was requested by '{organization_id}'.",
                    "cannot_prove": "Cannot verify evidence across unauthorized organization boundary.",
                    "details": f"Organization isolation mismatch: '{manifest.organization_id}' != '{organization_id}'.",
                    "evidence_results": [],
                }

        # 2. Check MANIFEST_MISMATCH (Root hash synchronization & payload tamper detection)
        if event.manifest_root_hash != manifest.manifest_root_hash:
            return {
                "is_valid": False,
                "status": "MANIFEST_MISMATCH",
                "event_id": event_id,
                "evidence_count": len(evidences),
                "expected_evidence_count": manifest.evidence_count,
                "manifest_id": manifest.manifest_id,
                "manifest_root_hash": manifest.manifest_root_hash,
                "proves": "The manifest commitment on the event record has been altered or desynchronized from the sealed manifest record.",
                "cannot_prove": "Cannot determine which record was modified first.",
                "details": f"Event manifest root hash '{event.manifest_root_hash}' does not match manifest commitment '{manifest.manifest_root_hash}'.",
                "evidence_results": [],
            }

        try:
            manifest_payload = json.loads(manifest.manifest_canonical_json)
            recomputed_manifest_bytes = jcs.canonicalize(manifest_payload)
            recomputed_manifest_hash = hashlib.sha256(recomputed_manifest_bytes).hexdigest()
            if recomputed_manifest_hash != manifest.manifest_root_hash:
                return {
                    "is_valid": False,
                    "status": "MANIFEST_MISMATCH",
                    "event_id": event_id,
                    "evidence_count": len(evidences),
                    "expected_evidence_count": manifest.evidence_count,
                    "manifest_id": manifest.manifest_id,
                    "manifest_root_hash": manifest.manifest_root_hash,
                    "proves": "The manifest JSON payload itself has been tampered with or corrupted after sealing.",
                    "cannot_prove": "Cannot reconstruct original manifest contents without backup.",
                    "details": f"Manifest payload hash mismatch: recomputed '{recomputed_manifest_hash}' != stored '{manifest.manifest_root_hash}'.",
                    "evidence_results": [],
                }
        except Exception as e:
            return {
                "is_valid": False,
                "status": "MANIFEST_MISMATCH",
                "event_id": event_id,
                "details": f"Failed to parse or re-canonicalize manifest JSON: {str(e)}",
                "evidence_results": [],
            }

        # Check for uncommitted evidence inserted after manifest creation
        if len(evidences) > manifest.evidence_count:
            return {
                "is_valid": False,
                "status": "MANIFEST_MISMATCH",
                "event_id": event_id,
                "evidence_count": len(evidences),
                "expected_evidence_count": manifest.evidence_count,
                "manifest_id": manifest.manifest_id,
                "manifest_root_hash": manifest.manifest_root_hash,
                "proves": f"Uncommitted evidence detected: {len(evidences)} records found in database, but manifest committed to only {manifest.evidence_count}.",
                "cannot_prove": "Cannot determine provenance of uncommitted extraneous evidence.",
                "details": "Extraneous evidence rows were inserted after the evidence manifest was sealed.",
                "evidence_results": [],
            }

        # 3. Check for EVIDENCE_MISSING (Deletion detection)
        if len(evidences) < manifest.evidence_count:
            return {
                "is_valid": False,
                "status": "EVIDENCE_MISSING",
                "event_id": event_id,
                "evidence_count": len(evidences),
                "expected_evidence_count": manifest.evidence_count,
                "manifest_id": manifest.manifest_id,
                "manifest_root_hash": manifest.manifest_root_hash,
                "proves": f"Evidence deletion detected: Manifest commits to {manifest.evidence_count} evidence records, but only {len(evidences)} exist in database.",
                "cannot_prove": "Cannot recover or reconstruct content of deleted records from hash commitment alone.",
                "details": f"Missing {manifest.evidence_count - len(evidences)} committed evidence record(s).",
                "evidence_results": [],
            }

        committed_items = manifest_payload.get("evidence_items", [])
        committed_hashes = {item["hash_sha256"] for item in committed_items if "hash_sha256" in item}
        current_hashes = {ev.hash_sha256 for ev in evidences if ev.hash_sha256}

        missing_hashes = committed_hashes - current_hashes
        if missing_hashes:
            return {
                "is_valid": False,
                "status": "EVIDENCE_MISSING",
                "event_id": event_id,
                "evidence_count": len(evidences),
                "expected_evidence_count": manifest.evidence_count,
                "manifest_id": manifest.manifest_id,
                "manifest_root_hash": manifest.manifest_root_hash,
                "proves": f"Committed evidence hash(es) missing from database: {list(missing_hashes)}.",
                "cannot_prove": "Cannot restore deleted payload data without backup.",
                "details": f"{len(missing_hashes)} committed evidence item(s) are missing from database.",
                "evidence_results": [],
            }

        uncommitted_hashes = current_hashes - committed_hashes
        if uncommitted_hashes:
            return {
                "is_valid": False,
                "status": "MANIFEST_MISMATCH",
                "event_id": event_id,
                "evidence_count": len(evidences),
                "expected_evidence_count": manifest.evidence_count,
                "manifest_id": manifest.manifest_id,
                "manifest_root_hash": manifest.manifest_root_hash,
                "proves": f"Uncommitted evidence hash(es) attached to event: {list(uncommitted_hashes)}.",
                "cannot_prove": "Cannot determine source of unauthorized evidence.",
                "details": "Database contains evidence records not committed in the sealed manifest.",
                "evidence_results": [],
            }

        # 4. Check Individual Evidence Items: CONTENT_TAMPERED & ASSOCIATION_MISMATCH
        evidence_results = []
        for ev in evidences:
            ev_res = cls.verify_evidence_integrity(db, ev.id)
            evidence_results.append(ev_res)

            # Check association inside canonical payload
            if ev_res.get("associated_event_id") and ev_res["associated_event_id"] != event.event_id:
                return {
                    "is_valid": False,
                    "status": "ASSOCIATION_MISMATCH",
                    "event_id": event_id,
                    "evidence_count": len(evidences),
                    "expected_evidence_count": manifest.evidence_count,
                    "manifest_id": manifest.manifest_id,
                    "manifest_root_hash": manifest.manifest_root_hash,
                    "proves": f"Cross-event association fraud: Evidence id {ev.id} canonical payload commits to '{ev_res['associated_event_id']}' but was assigned to '{event.event_id}'.",
                    "cannot_prove": "Cannot determine motive for re-parenting evidence row.",
                    "details": f"Evidence id {ev.id} belongs to '{ev_res['associated_event_id']}', not '{event.event_id}'.",
                    "evidence_results": evidence_results,
                }

            if not ev_res["is_valid"]:
                return {
                    "is_valid": False,
                    "status": "CONTENT_TAMPERED",
                    "event_id": event_id,
                    "evidence_count": len(evidences),
                    "expected_evidence_count": manifest.evidence_count,
                    "manifest_id": manifest.manifest_id,
                    "manifest_root_hash": manifest.manifest_root_hash,
                    "proves": f"Cryptographic integrity violation: Evidence id {ev.id} content was modified after canonicalization and hash generation.",
                    "cannot_prove": "Cannot prove whether modification was accidental or adversarial without external audit logs.",
                    "details": ev_res.get("error", "Evidence SHA-256 digest mismatch."),
                    "evidence_results": evidence_results,
                }

        # 5. ALL CHECKS PASSED -> VALID
        return {
            "is_valid": True,
            "status": "VALID",
            "event_id": event_id,
            "evidence_count": len(evidences),
            "expected_evidence_count": manifest.evidence_count,
            "manifest_id": manifest.manifest_id,
            "manifest_root_hash": manifest.manifest_root_hash,
            "proves": "Complete evidence integrity verified: All evidence payloads match their RFC 8785 canonical SHA-256 digests, parent event associations are verified, and the set exactly matches the sealed manifest commitment.",
            "cannot_prove": "Does not prove physical reality of the external real-world event; proves only that ingested data has not been modified, deleted, or reassigned since manifest sealing.",
            "details": f"All {len(evidences)} evidence record(s) verified against manifest root commitment {manifest.manifest_root_hash[:16]}...",
            "evidence_results": evidence_results,
        }

    @classmethod
    def correlate_event_with_supply_chain(
        cls, db: Session, event: ExternalDisruptionEvent, organization_id: str
    ) -> List[EventCorrelation]:
        """
        Disruption Intelligence Correlation:
        Examines active Shipments, Suppliers, Warehouses, and Customer Orders to determine
        explainable operational relevance without false positives.
        """
        correlations = []

        # 1. Correlate with active Shipments along maritime / air corridors
        active_shipments = (
            db.query(Shipment)
            .filter(
                Shipment.organization_id == organization_id,
                Shipment.status.in_(["IN_TRANSIT", "DELAYED"]),
            )
            .all()
        )

        for s in active_shipments:
            matched = False
            reason = []
            score = 0.0

            # Direct corridor matching
            if event.affected_corridor:
                corridor_terms = event.affected_corridor.lower().split()
                if "suez" in corridor_terms and "suez" in s.current_location.lower():
                    matched = True
                    reason.append(f"Shipment {s.tracking_number} located in affected Suez anchorage.")
                    score = max(score, 0.95)
                elif "asia-europe" in event.affected_corridor.lower() and (
                    "rotterdam" in s.destination.lower() or "kaohsiung" in s.origin.lower()
                ):
                    matched = True
                    reason.append(f"Shipment route ({s.origin} -> {s.destination}) traverses {event.affected_corridor}.")
                    score = max(score, 0.85)

            # Geographic proximity to shipment current location or ports
            if event.latitude is not None and event.longitude is not None:
                # Kaohsiung port (approx 22.61, 120.28)
                if "kaohsiung" in s.origin.lower():
                    dist = haversine_distance_km(event.latitude, event.longitude, 22.61, 120.28)
                    if dist <= 300.0:
                        matched = True
                        reason.append(f"Event epicenter is {dist}km from origin port {s.origin}.")
                        score = max(score, 0.90)

                # Rotterdam port (approx 51.95, 4.05)
                if "rotterdam" in s.destination.lower():
                    dist = haversine_distance_km(event.latitude, event.longitude, 51.95, 4.05)
                    if dist <= 300.0:
                        matched = True
                        reason.append(f"Event epicenter is {dist}km from destination port {s.destination}.")
                        score = max(score, 0.90)

            if matched:
                corr = EventCorrelation(
                    event_id=event.event_id,
                    organization_id=organization_id,
                    entity_type="SHIPMENT",
                    entity_id=str(s.id),
                    match_criteria="CORRIDOR_AND_PORT_PROXIMITY",
                    relevance_score=score,
                    reason_for_match="; ".join(reason),
                )
                db.add(corr)
                correlations.append(corr)

        # 2. Correlate with Suppliers located in affected regions
        suppliers = db.query(Supplier).filter(Supplier.organization_id == organization_id).all()
        for sup in suppliers:
            if sup.country.lower() in event.geographic_region.lower() or sup.city.lower() in event.geographic_region.lower():
                corr = EventCorrelation(
                    event_id=event.event_id,
                    organization_id=organization_id,
                    entity_type="SUPPLIER",
                    entity_id=str(sup.id),
                    match_criteria="SUPPLIER_LOCATION",
                    relevance_score=0.80,
                    reason_for_match=f"Supplier {sup.name} operates in affected territory ({sup.city}, {sup.country}).",
                )
                db.add(corr)
                correlations.append(corr)

        # 3. Correlate with Warehouses in affected areas
        warehouses = db.query(Warehouse).all()
        for wh in warehouses:
            if wh.country.lower() in event.geographic_region.lower() or wh.warehouse_name.lower() in event.title.lower():
                corr = EventCorrelation(
                    event_id=event.event_id,
                    organization_id=organization_id,
                    entity_type="WAREHOUSE",
                    entity_id=str(wh.id),
                    match_criteria="WAREHOUSE_PROXIMITY",
                    relevance_score=0.85,
                    reason_for_match=f"Logistics facility {wh.warehouse_name} is located in {wh.location}.",
                )
                db.add(corr)
                correlations.append(corr)

        db.commit()
        return correlations

    @classmethod
    def confirm_event_as_disruption(
        cls,
        db: Session,
        event_id: str,
        user_id: str,
        organization_id: str,
        notes: str,
        reviewer_wallet: Optional[str] = None,
    ) -> Disruption:
        """
        Transitions a verified External Disruption Event into an Authoritative Operational Disruption.
        Enforces idempotency and human-in-the-loop review: duplicate confirmations return the existing
        incident rather than creating phantom disruptions.
        """
        event = db.query(ExternalDisruptionEvent).filter_by(event_id=event_id).first()
        if not event:
            raise ValueError(f"Event {event_id} not found.")

        # Guard: If already confirmed, return existing disruption (idempotent, prevents duplicate incidents)
        if event.validation_status == "CONFIRMED_AS_DISRUPTION" and event.linked_disruption_id:
            existing = db.query(Disruption).filter_by(id=event.linked_disruption_id, organization_id=organization_id).first()
            if existing:
                return existing

        # Guard: If previously rejected, reject without explicit override note
        if event.validation_status == "REJECTED":
            raise ValueError(f"Event {event_id} was previously REJECTED. Cannot confirm without explicit state reset.")

        # Create unique incident code
        year = datetime.datetime.utcnow().year
        random_suffix = uuid.uuid4().hex[:4].upper()
        incident_code = f"INC-{year}-{random_suffix}"

        # Severity delay heuristics
        delay_map = {"LOW": 12, "MEDIUM": 36, "HIGH": 72, "CRITICAL": 96}
        est_delay = delay_map.get(event.severity, 48)

        disruption = Disruption(
            organization_id=organization_id,
            incident_code=incident_code,
            category=event.category,
            severity=event.severity,
            geographic_region=event.geographic_region,
            description=f"[CONFIRMED FROM {event.source_id}] {event.title}: {event.description}",
            start_time=event.event_timestamp,
            estimated_delay_hours=est_delay,
            financial_exposure=0.0,
            status="ACTIVE",
            detection_source=f"EXTERNAL_INTEL_{event.source_type}",
            confidence_score=event.confidence_score,
            is_simulated=False if event.mode == "LIVE" else True,
        )
        db.add(disruption)
        db.flush()

        # Link correlated shipments to new Disruption
        corrs = db.query(EventCorrelation).filter_by(
            event_id=event_id, entity_type="SHIPMENT", organization_id=organization_id
        ).all()
        for c in corrs:
            shipment_id = int(c.entity_id)
            ds = DisruptionShipment(
                disruption_id=disruption.id,
                shipment_id=shipment_id,
                impact_summary=c.reason_for_match,
            )
            db.add(ds)

        # Update event status
        event.validation_status = "CONFIRMED_AS_DISRUPTION"
        event.linked_disruption_id = disruption.id

        # Record review audit trail
        review = EventReview(
            event_id=event_id,
            organization_id=organization_id,
            reviewer_user_id=user_id,
            reviewer_wallet=reviewer_wallet,
            action_taken="CONFIRM_AS_DISRUPTION",
            notes=sanitize_untrusted_text(notes, 1000),
            created_incident_code=incident_code,
        )
        db.add(review)
        db.commit()
        db.refresh(disruption)
        return disruption

    @classmethod
    def reject_event(
        cls,
        db: Session,
        event_id: str,
        user_id: str,
        organization_id: str,
        notes: str,
        reviewer_wallet: Optional[str] = None,
    ) -> ExternalDisruptionEvent:
        """Marks event as false positive / rejected with explainable audit log."""
        event = db.query(ExternalDisruptionEvent).filter_by(event_id=event_id).first()
        if not event:
            raise ValueError(f"Event {event_id} not found.")

        if event.validation_status == "CONFIRMED_AS_DISRUPTION":
            raise ValueError(f"Event {event_id} is already CONFIRMED_AS_DISRUPTION. Cannot reject active incident.")

        event.validation_status = "REJECTED"
        review = EventReview(
            event_id=event_id,
            organization_id=organization_id,
            reviewer_user_id=user_id,
            reviewer_wallet=reviewer_wallet,
            action_taken="REJECT_FALSE_ALARM",
            notes=sanitize_untrusted_text(notes, 1000),
        )
        db.add(review)
        db.commit()
        db.refresh(event)
        return event

    @classmethod
    def merge_or_link_event(
        cls,
        db: Session,
        event_id: str,
        target_disruption_id: int,
        user_id: str,
        organization_id: str,
        notes: str,
    ) -> ExternalDisruptionEvent:
        """Links an incoming external event directly to an already active operational disruption."""
        event = db.query(ExternalDisruptionEvent).filter_by(event_id=event_id).first()
        disruption = db.query(Disruption).filter_by(id=target_disruption_id, organization_id=organization_id).first()

        if not event or not disruption:
            raise ValueError("Event or target disruption not found in your organization.")

        event.validation_status = "LINKED_TO_DISRUPTION"
        event.linked_disruption_id = disruption.id

        review = EventReview(
            event_id=event_id,
            organization_id=organization_id,
            reviewer_user_id=user_id,
            action_taken="LINK_EXISTING_DISRUPTION",
            notes=sanitize_untrusted_text(notes, 1000),
            created_incident_code=disruption.incident_code,
        )
        db.add(review)
        db.commit()
        db.refresh(event)
        return event

    @classmethod
    def resolve_evidence_manifest_for_disruption(
        cls,
        db: Session,
        disruption: Disruption,
        organization_id: str,
        explicit_event_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Establishes an authoritative, tenant-isolated cryptographic relationship between:
        Organization -> Disruption -> External Disruption Event -> Evidence Manifest -> Recovery Plan.
        
        Enforces:
        1. Tenant boundary verification at every association step.
        2. Authoritative retrieval of the sealed manifest root (never trusts client input).
        3. Deterministic event selection when multiple correlated events exist.
        4. Validation of manifest seal state and non-empty evidence items.
        5. Support for internal disruptions with zero external evidence via ZERO_MANIFEST_SENTINEL.
        """
        # 1. Verify tenant boundary
        if disruption.organization_id != organization_id and organization_id != "GLOBAL":
            raise ValueError(
                f"Tenant boundary mismatch: Disruption belongs to '{disruption.organization_id}' "
                f"but caller is '{organization_id}'."
            )

        # 2. Resolve external disruption event
        event = None
        if explicit_event_id:
            event = db.query(ExternalDisruptionEvent).filter_by(event_id=explicit_event_id).first()
            if not event:
                raise ValueError(f"Explicitly specified external event '{explicit_event_id}' not found.")
            if event.linked_disruption_id != disruption.id:
                raise ValueError(
                    f"External event '{explicit_event_id}' is not linked to disruption '{disruption.incident_code}'."
                )
        else:
            linked_events = (
                db.query(ExternalDisruptionEvent)
                .filter(
                    (ExternalDisruptionEvent.linked_disruption_id == disruption.id)
                    | (ExternalDisruptionEvent.linked_disruption_id == disruption.incident_code)
                )
                .order_by(desc(ExternalDisruptionEvent.event_timestamp), desc(ExternalDisruptionEvent.id))
                .all()
            )
            if not linked_events:
                corrs = (
                    db.query(EventCorrelation)
                    .filter(
                        EventCorrelation.entity_type == "DISRUPTION",
                        (EventCorrelation.entity_id == str(disruption.id))
                        | (EventCorrelation.entity_id == disruption.incident_code),
                    )
                    .all()
                )
                if corrs:
                    corr_event_ids = [c.event_id for c in corrs]
                    linked_events = (
                        db.query(ExternalDisruptionEvent)
                        .filter(ExternalDisruptionEvent.event_id.in_(corr_event_ids))
                        .order_by(desc(ExternalDisruptionEvent.event_timestamp), desc(ExternalDisruptionEvent.id))
                        .all()
                    )
            if len(linked_events) == 1:
                event = linked_events[0]
            elif len(linked_events) > 1:
                # Deterministic selection: find the confirmed event that created this incident
                confirmed = next((e for e in linked_events if e.validation_status == "CONFIRMED_AS_DISRUPTION"), None)
                if confirmed:
                    event = confirmed
                else:
                    # Deterministically take the most authoritative recent event
                    event = linked_events[0]

        # 3. Case A: Internal disruption (no external intelligence event)
        if event is None:
            return {
                "has_external_evidence": False,
                "is_internal": True,
                "event_id": None,
                "manifest_id": None,
                "manifest_root_hash": ZERO_MANIFEST_SENTINEL,
                "evidence_count": 0,
                "integrity_status": "VALID_INTERNAL_NO_EXTERNAL_EVIDENCE",
                "details": f"Disruption {disruption.incident_code} is an internal operational disruption with no external intelligence manifest requirement.",
            }

        # 4. Case B: External disruption event linked - verify manifest
        manifest = db.query(EventEvidenceManifest).filter_by(event_id=event.event_id).first()
        if not manifest:
            raise ValueError(
                f"External event '{event.event_id}' linked to disruption '{disruption.incident_code}' lacks a sealed evidence manifest."
            )

        # Tenant boundary check on manifest
        if manifest.organization_id != "GLOBAL" and manifest.organization_id != organization_id:
            raise ValueError(
                f"Tenant boundary violation: Manifest organization '{manifest.organization_id}' "
                f"does not match plan organization '{organization_id}'."
            )

        # Seal status check
        if manifest.status != "SEALED":
            raise ValueError(
                f"Evidence manifest '{manifest.manifest_id}' is not in SEALED status (current: {manifest.status})."
            )

        # Non-empty evidence check
        if manifest.evidence_count <= 0:
            raise ValueError(
                f"Evidence manifest '{manifest.manifest_id}' contains zero evidence records (insufficient proof)."
            )

        # Comprehensive integrity verification
        integrity = cls.verify_event_integrity(db, event.event_id, organization_id)
        if not integrity.get("is_valid", False):
            raise ValueError(
                f"Evidence manifest failed integrity check: {integrity.get('status')} - {integrity.get('details')}"
            )

        manifest_root = manifest.manifest_root_hash.strip().lower()
        if not manifest_root.startswith("0x"):
            manifest_root = "0x" + manifest_root

        return {
            "has_external_evidence": True,
            "is_internal": False,
            "event_id": event.event_id,
            "manifest_id": manifest.manifest_id,
            "manifest_root_hash": manifest_root,
            "evidence_count": manifest.evidence_count,
            "integrity_status": "SEALED_AND_VERIFIED",
            "details": f"Evidence manifest {manifest.manifest_id} verified with {manifest.evidence_count} evidence record(s).",
        }

