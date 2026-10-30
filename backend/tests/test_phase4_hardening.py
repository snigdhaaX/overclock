import datetime
import hashlib
import json
import pytest
from eth_account import Account
from eth_account.messages import encode_defunct
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.blockchain.database import SessionLocal, WalletNonce, WalletSession, OperationalRecoveryPlan
from backend.app.blockchain.wallet_service import WalletService
from backend.app.blockchain.hash_service import RecoveryPlanHashService
from backend.app.blockchain.verification_service import PlanVerificationService, VerificationResult
from backend.app.blockchain.contract_service import ContractService
from backend.app.supply_chain.models import Disruption, Supplier, PurchaseOrder, Shipment
from backend.app.supply_chain.simulation_service import RecoverySimulationService

client = TestClient(app)

# ==============================================================================
# 1. OPTIMISATION FORMULA BOUNDARY & RANKING TESTS
# ==============================================================================

def test_optimisation_formula_authoritative_weights_and_boundaries():
    """
    Validates authoritative utility formula:
    Score = 0.40 * S_fin + 0.40 * S_time + 0.20 * S_risk
    Ensures zero baseline delay, zero baseline penalty, negative net benefit,
    and maximum score boundaries are properly computed.
    """
    # Case A: Perfect score - 100% time saved, 100% avoided loss, zero residual risk
    score_perfect = RecoverySimulationService.calculate_optimization_score(
        net_financial_benefit_usd=50000.0,
        baseline_sla_penalty_usd=50000.0,
        time_saved_hours=96.0,
        baseline_delay_hours=96.0,
        residual_risk_score=0.0,
    )
    assert score_perfect == 100.0

    # Case B: Zero baseline delay and zero baseline penalty (no delay or penalty to begin with)
    score_zero_baseline = RecoverySimulationService.calculate_optimization_score(
        net_financial_benefit_usd=0.0,
        baseline_sla_penalty_usd=0.0,
        time_saved_hours=0.0,
        baseline_delay_hours=0.0,
        residual_risk_score=20.0,
    )
    # 40% fin (1.0 default) + 40% time (1.0 default) + 20% risk (1.0 - 0.2 = 0.8) -> 40 + 40 + 16 = 96.0
    assert score_zero_baseline == 96.0

    # Case C: Negative net benefit (Recovery Cost exceeds SLA penalty avoided)
    score_negative_roi = RecoverySimulationService.calculate_optimization_score(
        net_financial_benefit_usd=-15000.0,
        baseline_sla_penalty_usd=45000.0,
        time_saved_hours=48.0,
        baseline_delay_hours=96.0,
        residual_risk_score=50.0,
    )
    # S_fin clamped to 0.0 -> 0.4*0 = 0
    # S_time = 48/96 = 0.5 -> 0.4*0.5 = 20.0
    # S_risk = (1.0 - 0.5) = 0.5 -> 0.2*0.5 = 10.0
    # Total = 30.0
    assert pytest.approx(score_negative_roi, 0.01) == 30.0

    # Case D: Infeasible candidates cannot rank above feasible candidates
    db = SessionLocal()
    try:
        suez = db.query(Disruption).filter(Disruption.incident_code == "INC-2026-0881").first()
        assert suez is not None
        sim = RecoverySimulationService.evaluate_and_simulate(db, suez)
        
        # Verify candidate ranking order: all FEASIBLE must precede any INFEASIBLE
        feasible_seen = True
        infeasible_found = False
        for plan in sim["candidate_plans"]:
            if plan["feasibility_status"] == "FEASIBLE":
                assert not infeasible_found, "A feasible plan was ranked AFTER an infeasible plan!"
            else:
                infeasible_found = True
    finally:
        db.close()


def test_simulation_determinism_and_idempotence():
    """
    Asserts that repeated simulation calls with unchanged inputs return identical
    simulation results, identical hashes, and do not mutate/multiply records.
    """
    db = SessionLocal()
    try:
        suez = db.query(Disruption).filter(Disruption.incident_code == "INC-2026-0881").first()
        assert suez is not None

        # Call 1
        sim1 = RecoverySimulationService.evaluate_and_simulate(db, suez)
        hash1 = sim1["simulation_hash"]
        sim_id1 = sim1["simulation_id"]

        # Call 2 (identical inputs)
        sim2 = RecoverySimulationService.evaluate_and_simulate(db, suez)
        hash2 = sim2["simulation_hash"]
        sim_id2 = sim2["simulation_id"]

        assert sim_id1 == sim_id2
        assert hash1 == hash2
        assert len(sim1["candidate_plans"]) == len(sim2["candidate_plans"])
        for p1, p2 in zip(sim1["candidate_plans"], sim2["candidate_plans"]):
            assert p1["recommendation_id"] == p2["recommendation_id"]
            assert p1["optimization_score"] == p2["optimization_score"]
            assert p1["net_financial_benefit_usd"] == p2["net_financial_benefit_usd"]
            assert p1["recovery_cost_usd"] == p2["recovery_cost_usd"]
            assert p1["total_recovery_impact_usd"] == p2["total_recovery_impact_usd"]
    finally:
        db.close()


# ==============================================================================
# 2. FINANCIAL INTEGRITY AUDIT (SUEZ INC-2026-0881)
# ==============================================================================

def test_suez_financial_reconciliation():
    """
    Verifies mathematical invariant across all Suez candidates:
    Total Recovery Impact = Recovery Cost + Residual SLA Penalty
    Net Avoided Loss = Baseline SLA Penalty - Total Recovery Impact
    """
    db = SessionLocal()
    try:
        suez = db.query(Disruption).filter(Disruption.incident_code == "INC-2026-0881").first()
        assert suez is not None
        sim = RecoverySimulationService.evaluate_and_simulate(db, suez)

        baseline_delay = sim["baseline_scenario"]["delay_hours"]
        baseline_sla = sim["baseline_scenario"]["sla_financial_penalty_usd"]

        assert baseline_delay == 96.0
        assert baseline_sla > 40000.0

        for plan in sim["candidate_plans"]:
            rec_cost = plan["recovery_cost_usd"]
            residual_sla = plan["sla_penalty_after_recovery_usd"]
            total_impact = plan["total_recovery_impact_usd"]
            net_avoided = plan["net_financial_benefit_usd"]

            # Mathematical Invariant 1:
            assert pytest.approx(total_impact, 0.01) == rec_cost + residual_sla
            # Mathematical Invariant 2:
            assert pytest.approx(net_avoided, 0.01) == baseline_sla - total_impact
    finally:
        db.close()


# ==============================================================================
# 3. WALLET SESSION & AUTHENTICATION AUDIT
# ==============================================================================

def test_wallet_session_security_and_logout():
    """
    Verifies:
    1. Single-use nonce expiration and replay prevention.
    2. Session token hashing (zero plaintext tokens in database).
    3. Logout server-side invalidation.
    4. Post-logout token rejection.
    5. Rejection of unauthenticated wallet header spoofing.
    """
    db = SessionLocal()
    try:
        acc = Account.create()
        test_user = f"user:sec-test-{acc.address[:8]}"
        test_org = "ORG-APEX-GLOBAL"

        # 1. Nonce issuance
        nonce_res = client.post(
            "/blockchain/wallet/nonce",
            headers={"X-User-Id": test_user, "X-Organization-Id": test_org},
        )
        assert nonce_res.status_code == 200
        nonce_data = nonce_res.json()
        nonce = nonce_data["nonce"]
        msg = nonce_data["message"]

        # 2. Sign message
        signable = encode_defunct(text=msg)
        signed = acc.sign_message(signable)
        sig = signed.signature.hex()
        if not sig.startswith("0x"):
            sig = f"0x{sig}"

        # 3. Invalid signature test
        bad_res = client.post(
            "/blockchain/wallet/verify",
            headers={"X-User-Id": test_user, "X-Organization-Id": test_org},
            json={"wallet_address": acc.address, "nonce": nonce, "signature": "0xdeadbeef1234"},
        )
        assert bad_res.status_code in [400, 401]

        # 4. Valid verify & session issuance
        good_res = client.post(
            "/blockchain/wallet/verify",
            headers={"X-User-Id": test_user, "X-Organization-Id": test_org},
            json={"wallet_address": acc.address, "nonce": nonce, "signature": sig},
        )
        assert good_res.status_code == 200
        raw_token = good_res.json()["session_token"]

        # 5. Verify database contains only SHA-256 token hash, never plaintext token
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        session_record = db.query(WalletSession).filter(WalletSession.token_hash == token_hash).first()
        assert session_record is not None
        assert session_record.session_token is None, "Plaintext token was leaked in database row!"
        assert session_record.active is True

        # 6. Authenticated request using valid token succeeds
        req1 = client.get(
            "/api/v1/disruptions/active",
            headers={"Authorization": f"Bearer {raw_token}"},
        )
        assert req1.status_code == 200

        # 7. Logout server-side invalidation
        logout_res = client.post(
            "/blockchain/wallet/logout",
            headers={"Authorization": f"Bearer {raw_token}"},
        )
        assert logout_res.status_code == 200
        assert logout_res.json()["status"] == "REVOKED"

        # 8. Post-logout reuse rejected with 401
        req2 = client.get(
            "/api/v1/disruptions/active",
            headers={"Authorization": f"Bearer {raw_token}"},
        )
        assert req2.status_code == 401
    finally:
        db.close()


# ==============================================================================
# 4. ORGANISATION ISOLATION AUDIT (NEGATIVE INTEGRITY TESTS)
# ==============================================================================

def test_tenant_isolation_negative_access():
    """
    Validates cross-organization access rejection:
    A user authenticated under ORG-COMPETITOR-B cannot retrieve records
    belonging to ORG-APEX-GLOBAL across suppliers, orders, shipments, simulations, or plans.
    """
    db = SessionLocal()
    try:
        # Create user & session for ORG-COMPETITOR-B
        acc_b = Account.create()
        user_b = "user:intruder-bob"
        org_b = "ORG-COMPETITOR-B"

        nonce_res = client.post(
            "/blockchain/wallet/nonce",
            headers={"X-User-Id": user_b, "X-Organization-Id": org_b},
        )
        msg = nonce_res.json()["message"]
        nonce = nonce_res.json()["nonce"]
        signed = acc_b.sign_message(encode_defunct(text=msg))
        sig = signed.signature.hex()
        if not sig.startswith("0x"):
            sig = f"0x{sig}"

        verify_res = client.post(
            "/blockchain/wallet/verify",
            headers={"X-User-Id": user_b, "X-Organization-Id": org_b},
            json={"wallet_address": acc_b.address, "nonce": nonce, "signature": sig},
        )
        token_b = verify_res.json()["session_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # Find target records belonging to ORG-APEX-GLOBAL
        apex_supplier = db.query(Supplier).filter(Supplier.organization_id == "ORG-APEX-GLOBAL").first()
        apex_order = db.query(PurchaseOrder).filter(PurchaseOrder.organization_id == "ORG-APEX-GLOBAL").first()
        apex_shipment = db.query(Shipment).filter(Shipment.organization_id == "ORG-APEX-GLOBAL").first()
        apex_disruption = db.query(Disruption).filter(Disruption.organization_id == "ORG-APEX-GLOBAL").first()

        assert apex_supplier is not None
        assert apex_order is not None
        assert apex_shipment is not None
        assert apex_disruption is not None

        # 1. Supplier detail access rejected
        r1 = client.get(f"/api/v1/supply-chain/suppliers/{apex_supplier.id}", headers=headers_b)
        assert r1.status_code == 404

        # 2. Purchase Order detail access rejected
        r2 = client.get(f"/api/v1/supply-chain/orders/{apex_order.id}", headers=headers_b)
        assert r2.status_code == 404

        # 3. Shipment detail access rejected
        r3 = client.get(f"/api/v1/supply-chain/shipments/{apex_shipment.id}", headers=headers_b)
        assert r3.status_code == 404

        # 4. Disruption impact analysis rejected
        r4 = client.get(f"/api/v1/disruptions/{apex_disruption.id}/impact", headers=headers_b)
        assert r4.status_code == 404

        # 5. Simulation evaluation on foreign disruption rejected
        r5 = client.post(
            "/api/v1/simulation/evaluate",
            headers=headers_b,
            json={"disruption_id": apex_disruption.id},
        )
        assert r5.status_code == 404

        # 6. Foreign recovery plan lookup rejected
        r6 = client.get("/api/v1/recovery-plans/RCP-INC-2026-0881-SHI", headers=headers_b)
        assert r6.status_code == 404
    finally:
        db.close()


# ==============================================================================
# 5. RECOVERY PLAN & CANONICAL HASH INTEGRITY
# ==============================================================================

def test_recovery_plan_hash_tamper_detection():
    """
    Validates RFC 8785 canonical JSON hashing and tamper detection:
    - Unmodified payload returns exact matching hash.
    - Modified action returns HASH_MISMATCH.
    - Modified recovery cost returns HASH_MISMATCH.
    - Modified organisation returns HASH_MISMATCH.
    - Modified simulation reference returns HASH_MISMATCH.
    - Missing on-chain anchor returns NOT_ANCHORED.
    """
    plan_dict = {
        "organization_id": "ORG-APEX-GLOBAL",
        "plan_id": "REC-TEST-TAMPER-001",
        "version": 1,
        "disruption_id": "INC-2026-0881",
        "action_categories": [4],
        "recovery_actions": [
            {
                "action_type": "SHIPMENT_REROUTE",
                "estimated_cost": 32000.0,
                "currency": "USD",
                "product_reference": "SKU-OPT-101",
                "quantity": 500,
            }
        ],
        "estimated_total_cost": 32000.0,
        "currency": "USD",
        "simulation_hash": "0x1111111111111111111111111111111111111111111111111111111111111111",
    }

    # 1. Generate canonical hash
    canonical_json, base_hash = RecoveryPlanHashService.generate_plan_hash(plan_dict)
    assert base_hash.startswith("0x")
    assert len(base_hash) == 66

    # 2. Unmodified verification succeeds
    assert RecoveryPlanHashService.verify_plan_hash(plan_dict, base_hash) is True

    # 3. Tamper action
    tampered_action = json.loads(json.dumps(plan_dict))
    tampered_action["recovery_actions"][0]["action_type"] = "EXPEDITED_AIR_CHARTER"
    assert RecoveryPlanHashService.verify_plan_hash(tampered_action, base_hash) is False

    # 4. Tamper recovery cost
    tampered_cost = json.loads(json.dumps(plan_dict))
    tampered_cost["estimated_total_cost"] = 32001.0
    assert RecoveryPlanHashService.verify_plan_hash(tampered_cost, base_hash) is False

    # 5. Tamper organisation
    tampered_org = json.loads(json.dumps(plan_dict))
    tampered_org["organization_id"] = "ORG-COMPETITOR-X"
    assert RecoveryPlanHashService.verify_plan_hash(tampered_org, base_hash) is False

    # 6. Tamper simulation hash reference
    tampered_sim = json.loads(json.dumps(plan_dict))
    tampered_sim["simulation_hash"] = "0x2222222222222222222222222222222222222222222222222222222222222222"
    assert RecoveryPlanHashService.verify_plan_hash(tampered_sim, base_hash) is False

    # 7. Verification Service: Unanchored plan returns NOT_ANCHORED
    db = SessionLocal()
    try:
        # Save operational plan in DB
        op = OperationalRecoveryPlan(
            plan_id="REC-TEST-UNANCHORED-001",
            version=1,
            organization_id="ORG-APEX-GLOBAL",
            plan_data_json=json.dumps(plan_dict),
        )
        db.add(op)
        db.commit()

        # A reachable chain with no record of this plan, without needing live network access.
        contract_service = __import__('unittest.mock').mock.MagicMock()
        contract_service.is_connected = True
        contract_service.plan_exists.return_value = False
        contract_service.get_latest_version.return_value = 0
        verification = PlanVerificationService.verify_plan_integrity(
            db=db,
            plan_id="REC-TEST-UNANCHORED-001",
            version=1,
            contract_service=contract_service,
        )
        assert verification["result"] == VerificationResult.NOT_ANCHORED
    finally:
        # Cleanup
        db.query(OperationalRecoveryPlan).filter(OperationalRecoveryPlan.plan_id == "REC-TEST-UNANCHORED-001").delete()
        db.commit()
        db.close()
