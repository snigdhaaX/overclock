import pytest
from unittest.mock import MagicMock
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from eth_account import Account
from eth_account.messages import encode_defunct

from backend.app.main import app
from backend.app.blockchain.database import Base, get_db
from backend.app.blockchain.database import create_all_tables, drop_all_tables
from backend.app.blockchain.routes import get_contract_service
from backend.app.blockchain.hash_service import RecoveryPlanHashService

@pytest.fixture
def client_and_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    create_all_tables(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    def override_get_db():
        try:
            yield session
        finally:
            pass

    mock_contract = MagicMock()
    mock_contract.is_connected = True
    mock_contract.contract_address = "0x1234567890123456789012345678901234567890"
    mock_contract.get_network_info.return_value = {
        "rpc_url": "https://rpc-amoy.polygon.technology/",
        "connected": True,
        "chain_id": 80002,
        "latest_block": 1000,
        "contract_address": "0x1234567890123456789012345678901234567890",
        "abi_loaded": True,
    }
    mock_contract.get_wallet.return_value = {
        "org_id": "0x" + "1" * 64,
        "categories": 1,
        "active": True,
        "registered_at": 1700000000,
        "revoked_at": 0,
    }

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_contract_service] = lambda: mock_contract

    client = TestClient(app)
    try:
        yield client, session, mock_contract
    finally:
        app.dependency_overrides.clear()
        session.close()

def test_health_check(client_and_db):
    client, _, _ = client_and_db
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "HEALTHY"

def test_network_endpoint(client_and_db):
    client, _, _ = client_and_db
    res = client.get("/blockchain/network")
    assert res.status_code == 200
    data = res.json()
    assert data["connected"] is True
    assert data["chain_id"] == 80002

def test_wallet_nonce_and_verify_flow(client_and_db):
    client, _, _ = client_and_db
    acct = Account.create()

    # 1. Request nonce
    res_nonce = client.post("/blockchain/wallet/nonce")
    assert res_nonce.status_code == 200
    nonce_data = res_nonce.json()
    assert "nonce" in nonce_data
    assert "message" in nonce_data

    # 2. Sign message
    sig = acct.sign_message(encode_defunct(text=nonce_data["message"]))

    # 3. Verify signature
    res_verify = client.post(
        "/blockchain/wallet/verify",
        json={
            "wallet_address": acct.address,
            "nonce": nonce_data["nonce"],
            "signature": sig.signature.hex(),
        },
    )
    assert res_verify.status_code == 200
    verify_data = res_verify.json()
    assert verify_data["status"] == "LINKED"
    assert verify_data["wallet_address"].lower() == acct.address.lower()

    # 4. Check linked wallet endpoint
    res_linked = client.get("/blockchain/wallet/linked")
    assert res_linked.status_code == 200
    linked_data = res_linked.json()
    assert linked_data["linked"] is True
    assert linked_data["wallet"]["wallet_address"].lower() == acct.address.lower()

def test_hash_generate_and_verify_endpoints(client_and_db):
    client, _, _ = client_and_db
    plan = {
        "plan_id": "RCP-1001",
        "version": 1,
        "disruption_id": "DISRUPT-1",
        "simulation_hash": "0x" + "a" * 64,
        "action_categories": [1],
        "recovery_actions": [],
        "estimated_total_cost": 5000.0,
        "currency": "USD",
    }
    res_gen = client.post("/blockchain/hash/generate", json={"plan_data": plan})
    assert res_gen.status_code == 200
    hash_data = res_gen.json()
    assert "sha256_hash" in hash_data
    assert "canonical_json" in hash_data

    # Verify endpoint
    res_ver = client.post(
        "/blockchain/hash/verify",
        json={"plan_data": plan, "expected_hash": hash_data["sha256_hash"]},
    )
    assert res_ver.status_code == 200
    assert res_ver.json()["valid"] is True

def test_transaction_register_and_query_flow(client_and_db):
    client, _, mock_contract = client_and_db
    tx_hash = "0x" + "7" * 64

    # Register
    res_reg = client.post(
        "/blockchain/transactions/register",
        json={
            "tx_hash": tx_hash,
            "chain_id": 80002,
            "function_name": "anchorPlan",
            "plan_id": "RCP-1001",
            "plan_version": 1,
        },
    )
    assert res_reg.status_code == 200
    assert res_reg.json()["status"] == "SUBMITTED"

    # Mock receipt
    mock_contract.get_transaction_receipt.return_value = {
        "blockNumber": 500,
        "status": 1,
        "gasUsed": 80000,
    }
    mock_contract.get_block_number.return_value = 503

    # Query status
    res_get = client.get(f"/blockchain/transactions/{tx_hash}")
    assert res_get.status_code == 200
    assert res_get.json()["status"] == "CONFIRMED"
    assert res_get.json()["confirmations"] == 4

    # Query tracked transactions list
    res_list = client.get("/blockchain/transactions/tracked")
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 1
    assert res_list.json()[0]["tx_hash"] == tx_hash

def test_plan_latest_version_and_events_endpoints(client_and_db):
    client, _, mock_contract = client_and_db
    mock_contract.get_latest_version.return_value = 2

    res_latest = client.get("/blockchain/plan/RCP-1001/latest")
    assert res_latest.status_code == 200
    assert res_latest.json()["latest_version"] == 2

    res_events = client.get("/blockchain/events")
    assert res_events.status_code == 200
    assert isinstance(res_events.json(), list)
