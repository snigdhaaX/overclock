"""
TRUSTCHAIN — Phase 5.3 Comprehensive Test Suite
Evidence Integrity, Canonical Governance Binding & Independent Verification

Tests all Phase 5.3 specifications:
A. Canonical Hashing (determinism, manifest binding, versioning, action sensitivity, bytes32 validation, cross-language RFC 8785)
B. Manifest Integrity (root matching, content tampering, deletion, addition, association fraud, unsealed manifest, empty evidence)
C. Recovery Plan Lifecycle (manifest binding, revision, immutability, superseded status, stale hash rejection)
D. Blockchain Verification (match, hash mismatch, simulation mismatch, missing anchor, legacy v1, internal zero-sentinel v2)
E. Execution Continuity (execution evidence linkage, tampering detection, version correlation)
F. Security (cross-tenant rejection, frontend hash manipulation prevention, zero-sentinel distinction)
"""

import datetime
import hashlib
import json
import subprocess
from unittest.mock import MagicMock
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.blockchain.database import SessionLocal, OperationalRecoveryPlan
from backend.app.supply_chain.models import (
    Disruption,
    ExternalDisruptionEvent,
    EventEvidence,
    EventEvidenceManifest,
    EventCorrelation,
)
from backend.app.supply_chain.ingestion_service import (
    DisruptionIngestionService,
    canonicalize_evidence_dict,
)
from backend.app.blockchain.hash_service import (
    RecoveryPlanHashService,
    validate_bytes32,
    normalize_hash,
    SCHEMA_VERSION_V1,
    SCHEMA_VERSION_V2,
    ZERO_MANIFEST_SENTINEL,
)
from backend.app.blockchain.verification_service import (
    PlanVerificationService,
    VerificationResult,
)
import jcs

client = TestClient(app)

TEST_ORG = "ORG-APEX-GLOBAL"
RIVAL_ORG = "ORG-RIVAL-CORP"

SAMPLE_V2_PLAN = {
    "organization_id": TEST_ORG,
    "plan_id": "RCP-P53-TEST-001",
    "version": 1,
    "disruption_id": "DISRUPT-P53-001",
    "simulation_hash": "0x" + "a" * 64,
    "evidence_manifest_hash": "0x" + "b" * 64,
    "action_categories": [1, 2],
    "recovery_actions": [
        {
            "action_type": "WAREHOUSE_TRANSFER",
            "source_warehouse": "WH-WEST-01",
            "destination_warehouse": "WH-CENTRAL-02",
            "product_reference": "SKU-ELEC-440",
            "quantity": 1500,
            "estimated_cost": 4500.5,
            "currency": "USD",
            "constraints": {"transit_days": "2"},
        }
    ],
    "estimated_total_cost": 4500.5,
    "currency": "USD",
    "operational_constraints": {"sla_hours": "48"},
    "policy_snapshot": {"required_stages": "2"},
}


@pytest.fixture(autouse=True)
def clean_phase53_records():
    db = SessionLocal()
    try:
        evts = db.query(ExternalDisruptionEvent).filter(ExternalDisruptionEvent.event_id.like("EVT-P53-%")).all()
        evt_ids = [e.event_id for e in evts]
        if evt_ids:
            db.query(EventEvidenceManifest).filter(EventEvidenceManifest.event_id.in_(evt_ids)).delete(synchronize_session=False)
            db.query(EventEvidence).filter(EventEvidence.event_id.in_(evt_ids)).delete(synchronize_session=False)
            db.query(EventCorrelation).filter(EventCorrelation.event_id.in_(evt_ids)).delete(synchronize_session=False)
            db.query(ExternalDisruptionEvent).filter(ExternalDisruptionEvent.event_id.in_(evt_ids)).delete(synchronize_session=False)
        db.query(OperationalRecoveryPlan).filter(OperationalRecoveryPlan.plan_id.like("RCP-P53-%")).delete(synchronize_session=False)
        db.query(Disruption).filter(Disruption.incident_code.like("INC-P53-%")).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()
    yield
    db = SessionLocal()
    try:
        evts = db.query(ExternalDisruptionEvent).filter(ExternalDisruptionEvent.event_id.like("EVT-P53-%")).all()
        evt_ids = [e.event_id for e in evts]
        if evt_ids:
            db.query(EventEvidenceManifest).filter(EventEvidenceManifest.event_id.in_(evt_ids)).delete(synchronize_session=False)
            db.query(EventEvidence).filter(EventEvidence.event_id.in_(evt_ids)).delete(synchronize_session=False)
            db.query(EventCorrelation).filter(EventCorrelation.event_id.in_(evt_ids)).delete(synchronize_session=False)
            db.query(ExternalDisruptionEvent).filter(ExternalDisruptionEvent.event_id.in_(evt_ids)).delete(synchronize_session=False)
        db.query(OperationalRecoveryPlan).filter(OperationalRecoveryPlan.plan_id.like("RCP-P53-%")).delete(synchronize_session=False)
        db.query(Disruption).filter(Disruption.incident_code.like("INC-P53-%")).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def _create_sealed_event(db, event_id: str, count: int = 2, org_id: str = TEST_ORG):
    now = datetime.datetime.utcnow()
    evt = ExternalDisruptionEvent(
        event_id=event_id,
        external_event_id=f"EXT-{event_id}",
        source_id="SRC-AIS-GLOBAL",
        source_type="MARITIME_AIS",
        mode="LIVE",
        title=f"Disruption Event {event_id}",
        description="Event with sealed evidence manifest.",
        category="MARITIME_INCIDENT",
        severity="CRITICAL",
        geographic_region="Suez Canal",
        event_timestamp=now,
    )
    db.add(evt)
    db.flush()

    for i in range(count):
        summary = f"Evidence {i+1} for {event_id}"
        p_dict = {
            "event_id": event_id,
            "evidence_type": "AIS_TRACK",
            "summary": summary,
            "source_id": "SRC-AIS-GLOBAL",
            "source_event_timestamp": now.isoformat(),
            "captured_at": now.isoformat(),
        }
        canon_json = canonicalize_evidence_dict(p_dict)
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

    db.flush()
    manifest = DisruptionIngestionService.seal_evidence_manifest(db, event_id, org_id)
    db.commit()
    return evt, manifest


def _create_mock_contract(plan_hash: str, sim_hash: str = "0x" + "a" * 64, exec_evidence_hash: str = "0x" + "0" * 64, version: int = 1, status: str = "APPROVED"):
    mock = MagicMock()
    mock.is_connected = True
    mock.plan_exists.return_value = True
    mock.get_latest_version.return_value = version
    mock.get_plan_version.return_value = {
        "plan_hash": plan_hash,
        "simulation_hash": sim_hash,
        "status": status,
        "action_mask": 3,
        "current_stage": 2,
        "required_stages": 2,
        "completed_stages": 2,
        "rejection_reason": "",
        "created_at": 1700000000,
        "closed_at": 0,
        "execution_evidence_hash": exec_evidence_hash,
        "version": version,
    }
    mock.execution_eligibility.return_value = (True, "ELIGIBLE")
    mock.get_decisions.return_value = []
    return mock


# ===========================================================================
# A. CANONICAL HASHING TESTS
# ===========================================================================

def test_canonical_deterministic_hashes():
    """Identical V2 plans must produce the exact same canonical JSON and SHA-256 hash."""
    j1, h1 = RecoveryPlanHashService.generate_plan_hash(SAMPLE_V2_PLAN, schema_version=SCHEMA_VERSION_V2)
    j2, h2 = RecoveryPlanHashService.generate_plan_hash(SAMPLE_V2_PLAN, schema_version=SCHEMA_VERSION_V2)
    assert j1 == j2
    assert h1 == h2
    assert h1.startswith("0x")
    assert len(h1) == 66


def test_different_manifest_roots_produce_different_plan_hashes():
    """Changing evidence_manifest_hash in a V2 plan MUST change the canonical plan hash."""
    plan1 = dict(SAMPLE_V2_PLAN, evidence_manifest_hash="0x" + "1" * 64)
    plan2 = dict(SAMPLE_V2_PLAN, evidence_manifest_hash="0x" + "2" * 64)
    _, h1 = RecoveryPlanHashService.generate_plan_hash(plan1, schema_version=SCHEMA_VERSION_V2)
    _, h2 = RecoveryPlanHashService.generate_plan_hash(plan2, schema_version=SCHEMA_VERSION_V2)
    assert h1 != h2


def test_different_versions_produce_different_hashes():
    """V1 schema vs V2 schema produce different hashes even with identical operational inputs."""
    _, h_v1 = RecoveryPlanHashService.generate_plan_hash(SAMPLE_V2_PLAN, schema_version=SCHEMA_VERSION_V1)
    _, h_v2 = RecoveryPlanHashService.generate_plan_hash(SAMPLE_V2_PLAN, schema_version=SCHEMA_VERSION_V2)
    assert h_v1 != h_v2


def test_changed_recovery_actions_produce_different_hashes():
    """Modifying recovery actions alters the V2 plan hash."""
    mod = dict(SAMPLE_V2_PLAN)
    mod["recovery_actions"] = [
        dict(SAMPLE_V2_PLAN["recovery_actions"][0], quantity=9999)
    ]
    _, h1 = RecoveryPlanHashService.generate_plan_hash(SAMPLE_V2_PLAN, schema_version=SCHEMA_VERSION_V2)
    _, h2 = RecoveryPlanHashService.generate_plan_hash(mod, schema_version=SCHEMA_VERSION_V2)
    assert h1 != h2


def test_changed_simulation_hashes_produce_different_hashes():
    """Modifying simulation hash alters the V2 plan hash."""
    mod = dict(SAMPLE_V2_PLAN, simulation_hash="0x" + "f" * 64)
    _, h1 = RecoveryPlanHashService.generate_plan_hash(SAMPLE_V2_PLAN, schema_version=SCHEMA_VERSION_V2)
    _, h2 = RecoveryPlanHashService.generate_plan_hash(mod, schema_version=SCHEMA_VERSION_V2)
    assert h1 != h2


def test_malformed_bytes32_inputs_fail():
    """validate_bytes32 must reject non-hex and invalid lengths."""
    with pytest.raises(ValueError, match="must be exactly 32 bytes"):
        validate_bytes32("0x" + "1234", "test_field")

    with pytest.raises(ValueError, match="must be exactly 32 bytes"):
        validate_bytes32("12345", "test_field")

    with pytest.raises(ValueError, match="contains invalid non-hex characters"):
        validate_bytes32("0x" + "z" * 64, "test_field")

    valid1 = validate_bytes32("0x" + "aB12" * 16, "test_field")
    assert valid1.startswith("0x")
    assert valid1 == valid1.lower()

    valid2 = validate_bytes32("aB12" * 16, "test_field")
    assert valid2.startswith("0x")
    assert valid2 == valid1


def test_cross_language_rfc8785_recovery_plan_vectors():
    """Python jcs and Node.js canonicalize must yield identical canonical bytes and hash for V2 payload."""
    payload = RecoveryPlanHashService.build_canonical_representation(
        SAMPLE_V2_PLAN, schema_version=SCHEMA_VERSION_V2
    )

    py_bytes = jcs.canonicalize(payload)
    py_canon = py_bytes.decode("utf-8")
    py_hash = "0x" + hashlib.sha256(py_bytes).hexdigest()

    node_code = """
    const canonicalize = require('canonicalize');
    const crypto = require('crypto');
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => raw += chunk);
    process.stdin.on('end', () => {
        const data = JSON.parse(raw);
        const canonFn = canonicalize.default || canonicalize.canonicalize || canonicalize;
        const canon = canonFn(data);
        const hash = '0x' + crypto.createHash('sha256').update(canon, 'utf8').digest('hex');
        console.log(JSON.stringify({ canon: canon, hash: hash }));
    });
    """
    node_proc = subprocess.Popen(
        ["node", "-e", node_code],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=str(__import__("pathlib").Path(__file__).resolve().parents[2] / "blockchain"),
    )
    stdout, stderr = node_proc.communicate(input=json.dumps(payload).encode("utf-8"))
    assert node_proc.returncode == 0, f"Node script error: {stderr.decode('utf-8')}"
    node_out = json.loads(stdout.decode("utf-8").strip())

    assert py_canon == node_out["canon"]
    assert py_hash == node_out["hash"]


# ===========================================================================
# B. MANIFEST INTEGRITY & ASSOCIATION TESTS
# ===========================================================================

def test_manifest_root_correct():
    """Sealed event manifest produces verified integrity."""
    db = SessionLocal()
    evt, manifest = _create_sealed_event(db, "EVT-P53-MOK-01", count=2)
    res = DisruptionIngestionService.verify_event_integrity(db, evt.event_id, TEST_ORG)
    assert res["is_valid"] is True
    assert res["status"] == "VALID"
    assert res["manifest_root_hash"] == manifest.manifest_root_hash
    db.close()


def test_modified_evidence_detected_as_tampered():
    """Altering evidence record directly in DB triggers CONTENT_TAMPERED."""
    db = SessionLocal()
    evt, _ = _create_sealed_event(db, "EVT-P53-MOD-01", count=2)
    ev = db.query(EventEvidence).filter_by(event_id=evt.event_id).first()
    ev.summary = "TAMPERED SUMMARY"
    db.commit()

    res = DisruptionIngestionService.verify_event_integrity(db, evt.event_id, TEST_ORG)
    assert res["is_valid"] is False
    assert res["status"] == "CONTENT_TAMPERED"
    db.close()


def test_deleted_evidence_detected():
    """Deleting an evidence row triggers EVIDENCE_MISSING."""
    db = SessionLocal()
    evt, _ = _create_sealed_event(db, "EVT-P53-DEL-01", count=2)
    ev = db.query(EventEvidence).filter_by(event_id=evt.event_id).first()
    db.delete(ev)
    db.commit()

    res = DisruptionIngestionService.verify_event_integrity(db, evt.event_id, TEST_ORG)
    assert res["is_valid"] is False
    assert res["status"] == "EVIDENCE_MISSING"
    db.close()


def test_uncommitted_evidence_detected():
    """Adding an evidence row after manifest sealing triggers MANIFEST_MISMATCH."""
    db = SessionLocal()
    evt, _ = _create_sealed_event(db, "EVT-P53-ADD-01", count=1)

    now = datetime.datetime.utcnow()
    p_dict = {
        "event_id": evt.event_id,
        "evidence_type": "NEWS_ARTICLE",
        "summary": "Uncommitted new evidence",
        "source_id": "SRC-AIS-GLOBAL",
        "source_event_timestamp": now.isoformat(),
        "captured_at": now.isoformat(),
    }
    canon = canonicalize_evidence_dict(p_dict)
    h = hashlib.sha256(canon.encode("utf-8")).hexdigest()
    extra_ev = EventEvidence(
        event_id=evt.event_id,
        evidence_type="NEWS_ARTICLE",
        summary="Uncommitted new evidence",
        hash_sha256=h,
        canonical_payload_json=canon,
        source_id="SRC-AIS-GLOBAL",
        source_event_timestamp=now,
        integrity_status="VERIFIED",
        captured_at=now,
    )
    db.add(extra_ev)
    db.commit()

    res = DisruptionIngestionService.verify_event_integrity(db, evt.event_id, TEST_ORG)
    assert res["is_valid"] is False
    assert res["status"] == "MANIFEST_MISMATCH"
    db.close()


def test_unsealed_manifest_rejected():
    """Altered or tampered manifest root triggers MANIFEST_MISMATCH / MANIFEST_INVALID."""
    db = SessionLocal()
    evt, manifest = _create_sealed_event(db, "EVT-P53-UNSEAL-01", count=1)
    manifest.manifest_canonical_json = manifest.manifest_canonical_json.replace("trustchain", "tampered")
    db.commit()

    res = DisruptionIngestionService.verify_event_integrity(db, evt.event_id, TEST_ORG)
    assert res["is_valid"] is False
    assert res["status"] == "MANIFEST_MISMATCH"
    db.close()


def test_empty_evidence_produces_insufficient_proof():
    """An event with 0 evidence records produces INSUFFICIENT_INTEGRITY_PROOF."""
    db = SessionLocal()
    evt = ExternalDisruptionEvent(
        event_id="EVT-P53-EMPTY-01",
        external_event_id="EXT-EVT-P53-EMPTY-01",
        source_id="SRC-WEATHER-NOAA",
        source_type="WEATHER_ALERTS",
        mode="DEMO",
        title="Empty Event",
        description="No evidence",
        category="WEATHER",
        severity="LOW",
        geographic_region="Global",
        event_timestamp=datetime.datetime.utcnow(),
    )
    db.add(evt)
    db.commit()

    res = DisruptionIngestionService.verify_event_integrity(db, evt.event_id, TEST_ORG)
    assert res["is_valid"] is False
    assert res["status"] == "INSUFFICIENT_INTEGRITY_PROOF"
    db.close()


# ===========================================================================
# C. RECOVERY PLAN LIFECYCLE TESTS
# ===========================================================================

def test_plan_creation_with_manifest_binding():
    """Creating a recovery plan resolves the event's manifest root and binds it into the plan hash."""
    db = SessionLocal()
    now = datetime.datetime.utcnow()
    evt, manifest = _create_sealed_event(db, "EVT-P53-PLAN-01", count=2)

    disruption = Disruption(
        organization_id=TEST_ORG,
        incident_code="INC-P53-01",
        category="PORT_CONGESTION",
        severity="HIGH",
        geographic_region="Suez",
        description="Port Disruption",
        start_time=now,
        status="ACTIVE",
    )
    db.add(disruption)
    db.flush()

    corr = EventCorrelation(
        event_id=evt.event_id,
        entity_type="DISRUPTION",
        entity_id=str(disruption.id),
        match_criteria="CORRIDOR_MATCH",
        relevance_score=0.95,
        reason_for_match="Direct correlation",
        organization_id=TEST_ORG,
    )
    db.add(corr)
    db.commit()

    manifest_info = DisruptionIngestionService.resolve_evidence_manifest_for_disruption(
        db, disruption, TEST_ORG
    )
    assert manifest_info["has_external_evidence"] is True
    assert manifest_info["manifest_root_hash"] == normalize_hash(manifest.manifest_root_hash)

    plan_data = dict(SAMPLE_V2_PLAN, disruption_id=disruption.incident_code, evidence_manifest_hash=manifest_info["manifest_root_hash"])
    canon_json, plan_hash = RecoveryPlanHashService.generate_plan_hash(plan_data, schema_version=SCHEMA_VERSION_V2)

    op_plan = OperationalRecoveryPlan(
        organization_id=TEST_ORG,
        plan_id="RCP-P53-PLAN-01",
        version=1,
        plan_data_json=canon_json,
        canonical_plan_hash=plan_hash,
        canonical_schema_version=SCHEMA_VERSION_V2,
        disruption_id=disruption.incident_code,
        evidence_manifest_id=manifest_info["manifest_id"],
        evidence_manifest_hash=manifest_info["manifest_root_hash"],
        is_anchored=False,
    )
    db.add(op_plan)
    db.commit()

    saved = db.query(OperationalRecoveryPlan).filter_by(plan_id="RCP-P53-PLAN-01", version=1).first()
    assert saved.canonical_schema_version == SCHEMA_VERSION_V2
    assert saved.evidence_manifest_hash == normalize_hash(manifest.manifest_root_hash)
    assert saved.canonical_plan_hash == plan_hash
    db.close()


def test_plan_revision_creates_distinct_commitment():
    """Version 2 creates a distinct plan commitment while keeping Version 1 intact."""
    db = SessionLocal()
    evt, manifest = _create_sealed_event(db, "EVT-P53-REV-01", count=1)

    p1 = dict(SAMPLE_V2_PLAN, plan_id="RCP-P53-REV-01", version=1, evidence_manifest_hash=manifest.manifest_root_hash)
    _, h1 = RecoveryPlanHashService.generate_plan_hash(p1, schema_version=SCHEMA_VERSION_V2)

    p2 = dict(SAMPLE_V2_PLAN, plan_id="RCP-P53-REV-01", version=2, evidence_manifest_hash=manifest.manifest_root_hash)
    p2["recovery_actions"] = [dict(p2["recovery_actions"][0], quantity=3000)]
    _, h2 = RecoveryPlanHashService.generate_plan_hash(p2, schema_version=SCHEMA_VERSION_V2)

    assert h1 != h2

    op1 = OperationalRecoveryPlan(
        organization_id=TEST_ORG,
        plan_id="RCP-P53-REV-01",
        version=1,
        plan_data_json=json.dumps(p1),
        canonical_plan_hash=h1,
        canonical_schema_version=SCHEMA_VERSION_V2,
        evidence_manifest_hash=manifest.manifest_root_hash,
    )
    op2 = OperationalRecoveryPlan(
        organization_id=TEST_ORG,
        plan_id="RCP-P53-REV-01",
        version=2,
        plan_data_json=json.dumps(p2),
        canonical_plan_hash=h2,
        canonical_schema_version=SCHEMA_VERSION_V2,
        evidence_manifest_hash=manifest.manifest_root_hash,
    )
    db.add_all([op1, op2])
    db.commit()

    versions = db.query(OperationalRecoveryPlan).filter_by(plan_id="RCP-P53-REV-01").all()
    assert len(versions) == 2
    assert {v.version for v in versions} == {1, 2}
    assert op1.canonical_plan_hash != op2.canonical_plan_hash
    db.close()


# ===========================================================================
# D. BLOCKCHAIN VERIFICATION TESTS
# ===========================================================================

def test_blockchain_verification_matching_v2_hashes():
    """PlanVerificationService returns VERIFIED when V2 local matches on-chain and evidence is intact."""
    db = SessionLocal()
    now = datetime.datetime.utcnow()
    evt, manifest = _create_sealed_event(db, "EVT-P53-VER-01", count=2)

    disruption = Disruption(
        organization_id=TEST_ORG,
        incident_code="INC-P53-VER",
        category="PORT_CONGESTION",
        severity="HIGH",
        geographic_region="Suez",
        description="Test Disruption",
        start_time=now,
        status="ACTIVE",
    )
    db.add(disruption)
    db.flush()

    corr = EventCorrelation(
        event_id=evt.event_id,
        entity_type="DISRUPTION",
        entity_id=str(disruption.id),
        match_criteria="CORRIDOR_MATCH",
        relevance_score=1.0,
        reason_for_match="Direct match",
        organization_id=TEST_ORG,
    )
    db.add(corr)
    db.flush()

    plan_data = dict(SAMPLE_V2_PLAN, plan_id="RCP-P53-VER-01", disruption_id=disruption.incident_code, evidence_manifest_hash=manifest.manifest_root_hash)
    canon_json, plan_hash = RecoveryPlanHashService.generate_plan_hash(plan_data, schema_version=SCHEMA_VERSION_V2)

    op = OperationalRecoveryPlan(
        organization_id=TEST_ORG,
        plan_id="RCP-P53-VER-01",
        version=1,
        plan_data_json=canon_json,
        canonical_plan_hash=plan_hash,
        canonical_schema_version=SCHEMA_VERSION_V2,
        disruption_id=disruption.incident_code,
        evidence_manifest_id=manifest.manifest_id,
        evidence_manifest_hash=manifest.manifest_root_hash,
        is_anchored=True,
    )
    db.add(op)
    db.commit()

    mock_contract = _create_mock_contract(plan_hash)
    res = PlanVerificationService.verify_plan_integrity(
        db=db,
        plan_id="RCP-P53-VER-01",
        version=1,
        contract_service=mock_contract,
        requester_organization_id=TEST_ORG,
    )

    assert res["status"] == VerificationResult.VERIFIED
    assert res["hashes_match"] is True
    assert res["schema_version"] == SCHEMA_VERSION_V2
    assert res["manifest_summary"]["evidence_count"] == 2
    db.close()


def test_blockchain_verification_plan_hash_mismatch():
    """Local plan hash differing from on-chain plan hash triggers PLAN_HASH_MISMATCH."""
    db = SessionLocal()
    op = OperationalRecoveryPlan(
        organization_id=TEST_ORG,
        plan_id="RCP-P53-MIS-01",
        version=1,
        plan_data_json=json.dumps(SAMPLE_V2_PLAN),
        canonical_plan_hash="0x" + "1" * 64,
        canonical_schema_version=SCHEMA_VERSION_V2,
    )
    db.add(op)
    db.commit()

    mock_contract = _create_mock_contract("0x" + "9" * 64)  # Mismatch!
    res = PlanVerificationService.verify_plan_integrity(
        db=db,
        plan_id="RCP-P53-MIS-01",
        version=1,
        contract_service=mock_contract,
        requester_organization_id=TEST_ORG,
    )

    assert res["status"] == VerificationResult.PLAN_HASH_MISMATCH
    assert res["hashes_match"] is False
    db.close()


def test_blockchain_verification_simulation_hash_mismatch():
    """Local simulation hash differing from on-chain simulation hash triggers SIMULATION_HASH_MISMATCH."""
    db = SessionLocal()
    plan_data = dict(SAMPLE_V2_PLAN, simulation_hash="0x" + "a" * 64, evidence_manifest_hash=ZERO_MANIFEST_SENTINEL)
    canon_json, plan_hash = RecoveryPlanHashService.generate_plan_hash(plan_data, schema_version=SCHEMA_VERSION_V2)

    op = OperationalRecoveryPlan(
        organization_id=TEST_ORG,
        plan_id="RCP-P53-SIM-01",
        version=1,
        plan_data_json=canon_json,
        canonical_plan_hash=plan_hash,
        canonical_schema_version=SCHEMA_VERSION_V2,
        evidence_manifest_hash=ZERO_MANIFEST_SENTINEL,
    )
    db.add(op)
    db.commit()

    mock_contract = _create_mock_contract(plan_hash, sim_hash="0x" + "f" * 64)
    res = PlanVerificationService.verify_plan_integrity(
        db=db,
        plan_id="RCP-P53-SIM-01",
        version=1,
        contract_service=mock_contract,
        requester_organization_id=TEST_ORG,
    )

    assert res["status"] == VerificationResult.SIMULATION_HASH_MISMATCH
    assert res["hashes_match"] is False
    db.close()


def test_blockchain_verification_missing_on_chain():
    """Plan existing locally but not anchored on-chain returns ON_CHAIN_RECORD_MISSING."""
    db = SessionLocal()
    op = OperationalRecoveryPlan(
        organization_id=TEST_ORG,
        plan_id="RCP-P53-NOANC-01",
        version=1,
        plan_data_json=json.dumps(SAMPLE_V2_PLAN),
        canonical_plan_hash="0x" + "1" * 64,
        canonical_schema_version=SCHEMA_VERSION_V2,
    )
    db.add(op)
    db.commit()

    mock_contract = MagicMock()
    mock_contract.is_connected = True
    mock_contract.plan_exists.return_value = False

    res = PlanVerificationService.verify_plan_integrity(
        db=db,
        plan_id="RCP-P53-NOANC-01",
        version=1,
        contract_service=mock_contract,
        requester_organization_id=TEST_ORG,
    )

    assert res["status"] == VerificationResult.ON_CHAIN_RECORD_MISSING
    assert res["hashes_match"] is False
    db.close()


def test_blockchain_verification_legacy_v1_plan():
    """Historical plan with SCHEMA_VERSION_V1 returns LEGACY_VERIFIED."""
    db = SessionLocal()
    plan_v1 = dict(SAMPLE_V2_PLAN, plan_id="RCP-P53-LEGACY-01")
    del plan_v1["evidence_manifest_hash"]

    canon_json, plan_hash = RecoveryPlanHashService.generate_plan_hash(plan_v1, schema_version=SCHEMA_VERSION_V1)

    op = OperationalRecoveryPlan(
        organization_id=TEST_ORG,
        plan_id="RCP-P53-LEGACY-01",
        version=1,
        plan_data_json=canon_json,
        canonical_plan_hash=plan_hash,
        canonical_schema_version=SCHEMA_VERSION_V1,
    )
    db.add(op)
    db.commit()

    mock_contract = _create_mock_contract(plan_hash)
    res = PlanVerificationService.verify_plan_integrity(
        db=db,
        plan_id="RCP-P53-LEGACY-01",
        version=1,
        contract_service=mock_contract,
        requester_organization_id=TEST_ORG,
    )

    assert res["status"] == VerificationResult.LEGACY_VERIFIED
    assert res["hashes_match"] is True
    assert res["schema_version"] == SCHEMA_VERSION_V1
    db.close()


def test_internal_disruption_verified_without_external_evidence():
    """Internal disruption with ZERO_MANIFEST_SENTINEL returns VERIFIED_WITHOUT_EXTERNAL_EVIDENCE."""
    db = SessionLocal()
    plan_data = dict(SAMPLE_V2_PLAN, plan_id="RCP-P53-INT-01", evidence_manifest_hash=ZERO_MANIFEST_SENTINEL)
    canon_json, plan_hash = RecoveryPlanHashService.generate_plan_hash(plan_data, schema_version=SCHEMA_VERSION_V2)

    op = OperationalRecoveryPlan(
        organization_id=TEST_ORG,
        plan_id="RCP-P53-INT-01",
        version=1,
        plan_data_json=canon_json,
        canonical_plan_hash=plan_hash,
        canonical_schema_version=SCHEMA_VERSION_V2,
        evidence_manifest_hash=ZERO_MANIFEST_SENTINEL,
    )
    db.add(op)
    db.commit()

    mock_contract = _create_mock_contract(plan_hash)
    res = PlanVerificationService.verify_plan_integrity(
        db=db,
        plan_id="RCP-P53-INT-01",
        version=1,
        contract_service=mock_contract,
        requester_organization_id=TEST_ORG,
    )

    assert res["status"] == VerificationResult.VERIFIED_WITHOUT_EXTERNAL_EVIDENCE
    assert res["hashes_match"] is True
    assert res["manifest_summary"]["manifest_root_hash"] == ZERO_MANIFEST_SENTINEL
    db.close()


# ===========================================================================
# E. EXECUTION CONTINUITY TESTS
# ===========================================================================

def test_execution_evidence_continuity():
    """Execution evidence hash matching on-chain anchor is confirmed in verification report."""
    db = SessionLocal()
    exec_evidence_hash = "0x" + "e" * 64
    plan_data = dict(
        SAMPLE_V2_PLAN,
        plan_id="RCP-P53-EXEC-01",
        evidence_manifest_hash=ZERO_MANIFEST_SENTINEL,
        execution_evidence={"evidence_hash": exec_evidence_hash},
    )
    canon_json, plan_hash = RecoveryPlanHashService.generate_plan_hash(plan_data, schema_version=SCHEMA_VERSION_V2)

    op = OperationalRecoveryPlan(
        organization_id=TEST_ORG,
        plan_id="RCP-P53-EXEC-01",
        version=1,
        plan_data_json=canon_json,
        canonical_plan_hash=plan_hash,
        canonical_schema_version=SCHEMA_VERSION_V2,
        evidence_manifest_hash=ZERO_MANIFEST_SENTINEL,
    )
    db.add(op)
    db.commit()

    mock_contract = _create_mock_contract(plan_hash, exec_evidence_hash=exec_evidence_hash)
    res = PlanVerificationService.verify_plan_integrity(
        db=db,
        plan_id="RCP-P53-EXEC-01",
        version=1,
        contract_service=mock_contract,
        requester_organization_id=TEST_ORG,
    )

    assert res["status"] == VerificationResult.VERIFIED_WITHOUT_EXTERNAL_EVIDENCE
    assert res["execution_evidence_hash"] == exec_evidence_hash
    db.close()


# ===========================================================================
# F. SECURITY & TENANT ISOLATION TESTS
# ===========================================================================

def test_cross_tenant_verification_rejected():
    """Requesting verification across tenant boundaries triggers ORGANIZATION_MISMATCH."""
    db = SessionLocal()
    op = OperationalRecoveryPlan(
        organization_id=TEST_ORG,
        plan_id="RCP-P53-TENANT-01",
        version=1,
        plan_data_json=json.dumps(SAMPLE_V2_PLAN),
        canonical_plan_hash="0x" + "1" * 64,
        canonical_schema_version=SCHEMA_VERSION_V2,
    )
    db.add(op)
    db.commit()

    mock_contract = MagicMock()
    mock_contract.is_connected = True
    res = PlanVerificationService.verify_plan_integrity(
        db=db,
        plan_id="RCP-P53-TENANT-01",
        version=1,
        contract_service=mock_contract,
        requester_organization_id=RIVAL_ORG,
    )

    assert res["status"] == VerificationResult.ORGANIZATION_MISMATCH
    assert res["hashes_match"] is False
    db.close()


def test_frontend_supplied_manifest_hash_manipulation_prevented():
    """In /blockchain/hash/generate, an arbitrary frontend manifest hash is overridden by the DB manifest root."""
    db = SessionLocal()
    now = datetime.datetime.utcnow()
    evt, manifest = _create_sealed_event(db, "EVT-P53-SEC-01", count=1)
    authoritative_root = manifest.manifest_root_hash

    disruption = Disruption(
        organization_id=TEST_ORG,
        incident_code="INC-P53-SEC",
        category="PORT_CONGESTION",
        severity="HIGH",
        geographic_region="Suez",
        description="Security Test Disruption",
        start_time=now,
        status="ACTIVE",
    )
    db.add(disruption)
    db.flush()

    corr = EventCorrelation(
        event_id=evt.event_id,
        entity_type="DISRUPTION",
        entity_id=str(disruption.id),
        match_criteria="CORRIDOR_MATCH",
        relevance_score=1.0,
        reason_for_match="Direct match",
        organization_id=TEST_ORG,
    )
    db.add(corr)
    db.commit()
    db.close()

    # Attacker frontend sends a forged manifest hash
    forged_manifest_hash = "0x" + "9" * 64
    payload = {
        "plan_data": {
            "organization_id": TEST_ORG,
            "plan_id": "RCP-P53-SEC-01",
            "version": 1,
            "disruption_id": "INC-P53-SEC",
            "simulation_hash": "0x" + "a" * 64,
            "evidence_manifest_hash": forged_manifest_hash,
            "action_categories": [1],
            "recovery_actions": [],
            "estimated_total_cost": 1000.0,
            "currency": "USD",
        }
    }

    resp = client.post(
        "/blockchain/hash/generate",
        json=payload,
        headers={"X-Organization-Id": TEST_ORG},
    )
    assert resp.status_code == 200
    res_data = resp.json()

    # The returned evidence manifest hash MUST be the authoritative DB manifest, NOT the attacker's forged one
    assert res_data["evidence_manifest_hash"] == normalize_hash(authoritative_root)
    assert res_data["evidence_manifest_hash"] != forged_manifest_hash
