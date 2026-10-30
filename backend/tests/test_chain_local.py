"""The workflow with real transactions on a local Hardhat node. Skipped when no node is running.

Start it with: cd blockchain && npx hardhat node, then npx hardhat run scripts/deploy.js --network localhost
"""
import datetime
import json
import uuid
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from web3 import Web3
from backend.app.blockchain.database import create_all_tables, get_db
from backend.app.main import app
from backend.app.models.intelligence import Disruption
from backend.app.models.recovery import Approval, RecoveryPlanAction
from backend.app.ops import chain, seed as seed_module

RPC = "http://127.0.0.1:8545"
DEPLOYMENT = Path(__file__).resolve().parents[2] / "blockchain" / "deployments" / "localhost.json"
# Hardhat's published default accounts, which only exist on a local test chain.
ADMIN_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
ANALYST_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
MANAGER_KEY = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
ORG = b"TRUSTCHAIN-LOCAL".ljust(32, b"\0")
WEBHOOK = {"X-Webhook-Secret": "demo-carrier-secret"}


def _node():
    w3 = Web3(Web3.HTTPProvider(RPC, request_kwargs={"timeout": 3}))
    try:
        ready = w3.is_connected() and w3.eth.chain_id == 31337 and DEPLOYMENT.exists()
    except Exception:
        ready = False
    if not ready or not w3.eth.get_code(Web3.to_checksum_address(json.loads(DEPLOYMENT.read_text())["address"])):
        pytest.skip("Local Hardhat node with a deployed contract isn't running.")
    return w3


@pytest.fixture
def client(tmp_path, monkeypatch):
    w3 = _node()
    monkeypatch.setenv("POLYGON_AMOY_RPC_URL", RPC)
    monkeypatch.setenv("TRUSTCHAIN_DEPLOYMENT_FILE", str(DEPLOYMENT))
    monkeypatch.setenv("TRUSTCHAIN_KEY_ANALYST", ANALYST_KEY)
    monkeypatch.setenv("TRUSTCHAIN_KEY_MANAGER", MANAGER_KEY)
    monkeypatch.delenv("TRUSTCHAIN_CONTRACT_ADDRESS", raising=False)

    deployment = json.loads(DEPLOYMENT.read_text())
    contract = w3.eth.contract(address=Web3.to_checksum_address(deployment["address"]), abi=deployment["abi"])
    admin = w3.eth.account.from_key(ADMIN_KEY)
    for key, category in ((ANALYST_KEY, 0x01), (MANAGER_KEY, 0x02)):
        wallet = w3.eth.account.from_key(key).address
        if not contract.functions.isActiveWallet(wallet).call():
            tx = contract.functions.registerWallet(wallet, ORG, category).build_transaction({"from": admin.address, "nonce": w3.eth.get_transaction_count(admin.address)})
            w3.eth.wait_for_transaction_receipt(w3.eth.send_raw_transaction(admin.sign_transaction(tx).raw_transaction))

    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    event.listen(engine, "connect", lambda conn, _: conn.execute("PRAGMA foreign_keys=ON"))
    create_all_tables(engine)
    session = sessionmaker(bind=engine)()
    seed_module.seed(session, train_model=False)
    app.dependency_overrides[get_db] = lambda: session
    test_client = TestClient(app)
    test_client.db = session
    test_client.w3 = w3
    yield test_client
    app.dependency_overrides.pop(get_db, None)
    session.close()


def login(client, email):
    token = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"}).json()["tokens"]["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def delayed_plan(client, analyst):
    client.post("/api/v1/webhooks/carriers/simulated", headers=WEBHOOK, json={
        "event_id": uuid.uuid4().hex, "carrier": "FastTrack", "shipment_id": "SHP-101", "event_type": "SHIPMENT_DELAYED",
        "event_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(), "estimated_delay_hours": 96, "reason": "Port congestion",
    })
    original = chain.to_bytes32
    # Plan ids must be new on each run, because the chain outlives the test database.
    suffix = uuid.uuid4().hex[:6]
    return "RP-SHP-101-reroute", suffix, original


def test_real_transactions_from_submission_to_verified(client, monkeypatch):
    analyst, manager = login(client, "analyst@trustchain.com"), login(client, "manager@trustchain.com")
    plan, suffix, original = delayed_plan(client, analyst)
    monkeypatch.setattr(chain, "to_bytes32", lambda value: original(f"{value[:24]}{suffix}"))

    submitted = client.post(f"/api/v1/recovery/plans/{plan}/submit", headers=analyst)
    assert submitted.status_code == 200, submitted.text
    anchor = submitted.json()["anchor"]
    assert anchor["error"] is None, anchor
    assert client.w3.eth.get_transaction_receipt(anchor["tx_hash"])["status"] == 1

    # Before approval the chain itself records this hash.
    assert client.get(f"/api/v1/blockchain/verify/plan/{plan}", headers=manager).json()["result"] == "VERIFIED"

    assert client.post(f"/api/v1/approvals/{plan}/approve", headers=manager, json={"comments": "OK"}).json()["status"] == "APPROVED"
    state = client.get("/api/v1/app/bootstrap", headers=manager).json()
    view = next(p for p in state["recoveryPlans"] if p["id"] == plan)
    assert view["chainStatus"] == "CHAIN_CONFIRMED"
    assert client.w3.eth.get_transaction_receipt(view["txHash"])["status"] == 1

    executed = client.post(f"/api/v1/execution/{plan}/confirm", headers=manager)
    assert executed.status_code == 200, executed.text
    events = [e for e in client.get("/api/v1/app/bootstrap", headers=manager).json()["auditEvents"] if e["description"].startswith("Execution completed")]
    assert client.w3.eth.get_transaction_receipt(events[0]["txHash"])["status"] == 1


def test_a_plan_changed_after_anchoring_fails_verification_and_cannot_run(client, monkeypatch):
    analyst, manager = login(client, "analyst@trustchain.com"), login(client, "manager@trustchain.com")
    plan, suffix, original = delayed_plan(client, analyst)
    monkeypatch.setattr(chain, "to_bytes32", lambda value: original(f"{value[:24]}{suffix}"))
    assert client.post(f"/api/v1/recovery/plans/{plan}/submit", headers=analyst).status_code == 200
    assert client.post(f"/api/v1/approvals/{plan}/approve", headers=manager, json={}).status_code == 200

    action = client.db.query(RecoveryPlanAction).first()
    action.parameters = {**action.parameters, "quantity": action.parameters["quantity"] + 1}
    client.db.commit()

    assert client.get(f"/api/v1/blockchain/verify/plan/{plan}", headers=manager).json()["result"] == "HASH_MISMATCH"
    blocked = client.post(f"/api/v1/execution/{plan}/confirm", headers=manager)
    assert blocked.status_code == 409
    assert blocked.json()["detail"]["code"] == "PLAN_CHANGED"


def test_self_approval_is_rejected_by_the_contract_too(client, monkeypatch):
    """The analyst wallet tries to approve on-chain directly, going around the API."""
    analyst = login(client, "analyst@trustchain.com")
    plan, suffix, original = delayed_plan(client, analyst)
    monkeypatch.setattr(chain, "to_bytes32", lambda value: original(f"{value[:24]}{suffix}"))
    assert client.post(f"/api/v1/recovery/plans/{plan}/submit", headers=analyst).status_code == 200
    monkeypatch.setenv("TRUSTCHAIN_KEY_MANAGER", ANALYST_KEY)
    with pytest.raises(Exception):
        chain.approve_plan(plan, 1)


def test_chain_down_keeps_the_approval_honest(client, monkeypatch):
    analyst, manager = login(client, "analyst@trustchain.com"), login(client, "manager@trustchain.com")
    plan, _, _ = delayed_plan(client, analyst)
    monkeypatch.setenv("POLYGON_AMOY_RPC_URL", "http://127.0.0.1:9")
    submitted = client.post(f"/api/v1/recovery/plans/{plan}/submit", headers=analyst)
    assert submitted.status_code == 200
    assert submitted.json()["anchor"]["chain_status"] == "CHAIN_FAILED"
    assert submitted.json()["anchor"]["tx_hash"] is None
    assert client.post(f"/api/v1/approvals/{plan}/approve", headers=manager, json={}).status_code == 200
    # Execution waits for a confirmation that can't exist yet.
    assert client.post(f"/api/v1/execution/{plan}/confirm", headers=manager).status_code == 409
    assert client.db.query(Approval).one().chain_status == "CHAIN_FAILED"
