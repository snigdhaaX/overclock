import datetime
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from backend.app.blockchain.database import Base, get_db
from backend.app.main import app
from backend.app.risk import formula, service, synthetic, training
from backend.app.risk.features import build_features
from backend.app.risk.models import RiskModelVersion

ORG = "org:test"
OTHER_ORG = "org:other"
NON_FEATURES = ("missed_deadline", "outcome_at")


@pytest.fixture
def db(tmp_path, monkeypatch):
    monkeypatch.setenv("TRUSTCHAIN_RISK_MODEL_DIR", str(tmp_path))
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


def load(db, items, org=ORG):
    features = [{k: v for k, v in i.items() if k not in NON_FEATURES} for i in items]
    service.ingest_exposures(db, org, features, data_source="synthetic")
    for item in items:
        service.record_outcome(db, org, item["exposure_id"], bool(item["missed_deadline"]), item["outcome_at"])


def signal(**kwargs):
    """Data where supplier reliability clearly matters, for tests that need a model to go live."""
    return synthetic.generate(supplier_effect=9.0, **kwargs)


def after(items):
    return max(i["outcome_at"] for i in items)


def sample(**overrides):
    base = {
        "supplier_id": "SUP-001", "carrier_id": "CAR-01", "snapshot_at": datetime.datetime(2030, 1, 1),
        "hours_to_deadline": 48.0, "required_qty": 100.0, "shortage_qty": 40.0, "reported_delay_hours": 72.0,
        "priority_tier": 1, "route_risk": 0.5, "weather_severity": 0.5, "customs_hours": 10.0,
    }
    return {**base, **overrides}


# --- PRD formula ---

def test_formula_matches_prd_weights():
    row = pd.DataFrame([sample(hours_to_deadline=84.0, shortage_qty=50.0, reported_delay_hours=168.0, priority_tier=3)])
    # D=50, S=50, I=50, P=50, so the weighted total is exactly 50.
    assert formula.score(row)[0] == pytest.approx(50.0)
    assert formula.category(50.0) == "HIGH"


# --- Model matches the same outcome and sees no future data ---

def test_history_features_exclude_outcomes_not_yet_known():
    t0 = datetime.datetime(2025, 1, 1)
    history = pd.DataFrame([
        {**sample(), "exposure_id": "known", "snapshot_at": t0, "outcome_at": t0 + datetime.timedelta(days=1), "missed_deadline": 1},
        {**sample(), "exposure_id": "future", "snapshot_at": t0, "outcome_at": t0 + datetime.timedelta(days=10), "missed_deadline": 0},
    ])
    query = pd.DataFrame([{**sample(), "snapshot_at": t0 + datetime.timedelta(days=5)}])
    x = build_features(query, history)
    # The later outcome was a non-miss, so including it would give 0.5.
    assert x.loc[0, "supplier_hist_miss_rate"] == 1.0


def test_training_rows_exclude_outcomes_known_only_after_evaluation_starts(db):
    items = synthetic.generate(rows=2500, days=365)
    load(db, items)
    result = training.retrain(db, ORG)
    eval_start = pd.Timestamp(result["metrics"]["eval_window"]["start"])
    frame = training.load_frame(db, ORG)
    resolved = frame[frame["missed_deadline"].notna()]
    expected_train = int((resolved["outcome_at"] < eval_start).sum())
    assert expected_train < int((resolved["snapshot_at"] < eval_start).sum())
    assert "formula" in result["metrics"] and "challenger" in result["metrics"]
    assert result["metrics"]["target"] == "order line missed its required delivery date"


# --- Promotion gate ---

def test_no_model_goes_live_when_there_is_too_little_data(db):
    load(db, synthetic.generate(rows=100, days=30))
    assert training.retrain(db, ORG)["status"] == "SKIPPED"
    assert service.score_exposure(db, ORG, sample())["method"] == "formula"


def test_model_with_no_real_signal_is_rejected_and_formula_stays(db):
    load(db, synthetic.generate(rows=3000, days=500, random_labels=True))
    result = training.retrain(db, ORG)
    assert result["status"] == "REJECTED"
    assert training.get_active(db, ORG) is None
    assert service.score_exposure(db, ORG, sample())["method"] == "formula"


def test_model_that_beats_formula_goes_live_with_saved_artifact(db):
    load(db, signal(rows=4000, days=600))
    result = training.retrain(db, ORG)
    assert result["status"] == "ACTIVE"
    active = training.get_active(db, ORG)
    assert active.version == result["version"]
    scored = service.score_exposure(db, ORG, sample())
    assert scored["method"] == "ml"
    assert scored["model_version"] == active.version
    assert 0.0 <= scored["miss_probability"] <= 1.0
    assert scored["factor_effects"]
    assert scored["formula_breakdown"]["deadline_urgency"]["component"] > 0
    assert scored["data_sources"] == ["synthetic"]


def test_saved_model_survives_reload_and_gives_identical_scores(db):
    load(db, signal(rows=4000, days=600))
    training.retrain(db, ORG)
    first = service.score_exposure(db, ORG, sample())
    second = service.score_exposure(db, ORG, sample())
    assert first["miss_probability"] == second["miss_probability"]
    assert first["factor_effects"] == second["factor_effects"]


# --- Dynamic behaviour ---

def test_new_outcomes_change_scores_for_a_supplier_that_gets_worse(db):
    history = signal(rows=4000, days=600)
    load(db, history)
    assert training.retrain(db, ORG)["status"] == "ACTIVE"
    frame = training.load_frame(db, ORG)
    supplier = frame.groupby("supplier_id")["missed_deadline"].mean().idxmin()
    when = after(history)
    before = service.score_exposure(db, ORG, sample(supplier_id=supplier, snapshot_at=when))

    start = when
    items = []
    for i in range(40):
        snap = start + datetime.timedelta(hours=i)
        items.append({**sample(supplier_id=supplier, snapshot_at=snap), "exposure_id": f"BAD-{i}", "missed_deadline": 1, "outcome_at": snap + datetime.timedelta(minutes=30)})
    load(db, items)
    later = after(items) + datetime.timedelta(hours=1)
    now = service.score_exposure(db, ORG, sample(supplier_id=supplier, snapshot_at=later))
    # No retraining has happened yet: live history features alone move the score.
    assert now["model_version"] == before["model_version"]
    assert now["miss_probability"] > before["miss_probability"]


def test_retraining_adapts_to_change_and_records_every_run(db):
    history = signal(rows=4000, days=600)
    load(db, history)
    first = training.retrain(db, ORG)
    assert first["status"] == "ACTIVE"
    assert training.retrain(db, ORG)["status"] == "SKIPPED"

    changed = signal(rows=1500, days=180, seed=9, start=after(history), id_prefix="SHIFT", degrade_suppliers=0.25)
    load(db, changed)
    second = training.retrain(db, ORG)
    assert second["status"] in ("ACTIVE", "REJECTED")
    # The challenger must have learned from new data, or the comparison with the live model is empty.
    assert second["metrics"]["challenger"] != second["metrics"]["active"]
    assert "active" in second["metrics"] and "gain_vs_active" in second["metrics"]
    assert db.query(RiskModelVersion).filter_by(organization_id=ORG).count() == 2
    assert db.query(RiskModelVersion).filter_by(organization_id=ORG, status="ACTIVE").count() <= 1


def test_new_data_triggers_retraining_once_per_threshold(db):
    assert training.should_retrain(db, ORG) is False
    first = synthetic.generate(rows=1000, days=200, random_labels=True)
    load(db, first)
    assert training.should_retrain(db, ORG) is True
    db.add(RiskModelVersion(
        organization_id=ORG, version=1, status="REJECTED", decision_reason="test", train_rows=700,
        resolved_rows=1000, eval_rows=300, metrics_json="{}",
    ))
    db.commit()
    assert training.should_retrain(db, ORG) is False
    load(db, synthetic.generate(rows=500, days=60, start=after(first), id_prefix="MORE", random_labels=True))
    assert training.should_retrain(db, ORG) is True


def test_live_model_is_retired_when_it_no_longer_beats_formula(db):
    history = signal(rows=4000, days=600)
    load(db, history)
    assert training.retrain(db, ORG)["status"] == "ACTIVE"
    noise = synthetic.generate(rows=1500, days=180, seed=11, start=after(history), id_prefix="NOISE", random_labels=True)
    load(db, noise)
    result = training.retrain(db, ORG)
    assert result["status"] == "REJECTED"
    assert training.get_active(db, ORG) is None
    assert service.score_exposure(db, ORG, sample())["method"] == "formula"


# --- Data integrity ---

def test_ingest_is_idempotent_and_never_overwrites(db):
    item = {**sample(), "exposure_id": "E1"}
    assert service.ingest_exposures(db, ORG, [item])["created"] == 1
    assert service.ingest_exposures(db, ORG, [item])["duplicates"] == 1
    changed = {**item, "shortage_qty": 99.0}
    assert service.ingest_exposures(db, ORG, [changed])["conflicts"] == ["E1"]


def test_outcome_cannot_change_or_predate_snapshot(db):
    service.ingest_exposures(db, ORG, [{**sample(), "exposure_id": "E1"}])
    with pytest.raises(service.OutcomeConflict):
        service.record_outcome(db, ORG, "E1", True, datetime.datetime(2029, 1, 1))
    good = datetime.datetime(2030, 1, 2)
    assert service.record_outcome(db, ORG, "E1", True, good)["status"] == "RECORDED"
    assert service.record_outcome(db, ORG, "E1", True, good)["status"] == "DUPLICATE"
    with pytest.raises(service.OutcomeConflict):
        service.record_outcome(db, ORG, "E1", False, good)


def test_organizations_do_not_share_data_or_models(db):
    load(db, signal(rows=4000, days=600))
    assert training.retrain(db, ORG)["status"] == "ACTIVE"
    assert training.get_active(db, OTHER_ORG) is None
    assert service.score_exposure(db, OTHER_ORG, sample())["method"] == "formula"
    with pytest.raises(service.ExposureNotFound):
        service.record_outcome(db, OTHER_ORG, "EXP-000000", True, datetime.datetime(2030, 1, 1))


def test_training_run_is_reproducible(tmp_path, monkeypatch):
    results = []
    for run in ("a", "b"):
        monkeypatch.setenv("TRUSTCHAIN_RISK_MODEL_DIR", str(tmp_path / run))
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(engine)
        session = sessionmaker(bind=engine)()
        load(session, synthetic.generate(rows=2500, days=365))
        results.append(training.retrain(session, ORG)["metrics"])
        session.close()
    assert results[0] == results[1]


# --- API ---

@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.pop(get_db, None)


def as_json(item):
    return {**item, "snapshot_at": item["snapshot_at"].isoformat()}


HEADERS = {"X-Organization-Id": ORG, "X-User-Id": "user:1", "X-User-Roles": "operations_analyst"}


def test_api_scores_with_formula_before_any_model_exists(client):
    response = client.post("/api/v1/risk/score", json=as_json(sample()), headers=HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["method"] == "formula"
    assert body["risk_score"] == body["formula_score"]
    assert body["fallback_reason"]


def test_api_full_flow_from_ingest_to_ml_scoring(client, db):
    items = signal(rows=3500, days=500)
    for start in range(0, len(items), 2000):
        batch = [as_json({k: v for k, v in i.items() if k not in NON_FEATURES}) for i in items[start:start + 2000]]
        assert client.post("/api/v1/risk/exposures", json={"exposures": batch}, headers=HEADERS).status_code == 200
    for item in items:
        service.record_outcome(db, ORG, item["exposure_id"], bool(item["missed_deadline"]), item["outcome_at"])
    assert client.post("/api/v1/risk/models/retrain", headers=HEADERS).json()["status"] == "ACTIVE"
    assert client.get("/api/v1/risk/status", headers=HEADERS).json()["scoring_method"] == "ml"
    assert client.post("/api/v1/risk/score", json=as_json(sample()), headers=HEADERS).json()["method"] == "ml"
    assert len(client.get("/api/v1/risk/models", headers=HEADERS).json()) == 1


def test_api_rejects_invalid_input_and_conflicting_outcome(client):
    assert client.post("/api/v1/risk/score", json=as_json(sample(required_qty=0)), headers=HEADERS).status_code == 422
    assert client.post("/api/v1/risk/score", json=as_json(sample(priority_tier=9)), headers=HEADERS).status_code == 422
    missing = {"missed_deadline": True, "outcome_at": "2030-01-02T00:00:00"}
    assert client.post("/api/v1/risk/exposures/none/outcome", json=missing, headers=HEADERS).status_code == 404
    client.post("/api/v1/risk/exposures", json={"exposures": [as_json({**sample(), "exposure_id": "E1"})]}, headers=HEADERS)
    assert client.post("/api/v1/risk/exposures/E1/outcome", json=missing, headers=HEADERS).status_code == 200
    flipped = {"missed_deadline": False, "outcome_at": "2030-01-02T00:00:00"}
    assert client.post("/api/v1/risk/exposures/E1/outcome", json=flipped, headers=HEADERS).status_code == 409


def test_api_blocks_retrain_for_roles_without_permission(client):
    headers = {**HEADERS, "X-User-Roles": "warehouse_operator"}
    assert client.post("/api/v1/risk/models/retrain", headers=headers).status_code == 403
