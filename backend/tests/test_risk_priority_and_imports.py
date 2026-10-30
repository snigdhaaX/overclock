import pandas as pd
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from backend.app.blockchain.database import Base, get_db
from backend.app.main import app
from backend.app.risk import importers, service, synthetic, training

ORG = "org:test"
NON_FEATURES = ("missed_deadline", "outcome_at")


@pytest.fixture
def db(tmp_path, monkeypatch):
    monkeypatch.setenv("TRUSTCHAIN_RISK_MODEL_DIR", str(tmp_path))
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


def test_equal_miss_chance_ranks_higher_priority_order_first(db):
    items = synthetic.generate(rows=4000, days=600, supplier_effect=9.0)
    service.ingest_exposures(db, ORG, [{k: v for k, v in i.items() if k not in NON_FEATURES} for i in items], "synthetic")
    for i in items:
        service.record_outcome(db, ORG, i["exposure_id"], bool(i["missed_deadline"]), i["outcome_at"])
    result = training.retrain(db, ORG)
    assert result["status"] == "ACTIVE"
    assert set(result["metrics"]["priority_weighted_top20"]) == {"formula", "challenger"}

    order = {
        "supplier_id": "SUP-001", "carrier_id": "CAR-01", "snapshot_at": max(i["outcome_at"] for i in items),
        "hours_to_deadline": 48.0, "required_qty": 100.0, "shortage_qty": 40.0, "reported_delay_hours": 72.0,
        "route_risk": 0.5, "weather_severity": 0.5, "customs_hours": 10.0,
    }
    # Separate tiers can shift the probability slightly, so check the score against its own inputs.
    top = service.score_exposure(db, ORG, {**order, "priority_tier": 1})
    routine = service.score_exposure(db, ORG, {**order, "priority_tier": 4})
    assert top["risk_score"] == pytest.approx(top["miss_probability"] * 100.0, abs=0.01)
    assert routine["risk_score"] == pytest.approx(routine["miss_probability"] * 50.0, abs=0.01)
    # A carrier with no history cannot be given as a reason for the score.
    unknown = service.score_exposure(db, ORG, {**order, "priority_tier": 1, "carrier_id": "NEW-CARRIER"})
    assert "carrier_recent_miss_rate" not in unknown["factor_effects"]
    assert "carrier_hist_miss_rate" not in unknown["factor_effects"]
    assert "supplier_recent_miss_rate" in unknown["factor_effects"]


def test_training_works_when_a_source_lacks_a_whole_field(db):
    items = synthetic.generate(rows=2500, days=400, supplier_effect=9.0)
    for item in items:
        item["route_risk"] = item["weather_severity"] = item["customs_hours"] = None
    service.ingest_exposures(db, ORG, [{k: v for k, v in i.items() if k not in NON_FEATURES} for i in items], "synthetic")
    for i in items:
        service.record_outcome(db, ORG, i["exposure_id"], bool(i["missed_deadline"]), i["outcome_at"])
    assert training.retrain(db, ORG)["status"] in ("ACTIVE", "REJECTED")


def test_batch_endpoint_scores_each_order_and_keeps_its_id(db):
    app.dependency_overrides[get_db] = lambda: db
    try:
        order = {
            "supplier_id": "SUP-1", "carrier_id": "CAR-1", "snapshot_at": "2026-10-24T09:00:00Z",
            "hours_to_deadline": 48, "required_qty": 100, "shortage_qty": 100, "reported_delay_hours": 120,
            "priority_tier": 1, "route_risk": None, "weather_severity": None, "customs_hours": None,
        }
        headers = {"X-Organization-Id": ORG}
        client = TestClient(app)
        response = client.post("/api/v1/risk/score/batch", headers=headers, json={"orders": [
            {**order, "order_id": "ORD-1"}, {**order, "order_id": "ORD-2", "priority_tier": 4},
        ]})
        assert response.status_code == 200
        results = response.json()["results"]
        assert [r["order_id"] for r in results] == ["ORD-1", "ORD-2"]
        assert results[0]["method"] == "formula"
        assert results[0]["risk_score"] > results[1]["risk_score"]
        too_many = {"orders": [{**order, "order_id": str(i)} for i in range(101)]}
        assert client.post("/api/v1/risk/score/batch", headers=headers, json=too_many).status_code == 422
    finally:
        app.dependency_overrides.pop(get_db, None)


def logistics_rows():
    base = {
        "Warehouse Inventory Level": 100.0, "Handling Equipment Availability": 0.5, "Order Fulfillment Status": 0.5,
        "Weather Condition Severity": 0.5, "Shipping Costs": 10.0, "Supplier Reliability Score": 0.5,
        "Lead Time Days": 2.0, "Historical Demand": 150.0, "Cargo Condition Status": 0.5, "Route Risk Level": 1.0,
        "Customs Clearance Time": 0.5, "Disruption Likelihood Score": 0.5, "Delay Probability": 0.5,
        "Risk Classification": "High Risk", "Delivery Time Deviation": 5.0, "Product ID": "P1",
        "Supplier ID": "P1_S1", "Supplier Country": "Greece",
    }
    copy = {**base, "Supplier ID": "P1_S2", "Supplier Country": "Ethiopia"}
    other = {**base, "Lead Time Days": 3.0, "Delivery Time Deviation": 0.0, "Product ID": "P2", "Supplier ID": "P2_S1"}
    return pd.DataFrame([base, copy, other])


def test_logistics_import_drops_supplier_copies_that_would_leak_into_testing():
    mapped = importers.map_logistics_csv(logistics_rows())
    assert len(mapped) == 2
    assert sorted(mapped["missed_deadline"].tolist()) == [0, 1]
    row = mapped[mapped["missed_deadline"] == 1].iloc[0]
    assert row["hours_to_deadline"] == 48.0
    assert row["shortage_qty"] == 50.0
    assert (mapped["outcome_at"] >= mapped["snapshot_at"]).all()


def test_dataco_import_excludes_cancelled_orders_and_uses_only_order_time_inputs():
    raw = pd.DataFrame({
        "Delivery Status": ["Late delivery", "Shipping canceled", "Shipping on time"],
        "order date (DateOrders)": ["1/31/2018 22:56", "1/13/2018 12:27", "2/1/2018 10:00"],
        "shipping date (DateOrders)": ["2/3/2018 22:56", "1/18/2018 12:27", "2/3/2018 10:00"],
        "Order Item Quantity": [1, 1, 2],
        "Order Item Id": [10, 11, 12],
        "Department Name": ["Fitness", "Apparel", "Fitness"],
        "Shipping Mode": ["Standard Class", "Standard Class", "First Class"],
        "Days for shipment (scheduled)": [2, 4, 1],
        "Late_delivery_risk": [1, 0, 0],
    })
    mapped = importers.map_dataco(raw)
    assert mapped["exposure_id"].tolist() == ["DC-10", "DC-12"]
    assert mapped.iloc[0]["hours_to_deadline"] == 48.0
    assert mapped["missed_deadline"].tolist() == [1, 0]
    assert mapped["priority_tier"].eq(3).all()


def test_import_refuses_to_mix_into_an_organization_with_data(db):
    mapped = importers.map_logistics_csv(logistics_rows())
    importers._store(db, ORG, mapped, "logistics_csv_undated")
    with pytest.raises(ValueError):
        importers._store(db, ORG, mapped, "logistics_csv_undated")
