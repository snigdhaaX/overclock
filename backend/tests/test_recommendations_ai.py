"""Recovery rules on real tables, and AI output that must never reach users unless it checks out."""
import json
import uuid
import datetime
import pytest
import requests
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from backend.app.blockchain.database import Base, get_db
from backend.app.blockchain.database import create_all_tables, drop_all_tables
from backend.app.main import app
from backend.app.models.governance import AuditEvent
from backend.app.models.intelligence import Disruption
from backend.app.models.supply_chain import Shipment
from backend.app.ops import engine as ops_engine, seed as seed_module
from backend.app.recommendations import ai
from backend.app.recommendations import engine as recs
from backend.app.recommendations.policy import DEFAULT_POLICY
from backend.app.risk.models import RiskExposure

WEBHOOK = {"X-Webhook-Secret": "demo-carrier-secret"}
FAKE_KEY = "test-key-not-real"


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("TRUSTCHAIN_RISK_MODEL_DIR", str(tmp_path))
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    for name in ("TRUSTCHAIN_KEY_ANALYST", "TRUSTCHAIN_KEY_MANAGER"):
        monkeypatch.delenv(name, raising=False)
    ai.clear_cache()
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    event.listen(engine, "connect", lambda conn, _: conn.execute("PRAGMA foreign_keys=ON"))
    create_all_tables(engine)
    session = sessionmaker(bind=engine)()
    seed_module.seed(session, train_model=False)
    app.dependency_overrides[get_db] = lambda: session
    test_client = TestClient(app)
    test_client.db = session
    yield test_client
    app.dependency_overrides.pop(get_db, None)
    session.close()


def login(client, email="analyst@trustchain.com"):
    token = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"}).json()["tokens"]["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def delay(client, shipment="SHP-101", hours=96):
    response = client.post("/api/v1/webhooks/carriers/simulated", headers=WEBHOOK, json={
        "event_id": uuid.uuid4().hex, "carrier": "FastTrack", "shipment_id": shipment, "event_type": "SHIPMENT_DELAYED",
        "event_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(), "estimated_delay_hours": hours, "reason": "Port congestion",
    })
    assert response.status_code == 200, response.text


def options(client, shipment="SHP-101"):
    db = client.db
    org = db.query(seed_module.Organization).filter_by(slug=seed_module.ORG_SLUG).one()
    disruption = db.query(Disruption).filter_by(code=shipment).one()
    return ops_engine.build_candidates(db, org, disruption), org, disruption


def history(client, supplier, misses, total=20):
    now = datetime.datetime(2026, 1, 1)
    for i in range(total):
        client.db.add(RiskExposure(
            organization_id=seed_module.ORG_SLUG, exposure_id=f"H-{supplier}-{i}", supplier_id=supplier, carrier_id="CAR-01", snapshot_at=now, hours_to_deadline=1,
            required_qty=1, shortage_qty=0, reported_delay_hours=0, priority_tier=3, missed_deadline=int(i < misses), outcome_at=now, data_source="synthetic",
        ))
    client.db.commit()


# --- Rules on real tables ---

def test_transfer_uses_free_stock_from_the_nearest_lane_only(client):
    delay(client)
    candidates, _, _ = options(client)
    transfer = next(c for c in candidates if c["key"].endswith("transfer"))
    assert sum(a["quantity"] for a in transfer["actions"]) == 500  # Bangalore's free stock, not its 900 on hand
    assert {a["source"] for a in transfer["actions"]} == {"WH-BLR"}
    assert any("WH-DEL" in n and "free" in n for n in transfer["notes"])


def test_transfer_cost_comes_from_the_lane(client):
    delay(client)
    candidates, _, _ = options(client)
    transfer = next(c for c in candidates if c["key"].endswith("transfer"))
    assert transfer["cost"] == 500 * 2.0


def test_switch_needs_a_real_track_record(client):
    delay(client)
    candidates, _, _ = options(client)
    switch = next(c for c in candidates if c["key"].endswith("supplier"))
    assert not switch["feasible"]
    assert any("not enough delivery history" in n for n in switch["notes"])


def test_switch_compares_late_rates_and_requires_the_margin(client):
    history(client, "SUP-003", misses=8)  # current supplier: late 40%
    history(client, "SUP-008", misses=7)  # only 5 points better
    delay(client)
    candidates, _, _ = options(client)
    switch = next(c for c in candidates if c["key"].endswith("supplier"))
    assert not switch["feasible"]
    assert any("not enough better" in n for n in switch["notes"])


def test_switch_goes_ahead_when_clearly_better_and_respects_capacity(client):
    history(client, "SUP-003", misses=10)
    history(client, "SUP-008", misses=2)
    delay(client)
    candidates, _, _ = options(client)
    switch = next(c for c in candidates if c["key"].endswith("supplier"))
    assert switch["feasible"]
    assert sum(a["quantity"] for a in switch["actions"]) <= 900
    assert any("capacity" in n for n in switch["notes"])


def test_reroute_only_when_route_risk_is_high_enough(client):
    delay(client)
    candidates, _, _ = options(client)
    assert next(c for c in candidates if c["key"].endswith("reroute"))["feasible"]
    delay(client, "SHP-125", 48)
    candidates, _, _ = options(client, "SHP-125")
    low = next(c for c in candidates if c["key"].endswith("reroute"))
    assert not low["feasible"]
    assert any("under the" in n for n in low["notes"])


def test_reroute_picks_the_first_route_with_acceptable_risk(client):
    delay(client)
    shipment = client.db.query(Shipment).filter_by(code="SHP-101").one()
    shipment.route_risk, shipment.weather_severity, shipment.customs_hours = 1.0, 1.0, 48.0
    client.db.commit()
    candidates, _, _ = options(client)
    reroute = next(c for c in candidates if c["key"].endswith("reroute"))
    assert "Southern" in reroute["actions"][0]["title"]  # risk 1.0: x0.7 is too high, x0.5 is acceptable


def test_missing_route_readings_are_reported_not_guessed(client):
    delay(client)
    shipment = client.db.query(Shipment).filter_by(code="SHP-101").one()
    shipment.route_risk = None
    client.db.commit()
    candidates, _, _ = options(client)
    assert any("missing" in n for n in next(c for c in candidates if c["key"].endswith("reroute"))["notes"])


def test_over_budget_plan_is_infeasible(client, monkeypatch):
    monkeypatch.setenv("TRUSTCHAIN_PLAN_BUDGET_LIMIT", "10")
    delay(client)
    candidates, _, _ = options(client)
    transfer = next(c for c in candidates if c["key"].endswith("transfer"))
    assert not transfer["feasible"]
    assert "budget" in transfer["notes"][0]


def test_low_probability_orders_are_monitored_not_actioned(client):
    delay(client)
    from backend.app.models.intelligence import RiskAssessment
    for risk in client.db.query(RiskAssessment).all():
        risk.miss_probability = 0.1
    client.db.commit()
    candidates, _, _ = options(client)
    assert candidates == []


def test_tiers_come_from_the_single_risk_score():
    assert recs.recovery_tier(DEFAULT_POLICY.p1_score) == "P1"
    assert recs.recovery_tier(DEFAULT_POLICY.p2_score) == "P2"
    assert recs.recovery_tier(0) == "P3"


def test_partly_covered_order_is_not_counted_or_cleared(client):
    analyst, manager = login(client), login(client, "manager@trustchain.com")
    delay(client)
    candidates, _, _ = options(client)
    transfer = next(c for c in candidates if c["key"].endswith("transfer"))
    assert transfer["orders_protected"] < len({code for a in transfer["actions"] for code in a["orders"]})
    plan = transfer["key"]
    client.post(f"/api/v1/recovery/plans/{plan}/submit", headers=analyst)
    client.post(f"/api/v1/approvals/{plan}/approve", headers=manager, json={})
    assert client.post(f"/api/v1/execution/{plan}/confirm", headers=manager).json()["status"] == "COMPLETED"
    client.db.expire_all()
    assert client.db.query(Disruption).filter_by(code="SHP-101").one().status == "RESOLVING"
    orders = {o["id"]: o for o in client.get("/api/v1/app/bootstrap", headers=manager).json()["orders"]}
    still_short = {code for a in transfer["actions"] for code in a["orders"]} - {"ORD-445"}
    assert all(orders[code]["status"] == "At Risk" for code in still_short)


def test_reroute_plan_runs_end_to_end(client):
    analyst, manager = login(client), login(client, "manager@trustchain.com")
    delay(client)
    plan_id = "RP-SHP-101-reroute"
    assert client.post(f"/api/v1/recovery/plans/{plan_id}/submit", headers=analyst).status_code == 200
    assert client.post(f"/api/v1/approvals/{plan_id}/approve", headers=manager, json={}).status_code == 200
    assert client.post(f"/api/v1/execution/{plan_id}/confirm", headers=manager).json()["status"] == "COMPLETED"


# --- AI output validation ---

def good_output(context):
    feasible = next(o for o in context["options"] if o["feasible"])
    return {
        "overview": f"{context['disruption']['id']} needs a decision.",
        "recommended_plan_id": feasible["plan_id"],
        "explanations": [
            {"plan_id": o["plan_id"], "explanation": f"Covers {o['coverage_percent']}% of short units.", "advantages": ["Uses checked data."], "disadvantages": [], "required_validation": ["Confirm the stock count."], "confidence": "MEDIUM"}
            for o in context["options"]
        ],
    }


def context_for(client):
    delay(client)
    candidates, org, disruption = options(client)
    lines = ops_engine.affected_lines(client.db, disruption)
    return ai.build_context(disruption, lines, candidates), candidates


def test_valid_output_passes(client):
    context, _ = context_for(client)
    assert ai.validate_output(json.dumps(good_output(context)), context).recommended_plan_id


@pytest.mark.parametrize("raw", ["not json", "{}", '{"overview": "x"}', "[]"])
def test_malformed_output_is_rejected(client, raw):
    context, _ = context_for(client)
    with pytest.raises(ai.InvalidAiOutput):
        ai.validate_output(raw, context)


def mutate(context, change):
    output = good_output(context)
    change(output)
    return json.dumps(output)


def test_invented_figures_and_records_are_rejected(client):
    context, _ = context_for(client)
    for change in (
        lambda o: o.update(overview="We found 987654 spare units."),
        lambda o: o["explanations"][0].update(explanation="Costs $12,345 extra."),
        lambda o: o["explanations"][0]["advantages"].append("ORD-999 is safe."),
        lambda o: o["explanations"][0]["required_validation"].append("Call SUP-777 first."),
    ):
        with pytest.raises(ai.InvalidAiOutput):
            ai.validate_output(mutate(context, change), context)


def test_unknown_missing_duplicate_or_infeasible_options_are_rejected(client):
    context, _ = context_for(client)
    infeasible = next(o["plan_id"] for o in context["options"] if not o["feasible"])
    for change in (
        lambda o: o.update(recommended_plan_id="RP-MADE-UP"),
        lambda o: o.update(recommended_plan_id=infeasible),
        lambda o: o["explanations"].pop(),
        lambda o: o["explanations"].append(dict(o["explanations"][0])),
        lambda o: o["explanations"][0].update(plan_id="RP-MADE-UP"),
        lambda o: o["explanations"][0].update(confidence="CERTAIN"),
    ):
        with pytest.raises(ai.InvalidAiOutput):
            ai.validate_output(mutate(context, change), context)


# --- AI failure handling through the API ---

def recommend(client, headers, shipment="SHP-101"):
    return client.post(f"/api/v1/ai/disruptions/{shipment}/recommendations", headers=headers)


def test_without_a_key_the_app_is_told_ai_is_unavailable(client):
    delay(client)
    body = recommend(client, login(client)).json()
    assert body["status"] == "UNAVAILABLE"
    assert body["reason"] == "NOT_CONFIGURED"
    assert "unavailable" in body["message"]
    assert "explanations" not in body


@pytest.mark.parametrize("failure,reason", [
    (requests.Timeout("timed out"), "PROVIDER_ERROR"),
    (ai.AiProviderError("HTTP 500"), "PROVIDER_ERROR"),
])
def test_provider_failures_never_fabricate_a_response(client, monkeypatch, failure, reason):
    monkeypatch.setenv("GEMINI_API_KEY", FAKE_KEY)
    def fail(*args):
        raise failure
    monkeypatch.setattr(ai, "_call_gemini", fail)
    delay(client)
    body = recommend(client, login(client)).json()
    assert body == {"status": "UNAVAILABLE", "reason": reason, "message": ai.UNAVAILABLE_MESSAGE}


def test_invalid_output_is_hidden_from_the_user(client, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", FAKE_KEY)
    monkeypatch.setattr(ai, "_call_gemini", lambda *a: json.dumps({"overview": "Buy 999999 units", "recommended_plan_id": "x", "explanations": []}))
    delay(client)
    body = recommend(client, login(client)).json()
    assert body["reason"] == "INVALID_OUTPUT"
    assert "999999" not in json.dumps(body)


def test_workflow_keeps_working_while_ai_is_down(client, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", FAKE_KEY)
    def fail(*args):
        raise requests.ConnectionError("down")
    monkeypatch.setattr(ai, "_call_gemini", fail)
    analyst, manager = login(client), login(client, "manager@trustchain.com")
    delay(client)
    assert recommend(client, analyst).json()["status"] == "UNAVAILABLE"
    plan = "RP-SHP-101-transfer"
    assert client.post(f"/api/v1/recovery/plans/{plan}/submit", headers=analyst).status_code == 200
    assert client.post(f"/api/v1/approvals/{plan}/approve", headers=manager, json={}).status_code == 200
    assert client.post(f"/api/v1/execution/{plan}/confirm", headers=manager).json()["status"] == "COMPLETED"


def test_valid_response_is_returned_cached_and_audited(client, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", FAKE_KEY)
    calls = []
    def fake(prompt, key, model):
        calls.append(prompt)
        data = json.loads(prompt.split("DATA:\n", 1)[1])
        return json.dumps(good_output(data))
    monkeypatch.setattr(ai, "_call_gemini", fake)
    headers = login(client)
    delay(client)
    first = recommend(client, headers).json()
    assert first["status"] == "AVAILABLE"
    assert "review" in first["advisory_notice"]
    assert recommend(client, headers).json() == first
    assert len(calls) == 1
    event_row = client.db.query(AuditEvent).filter_by(action_type="AI_RECOMMENDATION_GENERATED").one()
    assert event_row.event_metadata["outcome"] == "VALIDATED"
    assert FAKE_KEY not in json.dumps(event_row.event_metadata)


def test_customer_names_are_not_sent_to_the_model(client, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", FAKE_KEY)
    seen = []
    def fake(prompt, key, model):
        seen.append(prompt)
        return "not json"
    monkeypatch.setattr(ai, "_call_gemini", fake)
    delay(client)
    recommend(client, login(client))
    assert "EduTech" not in seen[0]


def test_key_is_sent_in_a_header_not_the_url(monkeypatch):
    captured = {}
    class Response:
        status_code = 200
        def json(self):
            return {"candidates": [{"content": {"parts": [{"text": "{}"}]}}]}
    def fake_post(url, headers, json, timeout):
        captured.update(url=url, headers=headers)
        return Response()
    monkeypatch.setattr(ai.requests, "post", fake_post)
    ai._call_gemini("hello", FAKE_KEY, "gemini-test")
    assert FAKE_KEY not in captured["url"]
    assert captured["headers"]["x-goog-api-key"] == FAKE_KEY


def test_ai_endpoint_needs_login_role_and_a_real_disruption(client):
    delay(client)
    assert recommend(client, {}).status_code == 401
    assert recommend(client, login(client, "warehouse@trustchain.com")).status_code == 403
    assert recommend(client, login(client), "SHP-999").status_code == 404
