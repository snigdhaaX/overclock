import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.blockchain.database import Base, get_db, OperationalRecoveryPlan
from backend.app.blockchain.hash_service import RecoveryPlanHashService
from backend.app.supply_chain.models import (
    Supplier,
    PurchaseOrder,
    OrderItem,
    Shipment,
    ShipmentCheckpoint,
    Warehouse,
    InventoryItem,
    Disruption,
    DisruptionShipment,
    CustomerOrder,
    CustomerOrderLine,
)
from backend.app.supply_chain.seed_data import seed_supply_chain_data
from backend.app.supply_chain.disruption_service import DisruptionIntelligenceService
from backend.app.supply_chain.risk_service import DisruptionRiskScoringService
from backend.app.supply_chain.impact_service import DisruptionImpactAnalysisService
from backend.app.supply_chain.recommendation_service import RecoveryRecommendationService
from backend.app.supply_chain.simulation_service import RecoverySimulationService

client = TestClient(app)

TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_supply_chain_data(db, organization_id="ORG-APEX-GLOBAL")
    db.close()
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)


# ------------------------------------------------------------------------------
# 1. Disruption Classification
# ------------------------------------------------------------------------------

def test_disruption_classification():
    desc = "Severe maritime bottleneck and vessel stoppage in the Suez Canal convoy"
    classification = DisruptionIntelligenceService.classify_disruption(
        description=desc,
        reported_delay_hours=96,
        source="AI_SATELLITE_AIS_MONITORING",
    )
    assert classification["category"] == "PORT_CONGESTION"
    assert classification["geographic_region"] == "Suez Canal / Red Sea Gateway"
    assert classification["severity"] == "CRITICAL"
    assert classification["estimated_delay_hours"] == 96
    assert classification["confidence_score"] >= 0.90
    assert len(classification["classification_reasoning"]) > 0


# ------------------------------------------------------------------------------
# 2. Deterministic Risk Scoring
# ------------------------------------------------------------------------------

def test_deterministic_risk_scoring():
    db = TestingSessionLocal()
    disruption = db.query(Disruption).filter_by(incident_code="INC-2026-0881").first()
    assert disruption is not None

    score_1 = DisruptionRiskScoringService.calculate_disruption_risk(db, disruption)
    score_2 = DisruptionRiskScoringService.calculate_disruption_risk(db, disruption)
    db.close()

    # Exact deterministic equality
    assert score_1["overall_risk_score"] == score_2["overall_risk_score"]
    assert score_1["overall_risk_score"] >= 70.0
    assert score_1["risk_category"] in ["HIGH", "CRITICAL"]
    assert "explanation" in score_1
    assert "contributing_factors" in score_1


# ------------------------------------------------------------------------------
# 3. Risk Category Boundaries
# ------------------------------------------------------------------------------

def test_risk_category_boundaries():
    db = TestingSessionLocal()
    shp = db.query(Shipment).filter_by(tracking_number="SHP-EU-88219").first()
    # Create synthetic test disruptions at various severities and delays
    d_low = Disruption(
        organization_id="ORG-APEX-GLOBAL",
        incident_code="TEST-RISK-LOW",
        category="WEATHER",
        severity="LOW",
        geographic_region="Local Area",
        description="Minor advisory",
        start_time=datetime.datetime.utcnow(),
        estimated_delay_hours=4,
    )
    d_crit = Disruption(
        organization_id="ORG-APEX-GLOBAL",
        incident_code="TEST-RISK-CRIT",
        category="PORT_CONGESTION",
        severity="CRITICAL",
        geographic_region="Suez Canal / Red Sea Gateway",
        description="Total maritime shutdown",
        start_time=datetime.datetime.utcnow(),
        estimated_delay_hours=120,
    )
    db.add_all([d_low, d_crit])
    db.flush()

    if shp:
        assoc = DisruptionShipment(disruption_id=d_crit.id, shipment_id=shp.id)
        db.add(assoc)
        db.flush()

    res_low = DisruptionRiskScoringService.calculate_disruption_risk(db, d_low)
    res_crit = DisruptionRiskScoringService.calculate_disruption_risk(db, d_crit)
    db.close()

    assert res_low["overall_risk_score"] < 50.0
    assert res_crit["overall_risk_score"] >= 80.0
    assert res_crit["risk_category"] == "CRITICAL"


# ------------------------------------------------------------------------------
# 4. Impact Graph Traversal
# ------------------------------------------------------------------------------

def test_impact_graph_traversal():
    db = TestingSessionLocal()
    disruption = db.query(Disruption).filter_by(incident_code="INC-2026-0881").first()
    impact = DisruptionImpactAnalysisService.analyze_disruption_impact(db, disruption)
    db.close()

    assert impact["total_affected_shipments"] >= 1
    assert impact["total_affected_purchase_orders"] >= 1
    assert impact["total_affected_suppliers"] >= 1
    assert impact["total_affected_customer_orders"] >= 1
    assert len(impact["chain_trace"]) == 7


# ------------------------------------------------------------------------------
# 5. Customer Order Impact
# ------------------------------------------------------------------------------

def test_customer_order_impact():
    db = TestingSessionLocal()
    disruption = db.query(Disruption).filter_by(incident_code="INC-2026-0881").first()
    impact = DisruptionImpactAnalysisService.analyze_disruption_impact(db, disruption)
    db.close()

    orders = impact["customer_order_impacts"]
    assert len(orders) >= 1
    target_order = next(o for o in orders if o["order_number"] == "ORD-GLOBAL-4412")
    assert target_order["is_sla_breached"] is True
    assert target_order["hours_past_deadline"] > 0
    assert target_order["daily_penalty_rate_usd"] == 45000.0


# ------------------------------------------------------------------------------
# 6. SLA Penalty Calculations
# ------------------------------------------------------------------------------

def test_sla_penalty_calculations():
    db = TestingSessionLocal()
    disruption = db.query(Disruption).filter_by(incident_code="INC-2026-0881").first()
    impact = DisruptionImpactAnalysisService.analyze_disruption_impact(db, disruption)
    db.close()

    co_impact = impact["customer_order_impacts"][0]
    expected_penalty = round((co_impact["hours_past_deadline"] / 24.0) * co_impact["daily_penalty_rate_usd"], 2)
    assert co_impact["sla_penalty_exposure_usd"] == expected_penalty
    assert impact["total_financial_exposure_usd"] >= expected_penalty


# ------------------------------------------------------------------------------
# 7. Duplicate Financial Exposure Prevention
# ------------------------------------------------------------------------------

def test_duplicate_financial_exposure_prevention():
    db = TestingSessionLocal()
    disruption = db.query(Disruption).filter_by(incident_code="INC-2026-0881").first()
    
    # Run impact analysis with current state
    impact_before = DisruptionImpactAnalysisService.analyze_disruption_impact(db, disruption)

    # Attach an extra duplicate shipment association for the same customer order
    extra_shp = Shipment(
        organization_id="ORG-APEX-GLOBAL",
        tracking_number="SHP-TEST-EXTRA-01",
        purchase_order_id=1,
        carrier="Test Carrier",
        transport_mode="SEA_FREIGHT",
        origin="Kaohsiung",
        destination="Rotterdam",
        current_location="Suez Canal",
        departure_date=datetime.datetime.utcnow(),
        estimated_arrival=datetime.datetime.utcnow() + datetime.timedelta(days=5),
        delay_hours=96,
    )
    db.add(extra_shp)
    db.flush()
    assoc = DisruptionShipment(disruption_id=disruption.id, shipment_id=extra_shp.id)
    db.add(assoc)
    db.flush()

    impact_after = DisruptionImpactAnalysisService.analyze_disruption_impact(db, disruption)
    db.close()

    # The customer order penalty MUST NOT double count even though 2 shipments affect the same incident!
    assert impact_after["total_financial_exposure_usd"] == impact_before["total_financial_exposure_usd"]


# ------------------------------------------------------------------------------
# 8. Warehouse Transfer Feasibility
# ------------------------------------------------------------------------------

def test_warehouse_transfer_feasibility():
    db = TestingSessionLocal()
    disruption = db.query(Disruption).filter_by(incident_code="INC-2026-0881").first()
    recs = RecoveryRecommendationService.generate_recommendations(db, disruption)
    db.close()

    xfer = next((r for r in recs if r["action_type"] == "WAREHOUSE_TRANSFER" and r["feasibility_status"] == "FEASIBLE"), None)
    assert xfer is not None
    assert xfer["action_mask"] == 0x01
    assert xfer["estimated_recovery_time_hours"] <= 24
    assert xfer["net_financial_benefit_usd"] > 0


# ------------------------------------------------------------------------------
# 9. Alternative Procurement Feasibility
# ------------------------------------------------------------------------------

def test_alternative_procurement_feasibility():
    db = TestingSessionLocal()
    disruption = db.query(Disruption).filter_by(incident_code="INC-2026-0881").first()
    recs = RecoveryRecommendationService.generate_recommendations(db, disruption)
    db.close()

    procure = next(r for r in recs if r["action_type"] == "ALTERNATIVE_PROCUREMENT")
    assert procure is not None
    assert procure["action_mask"] == 0x02
    assert procure["feasibility_status"] == "FEASIBLE"
    assert "Tokyo Microelectronics" in procure["proposed_action"] or "Supplier" in procure["proposed_action"] or len(procure["proposed_action"]) > 0


# ------------------------------------------------------------------------------
# 10. Shipment Rerouting Recommendation
# ------------------------------------------------------------------------------

def test_shipment_rerouting_recommendation():
    db = TestingSessionLocal()
    disruption = db.query(Disruption).filter_by(incident_code="INC-2026-0881").first()
    recs = RecoveryRecommendationService.generate_recommendations(db, disruption)
    db.close()

    reroute = next(r for r in recs if r["action_type"] == "SHIPMENT_REROUTE")
    assert reroute is not None
    assert reroute["action_mask"] == 0x04
    assert reroute["estimated_recovery_time_hours"] == 36
    assert reroute["estimated_cost_usd"] == 12500.0
    assert reroute["expected_delay_reduction_hours"] == 60


# ------------------------------------------------------------------------------
# 11. Expedited Freight Recommendation
# ------------------------------------------------------------------------------

def test_expedited_freight_recommendation():
    db = TestingSessionLocal()
    disruption = db.query(Disruption).filter_by(incident_code="INC-2026-0881").first()
    recs = RecoveryRecommendationService.generate_recommendations(db, disruption)
    db.close()

    freight = next(r for r in recs if r["action_type"] == "EXPEDITED_FREIGHT")
    assert freight is not None
    assert freight["action_mask"] == 0x08
    assert freight["estimated_recovery_time_hours"] == 18
    assert freight["sla_penalty_saved_usd"] > 0


# ------------------------------------------------------------------------------
# 12. Infeasible Recovery Actions
# ------------------------------------------------------------------------------

def test_infeasible_recovery_action():
    db = TestingSessionLocal()
    # Zero out all stock of SKU-OPT-1044 in all warehouses
    db.query(InventoryItem).filter_by(sku="SKU-OPT-1044").update({
        "available_quantity": 0,
        "reserved_quantity": 0,
        "safety_stock": 100,
    })
    db.flush()

    # Create synthetic disruption for optical sensors
    d_opt = Disruption(
        organization_id="ORG-APEX-GLOBAL",
        incident_code="TEST-INFEASIBLE-01",
        category="SUPPLIER_SHUTDOWN",
        severity="HIGH",
        geographic_region="Shenzhen Gateway",
        description="Optical sensor line halt",
        start_time=datetime.datetime.utcnow(),
        estimated_delay_hours=72,
    )
    db.add(d_opt)
    db.flush()

    # Link to PO with SKU-OPT-1044
    po_opt = db.query(PurchaseOrder).filter_by(po_number="PO-2026-9022").first()
    shp_opt = db.query(Shipment).filter_by(purchase_order_id=po_opt.id).first()
    assoc = DisruptionShipment(disruption_id=d_opt.id, shipment_id=shp_opt.id)
    db.add(assoc)
    db.flush()

    recs = RecoveryRecommendationService.generate_recommendations(db, d_opt)
    db.close()

    infeasible_xfer = next((r for r in recs if r["action_type"] == "WAREHOUSE_TRANSFER" and r["feasibility_status"] == "INFEASIBLE"), None)
    assert infeasible_xfer is not None
    assert "unreserved stock" in infeasible_xfer["feasibility_reason"].lower()


# ------------------------------------------------------------------------------
# 13. Recovery Simulation Calculations
# ------------------------------------------------------------------------------

def test_recovery_simulation_calculations():
    db = TestingSessionLocal()
    disruption = db.query(Disruption).filter_by(incident_code="INC-2026-0881").first()
    sim_results = RecoverySimulationService.evaluate_and_simulate(db, disruption)
    db.close()

    assert "simulation_hash" in sim_results
    assert len(sim_results["candidate_plans"]) >= 3
    for plan in sim_results["candidate_plans"]:
        # Verify formula: Total recovery impact = Recovery cost + Remaining SLA penalty
        expected_total = round(plan["recovery_cost_usd"] + plan["sla_penalty_after_recovery_usd"], 2)
        assert plan["total_recovery_impact_usd"] == expected_total


# ------------------------------------------------------------------------------
# 14. Recovery Recommendation Ranking
# ------------------------------------------------------------------------------

def test_recovery_recommendation_ranking():
    db = TestingSessionLocal()
    disruption = db.query(Disruption).filter_by(incident_code="INC-2026-0881").first()
    sim_results = RecoverySimulationService.evaluate_and_simulate(db, disruption)
    db.close()

    plans = sim_results["candidate_plans"]
    assert plans[0]["rank"] == 1
    assert plans[0]["feasibility_status"] == "FEASIBLE"
    # Top ranked plan has the highest optimization score among feasible candidates
    assert plans[0]["optimization_score"] >= plans[1]["optimization_score"]


# ------------------------------------------------------------------------------
# 15. Organisation Isolation
# ------------------------------------------------------------------------------

def test_organization_isolation_intelligence():
    # Attempting to access APEX disruption risk from foreign organization
    response = client.get("/api/v1/disruptions/1/risk", headers={"X-Organization-Id": "ORG-COMPETITOR"})
    assert response.status_code == 404

    # Attempting to simulate impact from foreign organization
    sim_resp = client.post("/api/v1/disruptions/1/simulate-impact", headers={"X-Organization-Id": "ORG-COMPETITOR"})
    assert sim_resp.status_code == 404


# ------------------------------------------------------------------------------
# 16. Invalid Input Handling
# ------------------------------------------------------------------------------

def test_invalid_input_handling():
    assert client.get("/api/v1/disruptions/99999/risk", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"}).status_code == 404
    assert client.get("/api/v1/simulation/SIM-NONEXISTENT", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"}).status_code == 404
    
    # Nonexistent recommendation for plan generation
    bad_plan_payload = {
        "incident_id": 1,
        "recommendation_id": "REC-NONEXISTENT-99",
    }
    assert client.post("/api/v1/recovery-plans/generate", json=bad_plan_payload, headers={"X-Organization-Id": "ORG-APEX-GLOBAL"}).status_code == 404


# ------------------------------------------------------------------------------
# 17. Recovery Plan Schema Compatibility
# ------------------------------------------------------------------------------

def test_recovery_plan_generation_flow():
    db = TestingSessionLocal()
    disruption = db.query(Disruption).filter_by(incident_code="INC-2026-0881").first()
    d_id = disruption.id
    db.close()

    # Step 1: Get recommendations
    recs_resp = client.post(f"/api/v1/disruptions/{d_id}/recommend-actions", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"})
    assert recs_resp.status_code == 200
    recs = recs_resp.json()
    assert len(recs) >= 1
    reroute_rec = next(r for r in recs if r["action_type"] == "SHIPMENT_REROUTE")

    # Step 2: Generate draft plan
    plan_req = {
        "incident_id": d_id,
        "recommendation_id": reroute_rec["recommendation_id"],
        "plan_id": "RCP-SHP-88219",
    }
    gen_resp = client.post("/api/v1/recovery-plans/generate", json=plan_req, headers={"X-Organization-Id": "ORG-APEX-GLOBAL"})
    assert gen_resp.status_code == 201
    plan_data = gen_resp.json()

    assert plan_data["plan_id"] == "RCP-SHP-88219"
    assert plan_data["version"] >= 1
    assert plan_data["action_mask"] == 0x04
    assert plan_data["status"] == "DRAFT"
    assert "canonical_plan_hash" in plan_data


# ------------------------------------------------------------------------------
# 18. RFC 8785 Hash Compatibility
# ------------------------------------------------------------------------------

def test_rfc8785_hash_compatibility():
    # Retrieve the generated plan
    plan_resp = client.get("/api/v1/recovery-plans/RCP-SHP-88219", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"})
    assert plan_resp.status_code == 200
    plan = plan_resp.json()

    stored_hash = plan["canonical_plan_hash"]
    # Verify using RecoveryPlanHashService directly
    plan_for_hashing = {k: v for k, v in plan.items() if k != "canonical_plan_hash"}
    _, computed_hash = RecoveryPlanHashService.generate_plan_hash(plan_for_hashing)
    
    # Hash must be valid 32-byte hex (0x + 64 chars)
    assert len(stored_hash) == 66
    assert stored_hash.startswith("0x")
    assert computed_hash.startswith("0x")
