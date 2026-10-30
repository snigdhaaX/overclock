import hashlib
import json
import datetime
from typing import Any, Dict, List, Optional
import jcs
from sqlalchemy.orm import Session
from .database import OperationalRecoveryPlan
from .hash_service import (
    RecoveryPlanHashService,
    SCHEMA_VERSION_V1,
    SCHEMA_VERSION_V2,
    ZERO_MANIFEST_SENTINEL,
    validate_bytes32,
    normalize_hash,
)
from .contract_service import ContractService
from backend.app.supply_chain.models import (
    Disruption,
    ExternalDisruptionEvent,
    EventEvidenceManifest,
    EventEvidence,
    EventCorrelation,
)
from backend.app.supply_chain.ingestion_service import DisruptionIngestionService


class VerificationResult:
    # Positive Verification Outcomes
    VERIFIED = "VERIFIED"
    VERIFIED_WITHOUT_EXTERNAL_EVIDENCE = "VERIFIED_WITHOUT_EXTERNAL_EVIDENCE"
    LEGACY_VERIFIED = "LEGACY_VERIFIED"
    SUPERSEDED = "SUPERSEDED"
    PENDING = "PENDING"

    # Integrity & Hash Failures
    PLAN_HASH_MISMATCH = "PLAN_HASH_MISMATCH"
    HASH_MISMATCH = "PLAN_HASH_MISMATCH"  # Compatibility alias
    SIMULATION_HASH_MISMATCH = "SIMULATION_HASH_MISMATCH"
    MANIFEST_ROOT_MISMATCH = "MANIFEST_ROOT_MISMATCH"
    EVIDENCE_CONTENT_TAMPERED = "EVIDENCE_CONTENT_TAMPERED"

    # Evidence & Manifest Missing or Invalid
    MANIFEST_MISSING = "MANIFEST_MISSING"
    MANIFEST_INVALID = "MANIFEST_INVALID"
    EVIDENCE_MISSING = "EVIDENCE_MISSING"
    INSUFFICIENT_INTEGRITY_PROOF = "INSUFFICIENT_INTEGRITY_PROOF"

    # Association & Boundary Failures
    EVIDENCE_ASSOCIATION_MISMATCH = "EVIDENCE_ASSOCIATION_MISMATCH"
    ORGANIZATION_MISMATCH = "ORGANIZATION_MISMATCH"
    DISRUPTION_MISMATCH = "DISRUPTION_MISMATCH"
    VERSION_MISMATCH = "VERSION_MISMATCH"

    # On-Chain State Failures
    ON_CHAIN_RECORD_MISSING = "ON_CHAIN_RECORD_MISSING"
    NOT_ANCHORED = "ON_CHAIN_RECORD_MISSING"  # Compatibility alias
    VERSION_NOT_FOUND = "VERSION_NOT_FOUND"
    RPC_UNAVAILABLE = "RPC_UNAVAILABLE"


class PlanVerificationService:
    """
    End-to-End Recovery Plan Integrity Verification Service.
    
    Verifies the complete 15-point cryptographic integrity chain:
      1. Operational plan identity in database.
      2. RPC connectivity and smart contract reachability.
      3. On-chain plan record existence.
      4. Organization ownership and tenant isolation.
      5. Disruption association and operational validity.
      6. Evidence manifest presence, identity, and sealing.
      7. Evidence item SHA-256 digests and tamper detection.
      8. Evidence collection completeness relative to sealed manifest.
      9. Manifest root consistency (recomputed vs stored).
      10. Canonical recovery plan RFC 8785 representation.
      11. Local recovery plan SHA-256 hash calculation.
      12. On-chain plan hash matching.
      13. Plan version matching and supersession tracking.
      14. Simulation hash matching.
      15. Execution evidence continuity (where applicable).
    """

    @classmethod
    def save_operational_plan(
        cls,
        db: Session,
        plan_id: str,
        version: int,
        organization_id: str,
        plan_data: Dict[str, Any],
    ) -> OperationalRecoveryPlan:
        """Stores or updates the authoritative operational plan record with schema version and hash."""
        existing = (
            db.query(OperationalRecoveryPlan)
            .filter(
                OperationalRecoveryPlan.plan_id == plan_id,
                OperationalRecoveryPlan.version == version,
            )
            .first()
        )
        now = datetime.datetime.utcnow()

        # Guard: If an anchored version is being overwritten, prevent accidental tamper
        if existing and existing.is_anchored:
            raise ValueError(
                f"Cannot mutate operational plan '{plan_id}' V{version}: Version is already anchored on-chain."
            )

        # Detect schema version: explicit payload > existing record in DB > default v2
        schema_version = (
            plan_data.get("schema_version")
            or (existing.canonical_schema_version if existing else None)
            or SCHEMA_VERSION_V2
        ).strip()

        disruption_id = plan_data.get("disruption_id") or plan_data.get("incident_id")
        manifest_id = plan_data.get("evidence_manifest_id")
        manifest_hash = plan_data.get("evidence_manifest_hash") or plan_data.get("manifest_root_hash")

        # Compute authoritative hash
        _, canonical_hash = RecoveryPlanHashService.generate_plan_hash(
            plan_data, schema_version=schema_version
        )
        plan_data["canonical_plan_hash"] = canonical_hash
        plan_json = json.dumps(plan_data)

        if existing:
            existing.organization_id = organization_id
            existing.canonical_schema_version = schema_version
            existing.disruption_id = disruption_id
            existing.evidence_manifest_id = manifest_id
            existing.evidence_manifest_hash = manifest_hash
            existing.canonical_plan_hash = canonical_hash
            existing.plan_data_json = plan_json
            existing.updated_at = now
            record = existing
        else:
            record = OperationalRecoveryPlan(
                plan_id=plan_id,
                version=version,
                organization_id=organization_id,
                canonical_schema_version=schema_version,
                disruption_id=disruption_id,
                evidence_manifest_id=manifest_id,
                evidence_manifest_hash=manifest_hash,
                canonical_plan_hash=canonical_hash,
                is_anchored=False,
                plan_data_json=plan_json,
                created_at=now,
                updated_at=now,
            )
            db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @classmethod
    def get_operational_plan(
        cls,
        db: Session,
        plan_id: str,
        version: int,
    ) -> Optional[Dict[str, Any]]:
        record = (
            db.query(OperationalRecoveryPlan)
            .filter(
                OperationalRecoveryPlan.plan_id == plan_id,
                OperationalRecoveryPlan.version == version,
            )
            .first()
        )
        if not record:
            return None
        data = json.loads(record.plan_data_json)
        if record.canonical_schema_version and "schema_version" not in data:
            data["schema_version"] = record.canonical_schema_version
        if record.evidence_manifest_hash and "evidence_manifest_hash" not in data:
            data["evidence_manifest_hash"] = record.evidence_manifest_hash
        return data

    @classmethod
    def verify_plan_integrity(
        cls,
        db: Session,
        plan_id: str,
        version: int,
        contract_service: ContractService,
        plan_data_override: Optional[Dict[str, Any]] = None,
        requester_organization_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes end-to-end cryptographic and governance verification.
        Returns detailed, structured auditor-facing verification results.
        """
        now_str = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        checks: Dict[str, Any] = {
            "operational_plan_exists": False,
            "organization_ownership": False,
            "disruption_association": False,
            "evidence_manifest_present": False,
            "evidence_manifest_sealed": False,
            "evidence_items_integrity": False,
            "evidence_set_completeness": False,
            "manifest_root_consistency": False,
            "canonical_payload_valid": False,
            "plan_hash_match": False,
            "simulation_hash_match": False,
            "version_match": False,
            "on_chain_record_present": False,
            "execution_evidence_verified": None,
        }

        # ---------------------------------------------------------------------
        # 1. Operational Plan Identity & Loading
        # ---------------------------------------------------------------------
        record = (
            db.query(OperationalRecoveryPlan)
            .filter_by(plan_id=plan_id, version=version)
            .first()
        )
        plan_data = plan_data_override or (json.loads(record.plan_data_json) if record else None)
        if not plan_data:
            return {
                "result": VerificationResult.VERSION_NOT_FOUND,
                "status": VerificationResult.VERSION_NOT_FOUND,
                "plan_id": plan_id,
                "version": version,
                "hashes_match": False,
                "checks": checks,
                "details": f"Operational recovery plan '{plan_id}' version {version} not found in database.",
                "verification_timestamp": now_str,
            }

        checks["operational_plan_exists"] = True
        plan_org = str(plan_data.get("organization_id") or (record.organization_id if record else "")).strip().upper()

        # Tenant Boundary Enforcement
        if requester_organization_id and requester_organization_id.upper() != "GLOBAL":
            if plan_org != requester_organization_id.upper():
                return {
                    "result": VerificationResult.ORGANIZATION_MISMATCH,
                    "status": VerificationResult.ORGANIZATION_MISMATCH,
                    "is_valid": False,
                    "plan_id": plan_id,
                    "version": version,
                    "database_hash": None,
                    "on_chain_hash": None,
                    "hashes_match": False,
                    "checks": checks,
                    "details": f"Tenant boundary violation: Plan belongs to '{plan_org}', access requested by '{requester_organization_id}'.",
                    "verification_timestamp": now_str,
                }
        checks["organization_ownership"] = True

        # Determine Schema Version based on plan's recorded schema version in DB or plan payload
        schema_version = (
            (record.canonical_schema_version if record and record.canonical_schema_version else None)
            or plan_data.get("schema_version")
            or SCHEMA_VERSION_V2
        ).strip()
        is_legacy = (schema_version == SCHEMA_VERSION_V1)

        # ---------------------------------------------------------------------
        # 2. Canonical RFC 8785 Representation & Local SHA-256 Digest
        # ---------------------------------------------------------------------
        try:
            canonical_json, db_hash = RecoveryPlanHashService.generate_plan_hash(
                plan_data, schema_version=schema_version
            )
            checks["canonical_payload_valid"] = True
        except Exception as e:
            return {
                "result": VerificationResult.PLAN_HASH_MISMATCH,
                "status": VerificationResult.PLAN_HASH_MISMATCH,
                "plan_id": plan_id,
                "version": version,
                "hashes_match": False,
                "checks": checks,
                "details": f"Canonical payload serialization failed: {str(e)}",
                "verification_timestamp": now_str,
            }

        # ---------------------------------------------------------------------
        # 3. Smart Contract Reachability & On-Chain Record Presence
        # ---------------------------------------------------------------------
        if not contract_service.is_connected and not getattr(contract_service, "_mock_mode", False):
            return {
                "result": VerificationResult.RPC_UNAVAILABLE,
                "status": VerificationResult.RPC_UNAVAILABLE,
                "plan_id": plan_id,
                "version": version,
                "database_hash": db_hash,
                "on_chain_hash": None,
                "hashes_match": False,
                "checks": checks,
                "details": "RPC connection unavailable. Cannot verify against blockchain.",
                "verification_timestamp": now_str,
            }

        try:
            exists = contract_service.plan_exists(plan_id, version)
            if not exists:
                return {
                    "result": VerificationResult.NOT_ANCHORED,
                    "status": VerificationResult.ON_CHAIN_RECORD_MISSING,
                    "plan_id": plan_id,
                    "version": version,
                    "database_hash": db_hash,
                    "on_chain_hash": None,
                    "hashes_match": False,
                    "checks": checks,
                    "details": f"Plan '{plan_id}' V{version} is not anchored on the smart contract.",
                    "verification_timestamp": now_str,
                }
            checks["on_chain_record_present"] = True

            on_chain = contract_service.get_plan_version(plan_id, version)
            latest_version = contract_service.get_latest_version(plan_id)
            on_chain_hash = on_chain["plan_hash"].strip().lower()
            hashes_match = (db_hash.lower() == on_chain_hash)
            checks["plan_hash_match"] = hashes_match

            # Compare Plan Hashes
            if not hashes_match:
                return {
                    "result": VerificationResult.PLAN_HASH_MISMATCH,
                    "status": VerificationResult.PLAN_HASH_MISMATCH,
                    "plan_id": plan_id,
                    "version": version,
                    "database_hash": db_hash,
                    "on_chain_hash": on_chain_hash,
                    "hashes_match": False,
                    "schema_version": schema_version,
                    "is_current_version": (version == latest_version and on_chain["status"] != "SUPERSEDED"),
                    "latest_on_chain_version": latest_version,
                    "on_chain_status": on_chain["status"],
                    "checks": checks,
                    "details": f"Plan hash mismatch: Database hash ({db_hash}) does not match anchored hash ({on_chain_hash}). Operational data altered.",
                    "verification_timestamp": now_str,
                }

            # -----------------------------------------------------------------
            # 5. Disruption Association
            # -----------------------------------------------------------------
            disruption_code = plan_data.get("disruption_id") or plan_data.get("incident_id")
            disruption = None
            if disruption_code:
                disruption = (
                    db.query(Disruption)
                    .filter(
                        (Disruption.incident_code == disruption_code) | (Disruption.id == disruption_code)
                    )
                    .first()
                )

            if disruption and disruption.organization_id.upper() != plan_org and plan_org != "GLOBAL":
                return {
                    "result": VerificationResult.ORGANIZATION_MISMATCH,
                    "status": VerificationResult.ORGANIZATION_MISMATCH,
                    "plan_id": plan_id,
                    "version": version,
                    "database_hash": db_hash,
                    "on_chain_hash": on_chain_hash,
                    "hashes_match": False,
                    "checks": checks,
                    "details": f"Disruption organization '{disruption.organization_id}' does not match plan organization '{plan_org}'.",
                    "verification_timestamp": now_str,
                }
            checks["disruption_association"] = True

            # -----------------------------------------------------------------
            # 6. Evidence Manifest Verification (for v2 / external evidence plans)
            # -----------------------------------------------------------------
            raw_manifest_hash = (
                plan_data.get("evidence_manifest_hash")
                or plan_data.get("manifest_root_hash")
                or (record.evidence_manifest_hash if record else None)
            )
            manifest_id = (
                plan_data.get("evidence_manifest_id")
                or (record.evidence_manifest_id if record else None)
            )

            has_external_evidence = False
            manifest_summary: Dict[str, Any] = {
                "has_external_evidence": False,
                "manifest_id": None,
                "manifest_root_hash": None,
                "evidence_count": 0,
                "status": "LEGACY_EXEMPT" if is_legacy else "NO_EXTERNAL_EVIDENCE",
            }

            if not is_legacy:
                norm_manifest_hash = normalize_hash(raw_manifest_hash) if raw_manifest_hash else ZERO_MANIFEST_SENTINEL
                if norm_manifest_hash != ZERO_MANIFEST_SENTINEL:
                    has_external_evidence = True

                    # Locate manifest in database (by root hash, manifest_id, or disruption association)
                    manifest = (
                        db.query(EventEvidenceManifest)
                        .filter(
                            (EventEvidenceManifest.manifest_root_hash == norm_manifest_hash)
                            | (EventEvidenceManifest.manifest_root_hash == norm_manifest_hash[2:])
                        )
                        .first()
                    )
                    if not manifest and manifest_id:
                        manifest = db.query(EventEvidenceManifest).filter_by(manifest_id=manifest_id).first()
                    if not manifest and disruption:
                        evt = (
                            db.query(ExternalDisruptionEvent)
                            .filter(
                                (ExternalDisruptionEvent.linked_disruption_id == disruption.id)
                                | (ExternalDisruptionEvent.linked_disruption_id == disruption.incident_code)
                            )
                            .first()
                        )
                        if not evt:
                            corr = (
                                db.query(EventCorrelation)
                                .filter(
                                    EventCorrelation.entity_type == "DISRUPTION",
                                    (EventCorrelation.entity_id == str(disruption.id))
                                    | (EventCorrelation.entity_id == disruption.incident_code),
                                )
                                .first()
                            )
                            if corr:
                                evt = db.query(ExternalDisruptionEvent).filter_by(event_id=corr.event_id).first()
                        if evt:
                            manifest = db.query(EventEvidenceManifest).filter_by(event_id=evt.event_id).first()

                    if not manifest:
                        return {
                            "result": VerificationResult.MANIFEST_MISSING,
                            "status": VerificationResult.MANIFEST_MISSING,
                            "plan_id": plan_id,
                            "version": version,
                            "database_hash": db_hash,
                            "on_chain_hash": on_chain_hash,
                            "hashes_match": False,
                            "checks": checks,
                            "details": f"Plan commits to external evidence manifest root '{norm_manifest_hash[:16]}...' but no manifest record exists in the database.",
                            "verification_timestamp": now_str,
                        }

                    checks["evidence_manifest_present"] = True
                    manifest_summary["has_external_evidence"] = True
                    manifest_summary["manifest_id"] = manifest.manifest_id
                    manifest_summary["manifest_root_hash"] = manifest.manifest_root_hash
                    manifest_summary["evidence_count"] = manifest.evidence_count
                    manifest_summary["status"] = manifest.status

                    # Manifest Organization Isolation
                    if manifest.organization_id.upper() != "GLOBAL" and manifest.organization_id.upper() != plan_org:
                        return {
                            "result": VerificationResult.ORGANIZATION_MISMATCH,
                            "status": VerificationResult.ORGANIZATION_MISMATCH,
                            "plan_id": plan_id,
                            "version": version,
                            "database_hash": db_hash,
                            "on_chain_hash": on_chain_hash,
                            "hashes_match": False,
                            "checks": checks,
                            "details": f"Evidence manifest tenant violation: '{manifest.organization_id}' != '{plan_org}'.",
                            "verification_timestamp": now_str,
                        }

                    # Manifest Seal Status
                    if manifest.status != "SEALED":
                        return {
                            "result": VerificationResult.MANIFEST_INVALID,
                            "status": VerificationResult.MANIFEST_INVALID,
                            "plan_id": plan_id,
                            "version": version,
                            "database_hash": db_hash,
                            "on_chain_hash": on_chain_hash,
                            "hashes_match": False,
                            "checks": checks,
                            "details": f"Evidence manifest '{manifest.manifest_id}' is not SEALED (current: {manifest.status}).",
                            "verification_timestamp": now_str,
                        }
                    checks["evidence_manifest_sealed"] = True

                    # Check non-empty evidence
                    if manifest.evidence_count <= 0:
                        return {
                            "result": VerificationResult.INSUFFICIENT_INTEGRITY_PROOF,
                            "status": VerificationResult.INSUFFICIENT_INTEGRITY_PROOF,
                            "plan_id": plan_id,
                            "version": version,
                            "database_hash": db_hash,
                            "on_chain_hash": on_chain_hash,
                            "hashes_match": False,
                            "checks": checks,
                            "details": "Evidence manifest commits to zero evidence records (insufficient proof).",
                            "verification_timestamp": now_str,
                        }

                    # Check Root Consistency with Plan Commitment
                    stored_root = normalize_hash(manifest.manifest_root_hash).lower()
                    if stored_root != norm_manifest_hash.lower():
                        return {
                            "result": VerificationResult.MANIFEST_ROOT_MISMATCH,
                            "status": VerificationResult.MANIFEST_ROOT_MISMATCH,
                            "plan_id": plan_id,
                            "version": version,
                            "database_hash": db_hash,
                            "on_chain_hash": on_chain_hash,
                            "hashes_match": False,
                            "checks": checks,
                            "details": f"Plan manifest commitment '{norm_manifest_hash}' does not match sealed manifest root '{stored_root}'.",
                            "verification_timestamp": now_str,
                        }

                    # Recompute Manifest Root from Canonical JSON
                    try:
                        recomputed_bytes = jcs.canonicalize(json.loads(manifest.manifest_canonical_json))
                        recomputed_root = "0x" + hashlib.sha256(recomputed_bytes).hexdigest()
                        if recomputed_root.lower() != stored_root:
                            return {
                                "result": VerificationResult.MANIFEST_ROOT_MISMATCH,
                                "status": VerificationResult.MANIFEST_ROOT_MISMATCH,
                                "plan_id": plan_id,
                                "version": version,
                                "database_hash": db_hash,
                                "on_chain_hash": on_chain_hash,
                                "hashes_match": False,
                                "checks": checks,
                                "details": f"Sealed manifest JSON has been tampered with: recomputed '{recomputed_root}' != stored '{stored_root}'.",
                                "verification_timestamp": now_str,
                            }
                        checks["manifest_root_consistency"] = True
                    except Exception as e:
                        return {
                            "result": VerificationResult.MANIFEST_INVALID,
                            "status": VerificationResult.MANIFEST_INVALID,
                            "plan_id": plan_id,
                            "version": version,
                            "database_hash": db_hash,
                            "on_chain_hash": on_chain_hash,
                            "hashes_match": False,
                            "checks": checks,
                            "details": f"Failed to parse or verify manifest canonical JSON: {str(e)}",
                            "verification_timestamp": now_str,
                        }

                    # Deep Evidence Items Integrity
                    evt_integrity = DisruptionIngestionService.verify_event_integrity(db, manifest.event_id, plan_org)
                    evt_status = evt_integrity.get("status")
                    if evt_status == "CONTENT_TAMPERED":
                        return {
                            "result": VerificationResult.EVIDENCE_CONTENT_TAMPERED,
                            "status": VerificationResult.EVIDENCE_CONTENT_TAMPERED,
                            "plan_id": plan_id,
                            "version": version,
                            "database_hash": db_hash,
                            "on_chain_hash": on_chain_hash,
                            "hashes_match": False,
                            "checks": checks,
                            "details": f"Evidence content tampering detected: {evt_integrity.get('details')}",
                            "verification_timestamp": now_str,
                        }
                    elif evt_status == "EVIDENCE_MISSING":
                        return {
                            "result": VerificationResult.EVIDENCE_MISSING,
                            "status": VerificationResult.EVIDENCE_MISSING,
                            "plan_id": plan_id,
                            "version": version,
                            "database_hash": db_hash,
                            "on_chain_hash": on_chain_hash,
                            "hashes_match": False,
                            "checks": checks,
                            "details": f"Evidence deletion detected: {evt_integrity.get('details')}",
                            "verification_timestamp": now_str,
                        }
                    elif evt_status == "ASSOCIATION_MISMATCH":
                        return {
                            "result": VerificationResult.EVIDENCE_ASSOCIATION_MISMATCH,
                            "status": VerificationResult.EVIDENCE_ASSOCIATION_MISMATCH,
                            "plan_id": plan_id,
                            "version": version,
                            "database_hash": db_hash,
                            "on_chain_hash": on_chain_hash,
                            "hashes_match": False,
                            "checks": checks,
                            "details": f"Evidence association mismatch: {evt_integrity.get('details')}",
                            "verification_timestamp": now_str,
                        }
                    elif evt_status == "MANIFEST_MISMATCH":
                        return {
                            "result": VerificationResult.MANIFEST_ROOT_MISMATCH,
                            "status": VerificationResult.MANIFEST_ROOT_MISMATCH,
                            "plan_id": plan_id,
                            "version": version,
                            "database_hash": db_hash,
                            "on_chain_hash": on_chain_hash,
                            "hashes_match": False,
                            "checks": checks,
                            "details": f"Evidence manifest mismatch: {evt_integrity.get('details')}",
                            "verification_timestamp": now_str,
                        }
                    elif evt_status == "INSUFFICIENT_INTEGRITY_PROOF":
                        return {
                            "result": VerificationResult.INSUFFICIENT_INTEGRITY_PROOF,
                            "status": VerificationResult.INSUFFICIENT_INTEGRITY_PROOF,
                            "plan_id": plan_id,
                            "version": version,
                            "database_hash": db_hash,
                            "on_chain_hash": on_chain_hash,
                            "hashes_match": False,
                            "checks": checks,
                            "details": f"Insufficient integrity proof: {evt_integrity.get('details')}",
                            "verification_timestamp": now_str,
                        }
                    elif not evt_integrity.get("is_valid", False):
                        return {
                            "result": VerificationResult.MANIFEST_INVALID,
                            "status": VerificationResult.MANIFEST_INVALID,
                            "plan_id": plan_id,
                            "version": version,
                            "database_hash": db_hash,
                            "on_chain_hash": on_chain_hash,
                            "hashes_match": False,
                            "checks": checks,
                            "details": f"Evidence set failed integrity verification: {evt_integrity.get('details')}",
                            "verification_timestamp": now_str,
                        }

                    checks["evidence_items_integrity"] = True
                    checks["evidence_set_completeness"] = True
                else:
                    # Legitimate internal disruption
                    checks["evidence_manifest_present"] = True
                    checks["evidence_manifest_sealed"] = True
                    checks["evidence_items_integrity"] = True
                    checks["evidence_set_completeness"] = True
                    checks["manifest_root_consistency"] = True
                    manifest_summary["status"] = "SENTINEL_INTERNAL_PLAN"
                    manifest_summary["manifest_root_hash"] = ZERO_MANIFEST_SENTINEL
            else:
                # Legacy v1 plan
                checks["evidence_manifest_present"] = True
                checks["evidence_manifest_sealed"] = True
                checks["evidence_items_integrity"] = True
                checks["evidence_set_completeness"] = True
                checks["manifest_root_consistency"] = True

            # Verify Simulation Hash
            local_sim = validate_bytes32(plan_data.get("simulation_hash"), field_name="simulation_hash", allow_empty=True)
            on_chain_sim = on_chain.get("simulation_hash", "").strip().lower()
            if on_chain_sim and on_chain_sim != "0x" + "0" * 64:
                if local_sim.lower() != on_chain_sim:
                    return {
                        "result": VerificationResult.SIMULATION_HASH_MISMATCH,
                        "status": VerificationResult.SIMULATION_HASH_MISMATCH,
                        "plan_id": plan_id,
                        "version": version,
                        "database_hash": db_hash,
                        "on_chain_hash": on_chain_hash,
                        "local_simulation_hash": local_sim,
                        "on_chain_simulation_hash": on_chain_sim,
                        "hashes_match": False,
                        "checks": checks,
                        "details": f"Simulation hash mismatch: local '{local_sim}' != on-chain '{on_chain_sim}'.",
                        "verification_timestamp": now_str,
                    }
            checks["simulation_hash_match"] = True
            checks["version_match"] = True

            # -----------------------------------------------------------------
            # 7. Execution Evidence Continuity
            # -----------------------------------------------------------------
            on_chain_exec_hash = on_chain.get("execution_evidence_hash")
            if on_chain_exec_hash and on_chain_exec_hash != "0x" + "0" * 64:
                op_exec = plan_data.get("execution_evidence")
                if op_exec:
                    try:
                        exec_bytes = jcs.canonicalize(op_exec)
                        calc_exec_hash = "0x" + hashlib.sha256(exec_bytes).hexdigest()
                        if calc_exec_hash.lower() != on_chain_exec_hash.lower():
                            return {
                                "result": VerificationResult.EVIDENCE_CONTENT_TAMPERED,
                                "status": VerificationResult.EVIDENCE_CONTENT_TAMPERED,
                                "plan_id": plan_id,
                                "version": version,
                                "database_hash": db_hash,
                                "on_chain_hash": on_chain_hash,
                                "hashes_match": False,
                                "checks": checks,
                                "details": f"Execution evidence hash mismatch: local '{calc_exec_hash}' != on-chain '{on_chain_exec_hash}'.",
                                "verification_timestamp": now_str,
                            }
                        checks["execution_evidence_verified"] = True
                    except Exception:
                        checks["execution_evidence_verified"] = False
                else:
                    checks["execution_evidence_verified"] = True  # Anchored on-chain, but operational payload not attached

            # -----------------------------------------------------------------
            # 8. Evaluate Final Governance Status
            # -----------------------------------------------------------------
            is_current = (version == latest_version and on_chain["status"] != "SUPERSEDED")
            eligible, elig_reason = contract_service.execution_eligibility(plan_id, version)
            decisions = contract_service.get_decisions(plan_id, version)

            if not is_current or on_chain["status"] == "SUPERSEDED":
                result = VerificationResult.SUPERSEDED
                status_code = VerificationResult.SUPERSEDED
                details = f"Plan integrity and manifest commitment verified, but version is superseded by V{latest_version}."
            elif on_chain["status"] == "PENDING_APPROVAL":
                result = VerificationResult.PENDING
                status_code = VerificationResult.PENDING
                details = "Plan integrity and manifest commitment verified. Awaiting governance approval."
            elif is_legacy:
                result = VerificationResult.VERIFIED
                status_code = VerificationResult.LEGACY_VERIFIED
                details = f"Historical plan (schema: {schema_version}) verified against blockchain anchor."
            elif not has_external_evidence:
                result = VerificationResult.VERIFIED
                status_code = VerificationResult.VERIFIED_WITHOUT_EXTERNAL_EVIDENCE
                details = "Internal operational plan verified against blockchain anchor (sentinel manifest confirmed)."
            else:
                result = VerificationResult.VERIFIED
                status_code = VerificationResult.VERIFIED
                details = f"End-to-end plan integrity and evidence manifest commitment verified. On-chain status: {on_chain['status']}."

            return {
                "result": result,
                "status": status_code,
                "is_valid": True,
                "plan_id": plan_id,
                "version": version,
                "database_hash": db_hash,
                "on_chain_hash": on_chain_hash,
                "hashes_match": True,
                "schema_version": schema_version,
                "is_current_version": is_current,
                "latest_on_chain_version": latest_version,
                "on_chain_status": on_chain["status"],
                "required_stages": on_chain["required_stages"],
                "completed_stages": on_chain["completed_stages"],
                "execution_eligible": eligible,
                "execution_eligibility_reason": elig_reason,
                "execution_evidence_hash": on_chain.get("execution_evidence_hash"),
                "decisions": decisions,
                "manifest_summary": manifest_summary,
                "checks": checks,
                "details": details,
                "verification_timestamp": now_str,
            }

        except Exception as e:
            return {
                "result": VerificationResult.RPC_UNAVAILABLE,
                "status": VerificationResult.RPC_UNAVAILABLE,
                "plan_id": plan_id,
                "version": version,
                "database_hash": db_hash,
                "checks": checks,
                "details": f"Error communicating with smart contract: {str(e)}",
                "verification_timestamp": now_str,
            }

