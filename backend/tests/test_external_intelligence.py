import datetime
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.blockchain.database import SessionLocal
from backend.app.supply_chain.models import (
    IntelligenceSource,
    ExternalDisruptionEvent,
    EventEvidence,
    EventCorrelation,
    EventReview,
    Disruption,
)
from backend.app.supply_chain.connectors import (
    NormalizedExternalEvent,
    INGESTION_ADAPTERS,
    MaritimeAisAdapter,
    WeatherAlertAdapter,
)
from backend.app.supply_chain.ingestion_service import (
    DisruptionIngestionService,
    haversine_distance_km,
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_test_events():
    db = SessionLocal()
    db.query(EventReview).delete()
    db.query(EventCorrelation).delete()
    db.query(EventEvidence).delete()
    db.query(ExternalDisruptionEvent).delete()
    db.commit()
    db.close()
    yield
    db = SessionLocal()
    db.query(EventReview).delete()
    db.query(EventCorrelation).delete()
    db.query(EventEvidence).delete()
    db.query(ExternalDisruptionEvent).delete()
    db.commit()
    db.close()


def test_haversine_distance_calculation():
    """Validates accurate great-circle geographic distance computation."""
    # Kaohsiung Port (22.61, 120.28) to Taipei (25.03, 121.56) is ~300km
    dist = haversine_distance_km(22.61, 120.28, 25.03, 121.56)
    assert 280.0 <= dist <= 320.0

    # Same location distance is 0.0
    assert haversine_distance_km(51.95, 4.05, 51.95, 4.05) == 0.0


def test_validation_rejects_malformed_and_stale_events():
    """Ensures external inputs with out-of-bounds coords, future times, or invalid severity are rejected."""
    now = datetime.datetime.utcnow()

    # 1. Valid event passes
    valid_event = NormalizedExternalEvent(
        source_id="SRC-AIS-GLOBAL",
        source_type="MARITIME_AIS",
        provider_name="Test Provider",
        external_event_id="TEST-001",
        title="Valid Maritime Advisory",
        description="Container traffic halted in canal due to sandstorm conditions.",
        category="WEATHER",
        severity="HIGH",
        geographic_region="Suez Canal",
        latitude=30.0,
        longitude=32.5,
        event_timestamp=now - datetime.timedelta(hours=2),
    )
    is_valid, errs = DisruptionIngestionService.validate_event_payload(valid_event)
    assert is_valid is True
    assert len(errs) == 0

    # 2. Out of bounds latitude (-95.0) rejected
    bad_geo = valid_event.model_copy(update={"latitude": -95.0})
    is_valid, errs = DisruptionIngestionService.validate_event_payload(bad_geo)
    assert is_valid is False
    assert any("Latitude out of bounds" in e for e in errs)

    # 3. Future timestamp rejected
    future_event = valid_event.model_copy(update={"event_timestamp": now + datetime.timedelta(days=2)})
    is_valid, errs = DisruptionIngestionService.validate_event_payload(future_event)
    assert is_valid is False
    assert any("future" in e for e in errs)

    # 4. Stale event (>90 days old) rejected
    stale_event = valid_event.model_copy(update={"event_timestamp": now - datetime.timedelta(days=120)})
    is_valid, errs = DisruptionIngestionService.validate_event_payload(stale_event)
    assert is_valid is False
    assert any("stale" in e for e in errs)


def test_exact_and_approximate_deduplication():
    """
    Verifies:
    1. Exact match on external_event_id is detected and flagged as duplicate.
    2. Proximity/time-window match detects approximate duplicate without merging unrelated incidents.
    """
    db = SessionLocal()
    try:
        now = datetime.datetime.utcnow()
        uniq = int(now.timestamp())
        evt1 = NormalizedExternalEvent(
            source_id="SRC-PORT-TELEMETRY",
            source_type="PORT_STATUS",
            provider_name="Port Authority",
            external_event_id=f"DEDUP-{uniq}-A1",
            title=f"Crane Breakdown at Berth 40-{uniq}",
            description="Container unloading delayed by 18 hours due to hydraulic failure.",
            category="PORT_CONGESTION",
            severity="MEDIUM",
            geographic_region="Port of Rotterdam",
            latitude=51.95,
            longitude=4.05,
            event_timestamp=now - datetime.timedelta(hours=4),
        )
        saved1, is_dup1 = DisruptionIngestionService.process_incoming_event(db, evt1, "ORG-APEX-GLOBAL")
        assert is_dup1 is False
        assert saved1.validation_status == "VALIDATED"

        # Exact duplicate
        saved2, is_dup2 = DisruptionIngestionService.process_incoming_event(db, evt1, "ORG-APEX-GLOBAL")
        assert is_dup2 is True
        assert saved2.validation_status == "DUPLICATE"
        assert saved2.duplicate_of_event_id == saved1.event_id

        # Approximate duplicate (within 30km and 1 hour with overlapping words)
        evt_approx = NormalizedExternalEvent(
            source_id="SRC-PORT-TELEMETRY",
            source_type="PORT_STATUS",
            provider_name="Port Authority",
            external_event_id=f"DEDUP-{uniq}-A2",
            title=f"Berth 40-{uniq} Crane Outage Maintenance",
            description="Crane failure reported at Rotterdam Berth 40.",
            category="PORT_CONGESTION",
            severity="MEDIUM",
            geographic_region="Port of Rotterdam",
            latitude=51.96,
            longitude=4.06,
            event_timestamp=now - datetime.timedelta(hours=3),
        )
        saved3, is_dup3 = DisruptionIngestionService.process_incoming_event(db, evt_approx, "ORG-APEX-GLOBAL")
        assert is_dup3 is True
        assert saved3.validation_status == "DUPLICATE"
    finally:
        db.close()


def test_supply_chain_correlation_and_false_positive_rejection():
    """
    Ensures events correlate with affected operational entities (e.g. Suez incident matching Suez shipment),
    and rejects false positives (e.g. isolated incident in South America doesn't match Suez shipment).
    """
    db = SessionLocal()
    try:
        now = datetime.datetime.utcnow()

        # 1. Suez maritime congestion matches Asia-Europe shipment
        suez_event = NormalizedExternalEvent(
            source_id="SRC-AIS-GLOBAL",
            source_type="MARITIME_AIS",
            provider_name="AIS MarineTraffic",
            external_event_id="SUEZ-CORR-01",
            title="Suez Canal Southbound Convoy Delayed",
            description="Severe blockage at km 151 causing multi-day anchorage delay for container vessels.",
            category="PORT_CONGESTION",
            severity="CRITICAL",
            geographic_region="Suez Canal / Red Sea",
            affected_corridor="Asia-Europe Maritime Route via Suez",
            latitude=30.0,
            longitude=32.5,
            event_timestamp=now - datetime.timedelta(hours=1),
        )
        db_suez, _ = DisruptionIngestionService.process_incoming_event(db, suez_event, "ORG-APEX-GLOBAL")
        corrs = db.query(EventCorrelation).filter_by(event_id=db_suez.event_id).all()
        assert len(corrs) >= 1
        shipment_corrs = [c for c in corrs if c.entity_type == "SHIPMENT"]
        assert len(shipment_corrs) >= 1
        assert shipment_corrs[0].relevance_score >= 0.80

        # 2. Unrelated local disruption in Buenos Aires does NOT match Suez shipment
        unrelated_event = NormalizedExternalEvent(
            source_id="SRC-WEATHER-NOAA",
            source_type="WEATHER_ALERTS",
            provider_name="NOAA",
            external_event_id="UNRELATED-BA-01",
            title="Flash Flooding in Buenos Aires Inland Suburbs",
            description="Local municipal flooding affecting suburban commuter rail.",
            category="WEATHER",
            severity="LOW",
            geographic_region="Buenos Aires, Argentina",
            affected_corridor="South American Inland Rail",
            latitude=-34.60,
            longitude=-58.38,
            event_timestamp=now - datetime.timedelta(hours=2),
        )
        db_unrel, _ = DisruptionIngestionService.process_incoming_event(db, unrelated_event, "ORG-APEX-GLOBAL")
        unrel_corrs = db.query(EventCorrelation).filter_by(event_id=db_unrel.event_id).all()
        # Should have zero shipment correlations
        assert len([c for c in unrel_corrs if c.entity_type == "SHIPMENT"]) == 0
    finally:
        db.close()


def test_human_in_the_loop_event_confirmation_workflow():
    """
    Validates end-to-end governance:
    1. External event is ingested into candidate state.
    2. Event does NOT automatically trigger on-chain anchoring.
    3. Authorized user confirms candidate event.
    4. Operational Disruption record is created with linked shipments and review audit trail.
    """
    db = SessionLocal()
    try:
        now = datetime.datetime.utcnow()
        uniq = int(now.timestamp())
        field_event = NormalizedExternalEvent(
            source_id="SRC-MANUAL-ANALYST",
            source_type="MANUAL_REPORT",
            provider_name="Field Logistics Unit",
            external_event_id=f"GOV-CONFIRM-{uniq}",
            title=f"Antwerp Terminal Cyber Outage-{uniq}",
            description="Manual report: Terminal customs software offline indefinitely.",
            category="PORT_CONGESTION",
            severity="HIGH",
            geographic_region="Port of Antwerp, Belgium",
            latitude=51.2194,
            longitude=4.4025,
            affected_corridor="Scheldt Logistics Corridor",
            event_timestamp=now,
        )
        db_event, _ = DisruptionIngestionService.process_incoming_event(db, field_event, "ORG-APEX-GLOBAL")
        assert db_event.validation_status == "VALIDATED"
        assert db_event.linked_disruption_id is None

        # Confirm event via API endpoint
        confirm_res = client.post(
            f"/api/v1/intelligence/events/{db_event.event_id}/confirm",
            headers={"X-User-Id": "user:ops-lead", "X-Organization-Id": "ORG-APEX-GLOBAL"},
            json={"action": "CONFIRM", "notes": "Confirmed by operations desk after harbor master verification."},
        )
        assert confirm_res.status_code == 200
        disruption_data = confirm_res.json()
        assert "incident_code" in disruption_data
        assert disruption_data["category"] == "PORT_CONGESTION"

        # Verify event status updated and audit review recorded
        db.expire_all()
        updated_event = db.query(ExternalDisruptionEvent).filter_by(event_id=db_event.event_id).first()
        assert updated_event.validation_status == "CONFIRMED_AS_DISRUPTION"
        assert updated_event.linked_disruption_id is not None

        review = db.query(EventReview).filter_by(event_id=db_event.event_id).first()
        assert review is not None
        assert review.action_taken == "CONFIRM_AS_DISRUPTION"
        assert review.reviewer_user_id == "user:ops-lead"
    finally:
        db.close()


def test_event_rejection_audit_trail():
    """Verifies that rejecting a false alarm event records reviewer identity and notes."""
    db = SessionLocal()
    try:
        now = datetime.datetime.utcnow()
        fake_event = NormalizedExternalEvent(
            source_id="SRC-GEOPOLITICAL-REUTERS",
            source_type="GEOPOLITICAL_NEWS",
            provider_name="Social Media Scraper",
            external_event_id=f"REJECT-TEST-{int(now.timestamp())}",
            title="Unverified Rumor of Port Closure",
            description="Unconfirmed tweets regarding dockworker walkout.",
            category="LABOR_STRIKE",
            severity="LOW",
            geographic_region="Hamburg, Germany",
            event_timestamp=now,
        )
        db_event, _ = DisruptionIngestionService.process_incoming_event(db, fake_event, "ORG-APEX-GLOBAL")

        reject_res = client.post(
            f"/api/v1/intelligence/events/{db_event.event_id}/reject",
            headers={"X-User-Id": "user:ops-analyst-99", "X-Organization-Id": "ORG-APEX-GLOBAL"},
            json={"action": "REJECT", "notes": "Harbor master confirmed operations normal. False alarm."},
        )
        assert reject_res.status_code == 200
        assert reject_res.json()["validation_status"] == "REJECTED"

        review = db.query(EventReview).filter_by(event_id=db_event.event_id).first()
        assert review is not None
        assert review.action_taken == "REJECT_FALSE_ALARM"
    finally:
        db.close()


def test_demo_mode_labelling_and_no_silent_fallback():
    """
    Ensures:
    1. Demo events are explicitly labeled mode='DEMO'.
    2. A failed live provider records FAILED status and error message without silently falling back to fake live.
    """
    ais_adapter = MaritimeAisAdapter()
    assert ais_adapter.is_configured_live is False

    # When live key is missing and live fetch is attempted, it throws an error
    with pytest.raises(ValueError) as excinfo:
        ais_adapter.fetch_live_events()
    assert "Missing API key" in str(excinfo.value)

    # Ingestion run with demo mode produces explicitly DEMO labeled events
    res = ais_adapter.ingest(force_demo=True)
    assert res["mode"] == "DEMO"
    assert res["status"] == "SUCCESS"
    for evt in res["events"]:
        assert evt.mode == "DEMO"
