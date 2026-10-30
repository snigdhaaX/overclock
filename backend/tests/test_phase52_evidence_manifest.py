"""
TRUSTCHAIN — Milestone 6, Phase 5.2
Evidence Integrity Assurance & Canonical Hash Verification Test Suite

Tests:
1. Existing evidence content modification (CONTENT_TAMPERED)
2. Evidence deletion detection (EVIDENCE_MISSING)
3. Evidence reassignment to another event (ASSOCIATION_MISMATCH)
4. Evidence insertion after manifest creation (MANIFEST_MISMATCH)
5. Manifest modification tamper detection (MANIFEST_MISMATCH)
6. Empty evidence collections (INSUFFICIENT_INTEGRITY_PROOF)
7. Cross-language canonical hash consistency (Python jcs vs Node.js canonicalize)
8. Organisation isolation tenant boundary enforcement
9. End-to-end VALID verification lifecycle with proof semantics
10. API route integration test for GET /api/v1/intelligence/events/{event_id}/integrity
"""

import datetime
import hashlib
import json
import subprocess
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.blockchain.database import SessionLocal
from backend.app.supply_chain.models import (
    ExternalDisruptionEvent,
    EventEvidence,
    EventEvidenceManifest,
    EventReview,
    EventCorrelation,
)
from backend.app.supply_chain.connectors import NormalizedExternalEvent
from backend.app.supply_chain.ingestion_service import (
    DisruptionIngestionService,
    canonicalize_evidence_dict,
)
import jcs


client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_phase52_test_records():
    db = SessionLocal()
    try:
        test_evts = db.query(ExternalDisruptionEvent).filter(
            (ExternalDisruptionEvent.event_id.like("EVT-P52-%")) |
            (ExternalDisruptionEvent.external_event_id.like("TEST-P52-%"))
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
            (ExternalDisruptionEvent.event_id.like("EVT-P52-%")) |
            (ExternalDisruptionEvent.external_event_id.like("TEST-P52-%"))
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


def _create_test_event_with_evidences(db, event_id: str, count: int = 2, org_id: str = "ORG-APEX-GLOBAL"):
    now = datetime.datetime.utcnow()
    evt = ExternalDisruptionEvent(
        event_id=event_id,
        external_event_id=f"TEST-P52-{event_id}",
        source_id="SRC-AIS-GLOBAL",
        source_type="MARITIME_AIS",
        mode="LIVE",
        title=f"Test Event {event_id}",
        description="Event description for manifest tests.",
        category="MARITIME_INCIDENT",
        severity="HIGH",
        geographic_region="Bab el-Mandeb",
        event_timestamp=now,
    )
    db.add(evt)
    db.flush()

    for i in range(count):
        summary = f"Evidence item {i+1} for event {event_id}"
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


def test_existing_evidence_content_modification():
    """Modifying evidence summary or payload directly in SQLite must be detected as CONTENT_TAMPERED."""
    db = SessionLocal()
    event_id = "EVT-P52-MOD-01"
    evt, manifest = _create_test_event_with_evidences(db, event_id, count=2)

    # 1. Verification of untouched event must pass
    res_clean = DisruptionIngestionService.verify_event_integrity(db, event_id, "ORG-APEX-GLOBAL")
    assert res_clean["is_valid"] is True
    assert res_clean["status"] == "VALID"

    # 2. Tamper with the evidence summary directly
    ev1 = db.query(EventEvidence).filter_by(event_id=event_id).first()
    ev1.summary = "UNAUTHORIZED ALTERATION: Vessel is proceeding normally."
    db.commit()

    # 3. Verification must flag CONTENT_TAMPERED
    res_tampered = DisruptionIngestionService.verify_event_integrity(db, event_id, "ORG-APEX-GLOBAL")
    assert res_tampered["is_valid"] is False
    assert res_tampered["status"] == "CONTENT_TAMPERED"
    assert "Evidence id" in res_tampered["proves"]
    assert "cannot_prove" in res_tampered
    db.close()


def test_evidence_deletion_detection():
    """Deleting an evidence row from the database must be detected as EVIDENCE_MISSING against the manifest."""
    db = SessionLocal()
    event_id = "EVT-P52-DEL-01"
    evt, manifest = _create_test_event_with_evidences(db, event_id, count=3)
    assert manifest.evidence_count == 3

    # Delete 1 evidence record directly from SQLite
    ev_to_delete = db.query(EventEvidence).filter_by(event_id=event_id).first()
    db.delete(ev_to_delete)
    db.commit()

    # Verification must catch missing evidence
    res = DisruptionIngestionService.verify_event_integrity(db, event_id, "ORG-APEX-GLOBAL")
    assert res["is_valid"] is False
    assert res["status"] == "EVIDENCE_MISSING"
    assert res["expected_evidence_count"] == 3
    assert res["evidence_count"] == 2
    assert "deletion detected" in res["proves"].lower()
    assert "Cannot recover" in res["cannot_prove"]
    db.close()


def test_evidence_reassignment_association_mismatch():
    """Reassigning an evidence row from Event A to Event B must be detected as ASSOCIATION_MISMATCH."""
    db = SessionLocal()
    evt_a, _ = _create_test_event_with_evidences(db, "EVT-P52-ASSC-A", count=1)
    evt_b, _ = _create_test_event_with_evidences(db, "EVT-P52-ASSC-B", count=1)

    # Move Evidence A to Event B's event_id in SQLite
    ev_a = db.query(EventEvidence).filter_by(event_id="EVT-P52-ASSC-A").first()
    ev_a.event_id = "EVT-P52-ASSC-B"
    db.commit()

    # Re-seal Event B so count matches, but canonical payload inside ev_a still says EVT-P52-ASSC-A
    DisruptionIngestionService.seal_evidence_manifest(db, "EVT-P52-ASSC-B", "ORG-APEX-GLOBAL")
    db.commit()

    res = DisruptionIngestionService.verify_event_integrity(db, "EVT-P52-ASSC-B", "ORG-APEX-GLOBAL")
    assert res["is_valid"] is False
    assert res["status"] == "ASSOCIATION_MISMATCH"
    assert "association fraud" in res["proves"].lower()
    assert "EVT-P52-ASSC-A" in res["details"]
    db.close()


def test_evidence_insertion_after_manifest_creation():
    """Inserting an uncommitted evidence row after manifest sealing must be detected as MANIFEST_MISMATCH."""
    db = SessionLocal()
    event_id = "EVT-P52-INJECT-01"
    evt, manifest = _create_test_event_with_evidences(db, event_id, count=1)
    assert manifest.evidence_count == 1

    # Inject unauthorized evidence record without re-sealing manifest
    now = datetime.datetime.utcnow()
    bogus_dict = {
        "event_id": event_id,
        "evidence_type": "NEWS_ARTICLE",
        "summary": "Injected unauthorized evidence item.",
        "source_id": "SRC-AIS-GLOBAL",
        "source_event_timestamp": now.isoformat(),
        "captured_at": now.isoformat(),
    }
    bogus_json = canonicalize_evidence_dict(bogus_dict)
    bogus_hash = hashlib.sha256(bogus_json.encode("utf-8")).hexdigest()

    bogus_ev = EventEvidence(
        event_id=event_id,
        evidence_type="NEWS_ARTICLE",
        summary="Injected unauthorized evidence item.",
        hash_sha256=bogus_hash,
        canonical_payload_json=bogus_json,
        source_id="SRC-AIS-GLOBAL",
        source_event_timestamp=now,
        integrity_status="VERIFIED",
        captured_at=now,
    )
    db.add(bogus_ev)
    db.commit()

    res = DisruptionIngestionService.verify_event_integrity(db, event_id, "ORG-APEX-GLOBAL")
    assert res["is_valid"] is False
    assert res["status"] == "MANIFEST_MISMATCH"
    assert "Uncommitted evidence detected" in res["proves"]
    db.close()


def test_manifest_modification_tamper_detection():
    """Altering the manifest JSON payload in the database must be detected as MANIFEST_MISMATCH."""
    db = SessionLocal()
    event_id = "EVT-P52-MANIF-01"
    evt, manifest = _create_test_event_with_evidences(db, event_id, count=2)

    # Tamper with the manifest JSON
    manifest.manifest_canonical_json = manifest.manifest_canonical_json.replace("trustchain-evidence-manifest-v1", "forged-manifest-v9")
    db.commit()

    res = DisruptionIngestionService.verify_event_integrity(db, event_id, "ORG-APEX-GLOBAL")
    assert res["is_valid"] is False
    assert res["status"] == "MANIFEST_MISMATCH"
    assert "tampered with" in res["proves"].lower()
    db.close()


def test_empty_evidence_collections():
    """An event with no evidence or unsealed manifest returns INSUFFICIENT_INTEGRITY_PROOF."""
    db = SessionLocal()
    event_id = "EVT-P52-EMPTY-01"
    now = datetime.datetime.utcnow()
    evt = ExternalDisruptionEvent(
        event_id=event_id,
        external_event_id=f"TEST-P52-{event_id}",
        source_id="SRC-WEATHER-NOAA",
        source_type="WEATHER_ALERTS",
        mode="DEMO",
        title="Uncorroborated Alert",
        description="No telemetry attached.",
        category="WEATHER",
        severity="LOW",
        geographic_region="Atlantic",
        event_timestamp=now,
    )
    db.add(evt)
    db.commit()

    res = DisruptionIngestionService.verify_event_integrity(db, event_id, "ORG-APEX-GLOBAL")
    assert res["is_valid"] is False
    assert res["status"] == "INSUFFICIENT_INTEGRITY_PROOF"
    assert "lacks a sealed cryptographic manifest" in res["proves"]
    db.close()


def test_cross_language_canonical_hash_consistency():
    """Python jcs and TypeScript/Node canonicalize must yield the exact same RFC 8785 canonical bytes and SHA-256."""
    complex_data = {
        "keys_order": {"z": 99, "b": 2, "a": 1, "A": 3, "1": 4},
        "numbers": [0, -0.0, 1.0, 1e20, 1e21, 1e-6, 1e-7],
        "strings": [
            "Hello World",
            'Quotes: "Backslash: \\',
            "\t\r\n",
            "Unicode Accents: café, résumé",
            "Currency: €500",
            "Astral Emoji: 🚀🚢",
        ],
        "nested": {
            "active": True,
            "nullable": None,
            "arr": [3, 2, 1],
        },
    }

    # Python canonicalization using jcs
    python_bytes = jcs.canonicalize(complex_data)
    python_canonical_str = python_bytes.decode("utf-8")
    python_hash = hashlib.sha256(python_bytes).hexdigest()

    # Node.js canonicalization using Samuel Erdtman's 'canonicalize' library (RFC 8785 standard)
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
        const hash = crypto.createHash('sha256').update(canon, 'utf8').digest('hex');
        console.log(JSON.stringify({ canon: canon, hash: hash }));
    });
    """

    node_process = subprocess.Popen(
        ["node", "-e", node_code],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=str(__import__("pathlib").Path(__file__).resolve().parents[2] / "blockchain"),
    )
    stdout, stderr = node_process.communicate(input=json.dumps(complex_data).encode("utf-8"))
    assert node_process.returncode == 0, f"Node script failed: {stderr.decode('utf-8')}"

    node_out = json.loads(stdout.decode("utf-8").strip())
    node_canonical_str = node_out["canon"]
    node_hash = node_out["hash"]

    # Verify exact bit-for-bit equivalence
    assert python_canonical_str == node_canonical_str, "Canonical JSON string mismatch between Python and TypeScript!"
    assert python_hash == node_hash, "SHA-256 digest mismatch between Python and TypeScript!"
    assert len(python_hash) == 64


def test_organization_isolation_tenant_boundary():
    """Accessing or verifying an event across tenant boundary must be detected and rejected."""
    db = SessionLocal()
    event_id = "EVT-P52-ISOL-01"
    evt, manifest = _create_test_event_with_evidences(db, event_id, count=2, org_id="ORG-APEX-GLOBAL")

    # Verification requested by unauthorized organization
    res = DisruptionIngestionService.verify_event_integrity(db, event_id, organization_id="ORG-RIVAL-CORP")
    assert res["is_valid"] is False
    assert res["status"] == "ASSOCIATION_MISMATCH"
    assert "Tenant boundary violation" in res["proves"]
    db.close()


def test_api_endpoint_integrity_verification():
    """GET /api/v1/intelligence/events/{event_id}/integrity returns structured 6-state response schema."""
    db = SessionLocal()
    event_id = "EVT-P52-API-01"
    _create_test_event_with_evidences(db, event_id, count=2, org_id="ORG-APEX-GLOBAL")
    db.close()

    resp = client.get(
        f"/api/v1/intelligence/events/{event_id}/integrity",
        headers={"X-Organization-Id": "ORG-APEX-GLOBAL"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["is_valid"] is True
    assert data["status"] == "VALID"
    assert data["event_id"] == event_id
    assert data["evidence_count"] == 2
    assert data["manifest_root_hash"] is not None
    assert "Complete evidence integrity verified" in data["proves"]
    assert "Does not prove physical reality" in data["cannot_prove"]
    assert len(data["evidence_results"]) == 2
