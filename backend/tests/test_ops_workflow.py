"""The demo path end to end through the API, including the attempts that must fail."""
import datetime
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from backend.app.blockchain.database import Base, get_db
from backend.app.main import app
from backend.app.models.inventory import Inventory
from backend.app.models.supply_chain import Warehouse
from backend.app.ops import seed as seed_module

WEBHOOK = {"X-Webhook-Secret": "demo-carrier-secret"}
ANALYST = "analyst@trustchain.com"
MANAGER = "manager@trustchain.com"
WAREHOUSE = "warehouse@trustchain.com"


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("TRUSTCHAIN_RISK_MODEL_DIR", str(tmp_path))
    for name in ("TRUSTCHAIN_KEY_ANALYST", "TRUSTCHAIN_KEY_MANAGER"):
        monkeypatch.delenv(name, raising=False)
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    event.listen(engine, "connect", lambda conn, _: conn.execute("PRAGMA foreign_keys=ON"))
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    seed_module.seed(session, train_model=False)
    app.dependency_overrides[get_db] = lambda: session
    test_client = TestClient(app)
    test_client.db = session
    yield test_client
    app.dependency_overrides.pop(get_db, None)
    session.close()


def login(client, email, password="password123"):
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['tokens']['accessToken']}"}


def delay(client, hours=96, event_id=None, when=None):
    return client.post("/api/v1/webhooks/carriers/simulated", headers=WEBHOOK, json={
        "event_id": event_id or uuid.uuid4().hex, "carrier": "FastTrack", "shipment_id": "SHP-101", "event_type": "SHIPMENT_DELAYED",
        "event_timestamp": (when or datetime.datetime.now(datetime.timezone.utc)).isoformat(), "estimated_delay_hours": hours, "reason": "Port congestion",
    })


def boot(client, headers):
    response = client.get("/api/v1/app/bootstrap", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def test_login_rejects_bad_password_wrong_role_and_missing_token(client):
    assert client.post("/api/v1/auth/login", json={"email": ANALYST, "password": "wrong-password"}).status_code == 401
    assert client.post("/api/v1/auth/login", json={"email": ANALYST, "password": "password123", "requested_role": "administrator"}).status_code == 403
    assert client.get("/api/v1/app/bootstrap").status_code == 401
    assert client.get("/api/v1/app/bootstrap", headers={"Authorization": "Bearer nonsense"}).status_code == 401


def test_refresh_token_rotates_and_logout_revokes(client):
    tokens = client.post("/api/v1/auth/login", json={"email": ANALYST, "password": "password123"}).json()["tokens"]
    refreshed = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refreshToken"]})
    assert refreshed.status_code == 200
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refreshToken"]}).status_code == 401
    new = refreshed.json()["tokens"]["refreshToken"]
    client.post("/api/v1/auth/logout", json={"refresh_token": new})
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": new}).status_code == 401


def test_webhook_needs_the_secret(client):
    response = client.post("/api/v1/webhooks/carriers/simulated", headers={"X-Webhook-Secret": "wrong"}, json={
        "event_id": "E1", "carrier": "C", "shipment_id": "SHP-101", "event_type": "SHIPMENT_DELAYED", "event_timestamp": "2026-10-31T00:00:00Z",
    })
    assert response.status_code == 401


def test_invalid_and_unknown_events_are_rejected(client):
    bad = client.post("/api/v1/webhooks/carriers/simulated", headers=WEBHOOK, json={
        "event_id": "E1", "carrier": "C", "shipment_id": "SHP-101", "event_type": "NOPE", "event_timestamp": "2026-10-31T00:00:00Z",
    })
    assert bad.status_code == 422
    missing = client.post("/api/v1/webhooks/carriers/simulated", headers=WEBHOOK, json={
        "event_id": "E2", "carrier": "C", "shipment_id": "SHP-999", "event_type": "SHIPMENT_DELAYED", "event_timestamp": "2026-10-31T00:00:00Z",
    })
    assert missing.status_code == 404


def test_duplicate_event_changes_nothing_and_old_event_cant_overwrite(client):
    headers = login(client, ANALYST)
    assert delay(client, event_id="DUP-1").json()["status"] == "PROCESSED"
    before = boot(client, headers)
    assert delay(client, event_id="DUP-1").json()["status"] == "DUPLICATE"
    after = boot(client, headers)
    assert len(after["orders"]) == len(before["orders"])
    old = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=3)
    assert delay(client, hours=1, when=old).json()["status"] == "OUT_OF_ORDER"
    assert boot(client, headers)["disruptions"][0]["estimatedDelay"] == before["disruptions"][0]["estimatedDelay"]


def test_only_orders_really_affected_are_flagged(client):
    headers = login(client, ANALYST)
    delay(client)
    ids = {o["id"] for o in boot(client, headers)["orders"]}
    assert {"ORD-445", "ORD-446", "ORD-447", "ORD-448"} <= ids
    assert "ORD-449" not in ids  # deadline is far beyond the new arrival
    assert "ORD-450" not in ids  # covered by stock


def test_recommendations_exclude_reserved_stock_and_explain_rejections(client):
    headers = login(client, ANALYST)
    delay(client)
    plans = boot(client, headers)["recoveryPlans"]
    transfer = next(p for p in plans if p["id"].endswith("transfer"))
    moved = sum(float(a["unitsOrScope"].split()[0]) for a in transfer["actions"])
    # Bangalore has 900 on hand, but only 500 free. Delhi has 10 free.
    assert moved <= 510
    assert any("short" in n or "can't be covered" in n for n in transfer["constraints"])
    supplier = next(p for p in plans if p["id"].endswith("supplier"))
    assert any("lead time" in n for n in supplier["constraints"])


def test_full_path_from_delay_to_execution_with_failures_blocked(client):
    analyst, manager, operator = login(client, ANALYST), login(client, MANAGER), login(client, WAREHOUSE)
    delay(client)
    plan_id = next(p["id"] for p in boot(client, analyst)["recoveryPlans"] if p["id"].endswith("transfer"))

    assert client.post(f"/api/v1/recovery/plans/{plan_id}/submit", headers=operator).status_code == 403
    submitted = client.post(f"/api/v1/recovery/plans/{plan_id}/submit", headers=analyst)
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["plan_hash"].startswith("0x")
    assert client.post(f"/api/v1/recovery/plans/{plan_id}/submit", headers=analyst).status_code == 409

    selfie = client.post(f"/api/v1/approvals/{plan_id}/approve", headers=analyst, json={})
    assert selfie.status_code == 403
    assert selfie.json()["detail"]["code"] == "CREATOR_CANNOT_DECIDE"
    assert client.post(f"/api/v1/approvals/{plan_id}/approve", headers=operator, json={}).status_code == 403
    assert client.post(f"/api/v1/execution/{plan_id}/confirm", headers=manager).status_code == 409

    assert client.post(f"/api/v1/approvals/{plan_id}/approve", headers=manager, json={"comments": "OK"}).json()["status"] == "APPROVED"
    assert client.post(f"/api/v1/approvals/{plan_id}/approve", headers=manager, json={}).status_code == 409

    db = client.db
    blr = db.query(Warehouse).filter_by(code="WH-BLR").first()
    before = float(db.query(Inventory).filter_by(warehouse_id=blr.id).first().on_hand_quantity)
    assert client.post(f"/api/v1/execution/{plan_id}/confirm", headers=manager).json()["status"] == "COMPLETED"
    db.expire_all()
    assert float(db.query(Inventory).filter_by(warehouse_id=blr.id).first().on_hand_quantity) < before

    state = boot(client, analyst)
    plan = next(p for p in state["recoveryPlans"] if p["id"] == plan_id)
    assert plan["status"] == "Completed"
    assert state["execution"]["status"] == "Completed"
    assert any(n["title"].startswith("SHP-101") for n in state["notifications"])
    assert client.get("/api/v1/audit/verify", headers=manager).json()["valid"] is True

    # With no chain configured the app must never be told it's verified.
    assert not any(e["verificationStatus"] == "verified" for e in state["auditEvents"])
    assert client.get(f"/api/v1/blockchain/verify/plan/{plan_id}", headers=manager).json()["result"] == "NOT_ANCHORED"


def test_rejection_needs_a_reason_and_revision_allows_a_new_version(client):
    analyst, manager = login(client, ANALYST), login(client, MANAGER)
    delay(client)
    plan_id = next(p["id"] for p in boot(client, analyst)["recoveryPlans"] if p["id"].endswith("transfer"))
    client.post(f"/api/v1/recovery/plans/{plan_id}/submit", headers=analyst)
    assert client.post(f"/api/v1/approvals/{plan_id}/reject", headers=manager, json={}).status_code == 422
    assert client.post(f"/api/v1/approvals/{plan_id}/request-revision", headers=manager, json={"comments": "Cut cost"}).json()["status"] == "REVISION_REQUIRED"
    again = client.post(f"/api/v1/recovery/plans/{plan_id}/submit", headers=analyst)
    assert again.status_code == 200
    assert again.json()["version"] == 2


def test_changing_a_stored_plan_is_detected(client):
    from backend.app.models.recovery import RecoveryPlanAction
    analyst, manager = login(client, ANALYST), login(client, MANAGER)
    delay(client)
    plan_id = next(p["id"] for p in boot(client, analyst)["recoveryPlans"] if p["id"].endswith("transfer"))
    client.post(f"/api/v1/recovery/plans/{plan_id}/submit", headers=analyst)
    action = client.db.query(RecoveryPlanAction).first()
    action.parameters = {**action.parameters, "quantity": action.parameters["quantity"] + 1}
    client.db.commit()
    assert client.get(f"/api/v1/blockchain/verify/plan/{plan_id}", headers=manager).json()["result"] == "HASH_MISMATCH"


def test_arrival_records_real_outcomes_for_future_training(client):
    from backend.app.risk.models import RiskExposure
    delay(client)
    arrival = client.post("/api/v1/webhooks/carriers/simulated", headers=WEBHOOK, json={
        "event_id": "ARR-1", "carrier": "FastTrack", "shipment_id": "SHP-101", "event_type": "SHIPMENT_ARRIVED",
        "event_timestamp": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=5)).isoformat(),
    })
    assert arrival.json()["status"] == "PROCESSED"
    recorded = client.db.query(RiskExposure).filter(RiskExposure.data_source == "operational", RiskExposure.missed_deadline.isnot(None)).count()
    assert recorded >= 4
