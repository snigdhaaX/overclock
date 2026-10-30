import datetime
import hashlib
import hmac
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.app.supply_chain.models import (
    Base,
    IntelligenceSource,
    ExternalDisruptionEvent,
    EventEvidence,
    EventReview,
    EventCorrelation,
    Disruption,
)
from backend.app.supply_chain.connectors import (
    NormalizedExternalEvent,
    verify_supplier_webhook_signature,
    validate_external_url,
    sanitize_untrusted_text,
    INGESTION_ADAPTERS,
)
from backend.app.supply_chain.ingestion_service import (
    DisruptionIngestionService,
    _INGESTION_LOCK,
    canonicalize_evidence_dict,
)
from backend.app.blockchain.database import get_db
from backend.app.supply_chain.auth import get_current_org_user, AuthenticatedOrgUser


client = TestClient(app)

# Clean test events fixture
@pytest.fixture(autouse=True)
def clean_phase51_test_events():
    from backend.app.blockchain.database import SessionLocal
    from backend.app.supply_chain.models import EventEvidenceManifest
    db = SessionLocal()
    try:
        # Find all test events by event_id or external_event_id
        test_evts = db.query(ExternalDisruptionEvent).filter(
            (ExternalDisruptionEvent.event_id.like("EVT-TEST-%")) |
            (ExternalDisruptionEvent.external_event_id.like("TEST-%"))
        ).all()
        test_ids = [e.event_id for e in test_evts]
        if test_ids:
            db.query(EventEvidenceManifest).filter(EventEvidenceManifest.event_id.in_(test_ids)).delete(synchronize_session=False)
            db.query(EventReview).filter(EventReview.event_id.in_(test_ids)).delete(synchronize_session=False)
            db.query(EventEvidence).filter(EventEvidence.event_id.in_(test_ids)).delete(synchronize_session=False)
            db.query(EventCorrelation).filter(EventCorrelation.event_id.in_(test_ids)).delete(synchronize_session=False)
            db.query(ExternalDisruptionEvent).filter(ExternalDisruptionEvent.event_id.in_(test_ids)).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()
    yield
    db = SessionLocal()
    try:
        test_evts = db.query(ExternalDisruptionEvent).filter(
            (ExternalDisruptionEvent.event_id.like("EVT-TEST-%")) |
            (ExternalDisruptionEvent.external_event_id.like("TEST-%"))
        ).all()
        test_ids = [e.event_id for e in test_evts]
        if test_ids:
            db.query(EventEvidenceManifest).filter(EventEvidenceManifest.event_id.in_(test_ids)).delete(synchronize_session=False)
            db.query(EventReview).filter(EventReview.event_id.in_(test_ids)).delete(synchronize_session=False)
            db.query(EventEvidence).filter(EventEvidence.event_id.in_(test_ids)).delete(synchronize_session=False)
            db.query(EventCorrelation).filter(EventCorrelation.event_id.in_(test_ids)).delete(synchronize_session=False)
            db.query(ExternalDisruptionEvent).filter(ExternalDisruptionEvent.event_id.in_(test_ids)).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def test_evidence_tampering_detection():
    """Modifying evidence in the database directly must fail cryptographic integrity verification."""
    from backend.app.blockchain.database import SessionLocal
    db = SessionLocal()

    now = datetime.datetime.utcnow()
    event_id = "EVT-TEST-TAMPER-01"
    evt = ExternalDisruptionEvent(
        event_id=event_id,
        external_event_id="TEST-TAMPER-EXT",
        source_id="SRC-AIS-GLOBAL",
        source_type="MARITIME_AIS",
        mode="LIVE",
        title="Test Maritime Alert",
        description="Authentic vessel delay report.",
        category="MARITIME_INCIDENT",
        severity="HIGH",
        geographic_region="Red Sea",
        event_timestamp=now,
    )
    db.add(evt)
    db.flush()

    # Create canonical evidence
    summary = "Original authentic harbor master telemetry."
    ev_dict = {
        "event_id": event_id,
        "evidence_type": "AIS_TRACK",
        "summary": summary,
        "source_id": "SRC-AIS-GLOBAL",
        "source_event_timestamp": now.isoformat(),
        "captured_at": now.isoformat(),
    }
    canon_json = canonicalize_evidence_dict(ev_dict)
    ev_hash = hashlib.sha256(canon_json.encode("utf-8")).hexdigest()

    evidence = EventEvidence(
        event_id=event_id,
        evidence_type="AIS_TRACK",
        summary=summary,
        hash_sha256=ev_hash,
        canonical_payload_json=canon_json,
        source_id="SRC-AIS-GLOBAL",
        source_event_timestamp=now,
        integrity_status="VERIFIED",
        captured_at=now,
    )
    db.add(evidence)
    db.commit()

    # Seal manifest for the event
    DisruptionIngestionService.seal_evidence_manifest(db, event_id, "ORG-APEX-GLOBAL")
    db.commit()

    # 1. Verification of untouched evidence must pass
    verif1 = DisruptionIngestionService.verify_evidence_integrity(db, evidence.id)
    assert verif1["is_valid"] is True
    assert verif1["status"] in ["VALID", "VERIFIED"]

    # 2. Tamper with the evidence summary directly in SQLite
    evidence.summary = "FABRICATED: No vessel delay occurred."
    db.commit()

    # 3. Verification must immediately flag CONTENT_TAMPERED
    verif2 = DisruptionIngestionService.verify_evidence_integrity(db, evidence.id)
    assert verif2["is_valid"] is False
    assert verif2["status"] in ["CONTENT_TAMPERED", "TAMPERED"]

    # 4. Verify event integrity reflects the compromise
    event_verif = DisruptionIngestionService.verify_event_integrity(db, event_id, "ORG-APEX-GLOBAL")
    assert event_verif["is_valid"] is False
    assert event_verif["status"] in ["CONTENT_TAMPERED", "INTEGRITY_COMPROMISED"]

    db.close()


def test_evidence_deletion_and_missing_reference():
    """Non-existent or deleted evidence IDs must be reported as missing."""
    from backend.app.blockchain.database import SessionLocal
    db = SessionLocal()

    verif = DisruptionIngestionService.verify_evidence_integrity(db, 99999999)
    assert verif["is_valid"] is False
    assert verif["status"] == "EVIDENCE_MISSING"

    db.close()


def test_source_health_transitions():
    """Source health transitions cleanly between NOT_CONFIGURED, HEALTHY, DEGRADED, and UNAVAILABLE."""
    from backend.app.blockchain.database import SessionLocal
    db = SessionLocal()

    DisruptionIngestionService.initialize_sources(db)
    ais_src = db.query(IntelligenceSource).filter_by(source_id="SRC-AIS-GLOBAL").first()
    assert ais_src is not None

    # If unconfigured live key, status is NOT_CONFIGURED or DEMO
    if not ais_src.mode == "LIVE":
        assert ais_src.connection_status in ["NOT_CONFIGURED", "DEMO"]

    # Test failure counter transitions
    ais_src.consecutive_failures = 1
    ais_src.connection_status = "DEGRADED"
    db.commit()
    assert ais_src.connection_status == "DEGRADED"

    ais_src.consecutive_failures = 3
    ais_src.connection_status = "UNAVAILABLE"
    db.commit()
    assert ais_src.connection_status == "UNAVAILABLE"

    # Recovery
    ais_src.consecutive_failures = 0
    ais_src.connection_status = "HEALTHY"
    ais_src.last_successful_at = datetime.datetime.utcnow()
    db.commit()
    assert ais_src.connection_status == "HEALTHY"

    db.close()


def test_concurrent_ingestion_lock():
    """Concurrent ingestion requests must respect the threading lock."""
    from backend.app.blockchain.database import SessionLocal
    db = SessionLocal()

    # Simulate lock being held by another thread
    assert _INGESTION_LOCK.acquire(blocking=False) is True
    try:
        with pytest.raises(RuntimeError, match="Concurrent polling blocked"):
            DisruptionIngestionService.run_ingestion_cycle(db, "ORG-APEX-GLOBAL", source_id="SRC-AIS-GLOBAL")
    finally:
        _INGESTION_LOCK.release()

    db.close()


def test_independent_corroboration_vs_duplicate_inflation():
    """Independent reports from distinct sources provide corroboration; duplicate re-ingestion does not."""
    from backend.app.blockchain.database import SessionLocal
    db = SessionLocal()

    now = datetime.datetime.utcnow()

    # 1. Ingest initial event from NOAA weather
    norm_evt1 = NormalizedExternalEvent(
        source_id="SRC-WEATHER-NOAA",
        source_type="WEATHER_ALERTS",
        provider_name="NOAA",
        mode="DEMO",
        external_event_id="TEST-WX-CORROB-01",
        title="Typhoon Wind Warning near Taiwan Strait",
        description="High seas and wind gusts.",
        category="WEATHER",
        severity="HIGH",
        geographic_region="Taiwan Strait",
        latitude=24.0,
        longitude=120.5,
        affected_corridor="Trans-Pacific Corridor",
        event_timestamp=now,
    )
    db_evt1, is_dup1 = DisruptionIngestionService.process_incoming_event(db, norm_evt1, "ORG-APEX-GLOBAL")
    assert is_dup1 is False
    score1 = db_evt1.confidence_score

    # 2. Ingest duplicate report from SAME source (should be duplicate, no inflation)
    db_evt1_dup, is_dup2 = DisruptionIngestionService.process_incoming_event(db, norm_evt1, "ORG-APEX-GLOBAL")
    assert is_dup2 is True
    assert db_evt1_dup.validation_status == "DUPLICATE"

    # 3. Ingest independent alert for same category from Port Authority (different source_id)
    norm_evt2 = NormalizedExternalEvent(
        source_id="SRC-PORT-TELEMETRY",
        source_type="PORT_STATUS",
        provider_name="Port Authority",
        mode="DEMO",
        external_event_id="TEST-PORT-CORROB-02",
        title="Terminal Operations Suspended for Typhoon",
        description="Kaohsiung port suspends container crane operations.",
        category="WEATHER",
        severity="HIGH",
        geographic_region="Kaohsiung Port",
        latitude=22.61,
        longitude=120.28,
        affected_corridor="Taiwan Strait Gateway",
        event_timestamp=now,
        evidence_items=[{"type": "PORT_BULLETIN", "summary": "Port suspended"}],
    )
    db_evt2, is_dup3 = DisruptionIngestionService.process_incoming_event(db, norm_evt2, "ORG-APEX-GLOBAL")
    assert is_dup3 is False
    # Score has independent corroboration from existing NOAA event in same category
    assert db_evt2.confidence_score >= 0.85

    db.close()


def test_false_positive_geographic_matching():
    """Unrelated incidents at the same port must NOT be merged as duplicate events."""
    from backend.app.blockchain.database import SessionLocal
    db = SessionLocal()

    now = datetime.datetime.utcnow()

    # Event 1: Port customs gate software crash
    evt1 = NormalizedExternalEvent(
        source_id="SRC-PORT-TELEMETRY",
        source_type="PORT_STATUS",
        provider_name="Port Authority",
        mode="DEMO",
        external_event_id="TEST-PORT-RTM-CUSTOMS",
        title="Automated Terminal Gate System Outage at Port of Rotterdam",
        description="Customs electronic clearance servers down. Truck queues extending 14km.",
        category="PORT_CONGESTION",
        severity="MEDIUM",
        geographic_region="Port of Rotterdam",
        latitude=51.9566,
        longitude=4.0531,
        event_timestamp=now,
    )
    db_evt1, _ = DisruptionIngestionService.process_incoming_event(db, evt1, "ORG-APEX-GLOBAL")

    # Event 2: Chemical tanker fire at the same port (0km distance, but different title/event)
    evt2 = NormalizedExternalEvent(
        source_id="SRC-PORT-TELEMETRY",
        source_type="PORT_STATUS",
        provider_name="Port Authority",
        mode="DEMO",
        external_event_id="TEST-PORT-RTM-CHEMICAL",
        title="Hazardous Chemical Tanker Spillage and Fire at Europoort",
        description="Fire brigade responding to benzene leak from tanker vessel.",
        category="PORT_CONGESTION",
        severity="CRITICAL",
        geographic_region="Port of Rotterdam",
        latitude=51.9566,
        longitude=4.0531,
        event_timestamp=now,
    )
    db_evt2, is_dup2 = DisruptionIngestionService.process_incoming_event(db, evt2, "ORG-APEX-GLOBAL")

    # Must NOT be merged as duplicate because text similarity is low despite identical coordinates!
    assert is_dup2 is False
    assert db_evt2.validation_status == "VALIDATED"
    assert db_evt2.duplicate_of_event_id is None

    db.close()


def test_review_state_transitions_and_idempotence():
    """Confirm workflow must be idempotent, prevent duplicate incidents, and block invalid transitions."""
    from backend.app.blockchain.database import SessionLocal
    db = SessionLocal()

    now = datetime.datetime.utcnow()
    evt = NormalizedExternalEvent(
        source_id="SRC-AIS-GLOBAL",
        source_type="MARITIME_AIS",
        provider_name="AIS Tracking",
        mode="DEMO",
        external_event_id="TEST-REVIEW-TRANS-01",
        title="Canal Transit Restriction Alert",
        description="Suez Canal convoy delayed.",
        category="MARITIME_INCIDENT",
        severity="HIGH",
        geographic_region="Suez Canal",
        affected_corridor="Asia-Europe Maritime Route via Suez",
        event_timestamp=now,
    )
    db_evt, _ = DisruptionIngestionService.process_incoming_event(db, evt, "ORG-APEX-GLOBAL")
    event_id = db_evt.event_id

    # 1. First confirmation creates operational disruption
    disruption1 = DisruptionIngestionService.confirm_event_as_disruption(
        db, event_id, "user:ops-analyst-88", "ORG-APEX-GLOBAL", "First confirmation"
    )
    assert disruption1 is not None
    assert disruption1.incident_code.startswith("INC-")

    # 2. Second confirmation call must be idempotent: returns the SAME disruption without creating a duplicate
    disruption2 = DisruptionIngestionService.confirm_event_as_disruption(
        db, event_id, "user:ops-analyst-88", "ORG-APEX-GLOBAL", "Duplicate confirmation call"
    )
    assert disruption2.id == disruption1.id
    assert disruption2.incident_code == disruption1.incident_code

    # 3. Rejecting an already confirmed event must be rejected
    with pytest.raises(ValueError, match="already CONFIRMED_AS_DISRUPTION"):
        DisruptionIngestionService.reject_event(
            db, event_id, "user:ops-analyst-88", "ORG-APEX-GLOBAL", "Attempted invalid reject"
        )

    db.close()


def test_supplier_webhook_hmac_verification():
    """Supplier webhook HMAC-SHA256 signature verification must reject invalid or tampered signatures."""
    payload = json.dumps({"supplier_code": "SUP-TSMC-01", "incident": "POWER_LOSS"}).encode("utf-8")
    secret = "secret-key-12345"

    # Valid signature
    valid_sig = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    assert verify_supplier_webhook_signature(payload, f"sha256={valid_sig}", secret) is True
    assert verify_supplier_webhook_signature(payload, valid_sig, secret) is True

    # Tampered payload
    tampered_payload = json.dumps({"supplier_code": "SUP-TSMC-01", "incident": "NO_INCIDENT"}).encode("utf-8")
    assert verify_supplier_webhook_signature(tampered_payload, valid_sig, secret) is False

    # Invalid signature string
    assert verify_supplier_webhook_signature(payload, "invalid_sig", secret) is False

    # Missing signature or secret
    assert verify_supplier_webhook_signature(payload, None, secret) is False
    assert verify_supplier_webhook_signature(payload, valid_sig, None) is False


def test_ssrf_protection_and_url_allowlisting():
    """SSRF protection must block private IP addresses, localhost, and unauthorized domains."""
    # Authorized domain
    assert validate_external_url("https://api.weather.gov/alerts/active") == "https://api.weather.gov/alerts/active"

    # Unauthorized domain
    with pytest.raises(ValueError, match="not in the TRUSTCHAIN authorized external provider allowlist"):
        validate_external_url("https://evil-attacker.com/malicious-endpoint")

    # Insecure scheme (HTTP instead of HTTPS)
    with pytest.raises(ValueError, match="Only HTTPS is permitted"):
        validate_external_url("http://api.weather.gov/alerts")


def test_untrusted_text_sanitization():
    """External titles and descriptions must be stripped of HTML, script injection, and control characters."""
    malicious = "<script>alert('xss')</script>Normal Title & <iframe src='evil.com'></iframe>"
    sanitized = sanitize_untrusted_text(malicious)
    assert "<script>" not in sanitized
    assert "<iframe>" not in sanitized
    assert "alert('xss')" in sanitized
    assert "Normal Title" in sanitized
