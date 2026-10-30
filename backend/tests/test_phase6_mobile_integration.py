"""
TrustChain Phase 6: Mobile Blockchain Integration Test Suite
Validates the complete interaction lifecycle between the React Native / Expo mobile application
and the FastAPI blockchain backend.
"""

import pytest
from fastapi.testclient import TestClient
from eth_account import Account
from eth_account.messages import encode_defunct
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.blockchain.database import Base, get_db, OperationalRecoveryPlan
from backend.app.blockchain.routes import router
from backend.app.blockchain.wallet_service import WalletService
from backend.app.blockchain.hash_service import (
    RecoveryPlanHashService,
    SCHEMA_VERSION_V2,
    ZERO_MANIFEST_SENTINEL,
)
from fastapi import FastAPI

# Build test FastAPI app
test_app = FastAPI()
test_app.include_router(router)


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(test_db):
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    test_app.dependency_overrides[get_db] = override_get_db
    with TestClient(test_app) as c:
        yield c
    test_app.dependency_overrides.clear()


# ==============================================================================
# 1. MOBILE WALLET AUTHENTICATION & SESSION PERSISTENCE
# ==============================================================================

def test_mobile_wallet_nonce_and_verification(client, test_db):
    """
    Mobile client requests a single-use EIP-191 nonce, signs it using an external wallet,
    verifies it against FastAPI, and receives a cryptographic session token.
    """
    user_id = "user:analyst-001"
    org_id = "ORG-APEX-GLOBAL"
    acct = Account.create()

    # 1. Mobile requests nonce
    headers = {
        "X-User-Id": user_id,
        "X-Organization-Id": org_id,
        "X-User-Roles": "operations_analyst",
    }
    resp = client.post("/blockchain/wallet/nonce", headers=headers)
    assert resp.status_code == 200
    nonce_data = resp.json()
    assert "nonce" in nonce_data
    assert "message" in nonce_data
    assert nonce_data["user_id"] == user_id
    assert nonce_data["organization_id"] == org_id

    # 2. External wallet signs EIP-191 message
    signable = encode_defunct(text=nonce_data["message"])
    sig = acct.sign_message(signable)
    sig_hex = sig.signature.hex()
    if not sig_hex.startswith("0x"):
        sig_hex = "0x" + sig_hex

    # 3. Mobile submits signature to verify
    verify_resp = client.post(
        "/blockchain/wallet/verify",
        headers=headers,
        json={
            "wallet_address": acct.address,
            "nonce": nonce_data["nonce"],
            "signature": sig_hex,
        },
    )
    assert verify_resp.status_code == 200
    verify_data = verify_resp.json()
    assert verify_data["status"] == "LINKED"
    assert verify_data["wallet_address"].lower() == acct.address.lower()
    assert "session_token" in verify_data
    session_token = verify_data["session_token"]

    # 4. Mobile uses session_token in Authorization: Bearer header to query linked wallet
    auth_headers = {
        "Authorization": f"Bearer {session_token}",
    }
    linked_resp = client.get("/blockchain/wallet/linked", headers=auth_headers)
    assert linked_resp.status_code == 200
    linked_data = linked_resp.json()
    assert linked_data["linked"] is True
    assert linked_data["wallet"]["wallet_address"].lower() == acct.address.lower()

    # 5. Mobile logs out and invalidates session
    logout_resp = client.post("/blockchain/wallet/logout", headers=auth_headers)
    assert logout_resp.status_code == 200
    assert logout_resp.json()["revoked"] is True

    # 6. Session token is no longer valid
    post_logout_resp = client.get("/blockchain/wallet/linked", headers=auth_headers)
    # Falls back to default anonymous or unlinked state
    assert post_logout_resp.json()["linked"] is False


def test_mobile_signature_replay_prevention(client, test_db):
    """Nonces are single-use and reject replay attacks from mobile clients."""
    user_id = "user:manager-002"
    org_id = "ORG-APEX-GLOBAL"
    acct = Account.create()

    headers = {"X-User-Id": user_id, "X-Organization-Id": org_id}
    resp = client.post("/blockchain/wallet/nonce", headers=headers)
    nonce_data = resp.json()

    signable = encode_defunct(text=nonce_data["message"])
    sig = acct.sign_message(signable)
    sig_hex = "0x" + sig.signature.hex() if not sig.signature.hex().startswith("0x") else sig.signature.hex()

    # First verification succeeds
    res1 = client.post(
        "/blockchain/wallet/verify",
        headers=headers,
        json={
            "wallet_address": acct.address,
            "nonce": nonce_data["nonce"],
            "signature": sig_hex,
        },
    )
    assert res1.status_code == 200

    # Replay attempt with the same nonce fails
    res2 = client.post(
        "/blockchain/wallet/verify",
        headers=headers,
        json={
            "wallet_address": acct.address,
            "nonce": nonce_data["nonce"],
            "signature": sig_hex,
        },
    )
    assert res2.status_code == 400
    assert "already consumed" in res2.json()["detail"].lower()


# ==============================================================================
# 2. CANONICAL HASH GENERATION & CROSS-TENANT DEFENSE
# ==============================================================================

def test_mobile_canonical_plan_hash_generation(client):
    """Mobile app can request deterministic RFC 8785 canonical hash for plan."""
    headers = {
        "X-User-Id": "user:analyst-001",
        "X-Organization-Id": "ORG-APEX-GLOBAL",
        "X-User-Roles": "operations_analyst",
    }
    plan_payload = {
        "plan_id": "RP-TEST-001",
        "version": 1,
        "disruption_id": "DIS-TEST-01",
        "organization_id": "ORG-APEX-GLOBAL",
        "title": "Air Freight Re-Route",
        "strategy": "Expedite shipment via Singapore corridor",
        "estimated_cost": 15000,
        "actions": [
            {"id": "ACT-1", "action_type": "reroute", "cost": 15000}
        ],
        "constraints": ["Within budget"],
        "schema_version": SCHEMA_VERSION_V2,
    }

    resp = client.post(
        "/blockchain/hash/generate",
        headers=headers,
        json={"plan_data": plan_payload},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "sha256_hash" in data
    assert data["sha256_hash"].startswith("0x")
    assert len(data["sha256_hash"]) == 66
    assert data["schema_version"] == SCHEMA_VERSION_V2
    assert "evidence_manifest_hash" in data

    # Verify matching hash
    verify_resp = client.post(
        "/blockchain/hash/verify",
        headers=headers,
        json={
            "plan_data": plan_payload,
            "expected_hash": data["sha256_hash"],
            "schema_version": SCHEMA_VERSION_V2,
        },
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["valid"] is True


def test_cross_tenant_hash_generation_rejected(client):
    """Enforces tenant boundary: user cannot request hash for foreign org_id."""
    headers = {
        "X-User-Id": "user:analyst-001",
        "X-Organization-Id": "ORG-APEX-GLOBAL",
    }
    foreign_plan = {
        "plan_id": "RP-TEST-002",
        "organization_id": "ORG-FOREIGN-CORP",
    }

    resp = client.post(
        "/blockchain/hash/generate",
        headers=headers,
        json={"plan_data": foreign_plan},
    )
    assert resp.status_code == 403
    assert "cross-tenant" in resp.json()["detail"].lower()


# ==============================================================================
# 3. REAL TRANSACTION REGISTRATION & TRACKING
# ==============================================================================

def test_mobile_transaction_registration_and_status(client, test_db):
    """Mobile registers a broadcasted transaction hash and queries its status."""
    headers = {
        "X-User-Id": "user:analyst-001",
        "X-Organization-Id": "ORG-APEX-GLOBAL",
    }
    tx_hash = "0x" + "a" * 64

    # 1. Register transaction
    reg_resp = client.post(
        "/blockchain/transactions/register",
        headers=headers,
        json={
            "tx_hash": tx_hash,
            "chain_id": 80002,
            "function_name": "anchorPlan",
            "plan_id": "RP-TEST-001",
            "plan_version": 1,
        },
    )
    assert reg_resp.status_code == 200
    tx_data = reg_resp.json()
    assert tx_data["tx_hash"] == tx_hash
    assert tx_data["status"] in ["SUBMITTED", "PENDING"]
    assert tx_data["plan_id"] == "RP-TEST-001"
    assert tx_data["plan_version"] == 1

    # 2. Query status
    status_resp = client.get(f"/blockchain/transactions/{tx_hash}")
    assert status_resp.status_code == 200
    assert status_resp.json()["tx_hash"] == tx_hash

    # 3. List tracked transactions
    list_resp = client.get("/blockchain/transactions/tracked")
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert any(t["tx_hash"] == tx_hash for t in items)


# ==============================================================================
# 4. OPERATIONAL PLAN STORAGE & VERIFICATION
# ==============================================================================

def test_operational_plan_storage_and_integrity(client, test_db):
    """Mobile analyst saves operational plan data to backend for verification."""
    headers = {
        "X-User-Id": "user:analyst-001",
        "X-Organization-Id": "ORG-APEX-GLOBAL",
        "X-User-Roles": "operations_analyst",
    }
    plan_data = {
        "plan_id": "RP-001",
        "version": 1,
        "disruption_id": "DIS-001",
        "strategy": "Express Reroute",
        "estimated_cost": 25000,
        "schema_version": SCHEMA_VERSION_V2,
    }

    save_resp = client.post(
        "/blockchain/plans/operational",
        headers=headers,
        json={
            "plan_id": "RP-001",
            "version": 1,
            "plan_data": plan_data,
        },
    )
    assert save_resp.status_code == 200
    assert save_resp.json()["status"] == "SAVED"

    # Query verification endpoint
    verif_resp = client.get(
        "/blockchain/verification/RP-001/1",
        headers=headers,
    )
    assert verif_resp.status_code == 200
    v_data = verif_resp.json()
    assert v_data["plan_id"] == "RP-001"
    assert v_data["version"] == 1
    assert "result" in v_data
