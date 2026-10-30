import pytest
from unittest.mock import MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.blockchain.database import Base
from backend.app.blockchain.database import create_all_tables, drop_all_tables
from backend.app.blockchain.hash_service import RecoveryPlanHashService
from backend.app.blockchain.verification_service import PlanVerificationService, VerificationResult

SAMPLE_PLAN = {
    "organization_id": "org:acme-logistics",
    "plan_id": "RCP-1001",
    "version": 1,
    "disruption_id": "DISRUPT-100",
    "simulation_hash": "0x" + "a" * 64,
    "action_categories": [1],
    "recovery_actions": [
        {
            "action_type": "WAREHOUSE_TRANSFER",
            "source_warehouse": "WH-A",
            "destination_warehouse": "WH-B",
            "quantity": 100,
            "estimated_cost": 2500.0,
            "currency": "USD",
        }
    ],
    "estimated_total_cost": 2500.0,
    "currency": "USD",
}

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    create_all_tables(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()

def test_matching_hashes_return_verified(db_session):
    """When DB plan hash equals on-chain hash and plan is approved, result is VERIFIED."""
    plan_id = "RCP-1001"
    version = 1
    PlanVerificationService.save_operational_plan(
        db_session, plan_id, version, "org:acme-logistics", SAMPLE_PLAN
    )
    _, expected_hash = RecoveryPlanHashService.generate_plan_hash(SAMPLE_PLAN)

    mock_contract = MagicMock()
    mock_contract.is_connected = True
    mock_contract.plan_exists.return_value = True
    mock_contract.get_latest_version.return_value = 1
    mock_contract.get_plan_version.return_value = {
        "plan_hash": expected_hash,
        "status": "APPROVED",
        "required_stages": 1,
        "completed_stages": 1,
        "execution_evidence_hash": None,
    }
    mock_contract.execution_eligibility.return_value = (True, "ELIGIBLE")
    mock_contract.get_decisions.return_value = []

    res = PlanVerificationService.verify_plan_integrity(
        db_session, plan_id, version, mock_contract
    )
    assert res["result"] == VerificationResult.VERIFIED
    assert res["hashes_match"] is True
    assert res["database_hash"].lower() == expected_hash.lower()
    assert res["is_current_version"] is True

def test_modified_plan_returns_hash_mismatch(db_session):
    """When plan data in database has been tampered with, result is HASH_MISMATCH."""
    plan_id = "RCP-1001"
    version = 1
    tampered_plan = dict(SAMPLE_PLAN, estimated_total_cost=99999.00)
    PlanVerificationService.save_operational_plan(
        db_session, plan_id, version, "org:acme-logistics", tampered_plan
    )

    # On-chain holds original hash
    _, original_hash = RecoveryPlanHashService.generate_plan_hash(SAMPLE_PLAN)

    mock_contract = MagicMock()
    mock_contract.is_connected = True
    mock_contract.plan_exists.return_value = True
    mock_contract.get_latest_version.return_value = 1
    mock_contract.get_plan_version.return_value = {
        "plan_hash": original_hash,  # Differs from tampered plan
        "status": "APPROVED",
        "required_stages": 1,
        "completed_stages": 1,
    }

    res = PlanVerificationService.verify_plan_integrity(
        db_session, plan_id, version, mock_contract
    )
    assert res["result"] == VerificationResult.HASH_MISMATCH
    assert res["hashes_match"] is False
    assert res["database_hash"].lower() != res["on_chain_hash"].lower()

def test_missing_anchor_returns_not_anchored(db_session):
    """When plan exists in DB but not on smart contract, result is NOT_ANCHORED."""
    plan_id = "RCP-1001"
    version = 1
    PlanVerificationService.save_operational_plan(
        db_session, plan_id, version, "org:acme-logistics", SAMPLE_PLAN
    )

    mock_contract = MagicMock()
    mock_contract.is_connected = True
    mock_contract.plan_exists.return_value = False

    res = PlanVerificationService.verify_plan_integrity(
        db_session, plan_id, version, mock_contract
    )
    assert res["result"] == VerificationResult.NOT_ANCHORED
    assert res["hashes_match"] is False

def test_superseded_version_reported(db_session):
    """Historical version whose hash matches but a newer version exists returns SUPERSEDED."""
    plan_id = "RCP-1001"
    version = 1
    PlanVerificationService.save_operational_plan(
        db_session, plan_id, version, "org:acme-logistics", SAMPLE_PLAN
    )
    _, expected_hash = RecoveryPlanHashService.generate_plan_hash(SAMPLE_PLAN)

    mock_contract = MagicMock()
    mock_contract.is_connected = True
    mock_contract.plan_exists.return_value = True
    mock_contract.get_latest_version.return_value = 2  # Current is V2
    mock_contract.get_plan_version.return_value = {
        "plan_hash": expected_hash,
        "status": "SUPERSEDED",
        "required_stages": 1,
        "completed_stages": 1,
        "execution_evidence_hash": None,
    }
    mock_contract.execution_eligibility.return_value = (False, "NOT_CURRENT_VERSION")
    mock_contract.get_decisions.return_value = []

    res = PlanVerificationService.verify_plan_integrity(
        db_session, plan_id, version, mock_contract
    )
    assert res["result"] == VerificationResult.SUPERSEDED
    assert res["hashes_match"] is True
    assert res["is_current_version"] is False
    assert res["latest_on_chain_version"] == 2

def test_rpc_outage_never_returns_verified(db_session):
    """When RPC is disconnected, verification returns RPC_UNAVAILABLE."""
    plan_id = "RCP-1001"
    version = 1
    PlanVerificationService.save_operational_plan(
        db_session, plan_id, version, "org:acme-logistics", SAMPLE_PLAN
    )

    mock_contract = MagicMock()
    mock_contract.is_connected = False
    mock_contract._mock_mode = False

    res = PlanVerificationService.verify_plan_integrity(
        db_session, plan_id, version, mock_contract
    )
    assert res["result"] == VerificationResult.RPC_UNAVAILABLE
