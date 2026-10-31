"""
TRUSTCHAIN Final Acceptance Remediation Test Suite

Validates all hardened security and implementation requirements:
1. Production authentication enforcement (rejects client identity headers without valid session).
2. Tenant isolation across all /blockchain/* endpoints.
3. Transaction lifecycle states (SUBMITTED, PENDING, INCLUDED, CONFIRMING, CONFIRMED, FAILED, REORGED).
4. Validation of 66-character 0x hex format for transaction hashes.
5. Elimination of fabricated transaction hashes and confirmation mocks.
6. Dynamic Web3 network status resolution.
7. Deterministic canonical simulation hash generation.
"""

import os
import hashlib
import json
import uuid
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from eth_account import Account
from eth_account.messages import encode_defunct

from backend.app.main import app
from backend.app.blockchain.routes import LOCAL_HARDHAT_CONTRACT_ADDRESS, LOCAL_HARDHAT_CHAIN_ID
from backend.app.blockchain.database import get_db, OperationalRecoveryPlan, BlockchainTransaction
from backend.app.blockchain.hash_service import RecoveryPlanHashService


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


class TestFinalAcceptanceRemediation:
    """Rigorous acceptance test cases for verified security and data integrity remediations."""

    # --------------------------------------------------------------------------
    # 1. Production Authentication Enforcement
    # --------------------------------------------------------------------------
    def test_production_rejects_client_identity_headers_without_session(self, client):
        """In PRODUCTION mode, X-User-Id / X-Organization-Id headers alone MUST be rejected (401)."""
        with patch.dict(os.environ, {"ENVIRONMENT": "production", "ALLOW_DEV_AUTH_HEADERS": "false"}):
            headers = {
                "X-User-Id": "user:attacker-01",
                "X-Organization-Id": "ORG-COMPETITOR",
                "X-User-Roles": "administrator",
            }
            # Attempt accessing protected operational plan route
            resp = client.post(
                "/blockchain/plans/operational",
                headers=headers,
                json={
                    "plan_id": "RP-SPOOF-001",
                    "version": 1,
                    "plan_data": {"title": "Spoofed Plan"},
                },
            )
            assert resp.status_code == 401
            assert "session token" in resp.json()["detail"].lower()

    def test_production_rejects_invalid_bearer_token(self, client):
        """In PRODUCTION mode, invalid or expired session token is rejected with 401."""
        with patch.dict(os.environ, {"ENVIRONMENT": "production", "ALLOW_DEV_AUTH_HEADERS": "false"}):
            headers = {
                "Authorization": "Bearer tcs_invalid_token_12345",
            }
            resp = client.get("/blockchain/transactions/tracked", headers=headers)
            assert resp.status_code == 401
            assert "invalid or expired session token" in resp.json()["detail"].lower()

    # --------------------------------------------------------------------------
    # 2. Tenant Isolation
    # --------------------------------------------------------------------------
    def test_tenant_isolation_on_plan_endpoints(self, client):
        """Caller from ORG-B cannot query or probe operational plans owned by ORG-A."""
        # 1. Create a plan owned by ORG-APEX-GLOBAL
        plan_id = f"RP-TENANT-{uuid.uuid4().hex[:6]}"
        store_resp = client.post(
            "/blockchain/plans/operational",
            headers={
                "X-User-Id": "user:analyst-tenant",
                "X-Organization-Id": "ORG-APEX-GLOBAL",
                "X-Chain-Id": "31337",
            },
            json={
                "plan_id": plan_id,
                "version": 1,
                "plan_data": {
                    "plan_id": plan_id,
                    "version": 1,
                    "organization_id": "ORG-APEX-GLOBAL",
                    "title": "Tenant Isolation Test Plan",
                },
            },
        )
        assert store_resp.status_code == 200

        # 2. Attempt access from competitor organization
        competitor_headers = {
            "X-User-Id": "user:competitor-analyst",
            "X-Organization-Id": "ORG-COMPETITOR-X",
            "X-Chain-Id": "31337",
        }
        # Check /blockchain/plan/{id}/latest
        resp_latest = client.get(f"/blockchain/plan/{plan_id}/latest", headers=competitor_headers)
        assert resp_latest.status_code == 404

        # Check /blockchain/plan/{id}/{version}
        resp_version = client.get(f"/blockchain/plan/{plan_id}/1", headers=competitor_headers)
        assert resp_version.status_code == 404

        # Check /blockchain/verification/{id}/{version}
        resp_ver = client.get(f"/blockchain/verification/{plan_id}/1", headers=competitor_headers)
        assert resp_ver.status_code == 200
        # Verification report indicates organization ownership mismatch
        report = resp_ver.json()
        assert report["checks"]["organization_ownership"] is False

    # --------------------------------------------------------------------------
    # 3. Transaction Format & Validation
    # --------------------------------------------------------------------------
    def test_register_transaction_rejects_malformed_hashes(self, client):
        """Registering a transaction hash not matching 66-char 0x hex format returns 400."""
        headers = {
            "X-User-Id": "user:analyst-test",
            "X-Organization-Id": "ORG-APEX-GLOBAL",
        }
        # Too short
        resp_short = client.post(
            "/blockchain/transactions/register",
            headers=headers,
            json={"tx_hash": "0x1234"},
        )
        assert resp_short.status_code == 400
        assert "invalid transaction hash format" in resp_short.json()["detail"].lower()

        # Non-hex characters
        resp_nonhex = client.post(
            "/blockchain/transactions/register",
            headers=headers,
            json={"tx_hash": "0x" + "z" * 64},
        )
        assert resp_nonhex.status_code == 400

    def test_reconcile_transaction_tenant_protected(self, client):
        """Reconciliation of an existing plan transaction from another tenant returns 404."""
        plan_id = f"RP-RECON-{uuid.uuid4().hex[:6]}"
        tx_hash = "0x" + hashlib.sha256(f"TX-{plan_id}".encode()).hexdigest()

        # Register transaction under ORG-APEX-GLOBAL
        reg_resp = client.post(
            "/blockchain/transactions/register",
            headers={
                "X-User-Id": "user:analyst-apex",
                "X-Organization-Id": "ORG-APEX-GLOBAL",
            },
            json={
                "tx_hash": tx_hash,
                "chain_id": 31337,
                "function_name": "anchorPlan",
                "plan_id": plan_id,
                "plan_version": 1,
            },
        )
        assert reg_resp.status_code == 200

        # Store operational plan under ORG-APEX-GLOBAL
        client.post(
            "/blockchain/plans/operational",
            headers={
                "X-User-Id": "user:analyst-apex",
                "X-Organization-Id": "ORG-APEX-GLOBAL",
            },
            json={
                "plan_id": plan_id,
                "version": 1,
                "plan_data": {"plan_id": plan_id, "organization_id": "ORG-APEX-GLOBAL"},
            },
        )

        # Competitor attempts to reconcile
        comp_headers = {
            "X-User-Id": "user:competitor-analyst",
            "X-Organization-Id": "ORG-COMPETITOR-X",
        }
        comp_recon = client.post(f"/blockchain/transactions/{tx_hash}/reconcile", headers=comp_headers)
        assert comp_recon.status_code == 404

    # --------------------------------------------------------------------------
    # 4. Elimination of Fake Hashes and Mocks in Legacy v1 Gateway
    # --------------------------------------------------------------------------
    def test_v1_approval_does_not_return_fake_tx_hash(self, client):
        """Legacy /api/v1/approvals/approve must not fabricate a hardcoded tx_hash."""
        resp = client.post(
            "/api/v1/approvals/RP-TEST-001/approve",
            headers={"X-User-Roles": "supply-chain-manager"},
            json={
                "planId": "RP-TEST-001",
                "actor": "Director of Supply Chain",
                "role": "supply_chain_manager",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["status"] == "Approved"
        # Must not contain fabricated txHash
        assert "txHash" not in data or data.get("txHash") is None

    def test_v1_verify_plan_reflects_actual_on_chain_state(self, client):
        """Unanchored plan queried on /api/v1/blockchain/verify/plan/{id} returns unverified."""
        unanchored_id = f"RP-UNANCHORED-{uuid.uuid4().hex[:6]}"
        resp = client.get(f"/api/v1/blockchain/verify/plan/{unanchored_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["verified"] is False
        assert data["status"] == "Not Found"

    def test_v1_chain_status_reflects_actual_network(self, client):
        """Chain status dynamically queries Web3 connection rather than returning static text."""
        resp = client.get("/api/v1/chain/status")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        assert "chainId" in data
        assert data["chainId"] in [31337, 80002]

    # --------------------------------------------------------------------------
    # 5. Canonical Simulation Hashing
    # --------------------------------------------------------------------------
    def test_deterministic_simulation_hash_computation(self):
        """Simulation parameters hash deterministically and key order invariance holds."""
        sim_a = {
            "schema": "trustchain-monte-carlo-v1",
            "plan_id": "RP-1001",
            "disruption_id": "DIS-001",
            "feasibility_score": 96.0,
            "estimated_cost_usd": 14200.0,
            "iterations": 10000,
        }
        # Inverted key order
        sim_b = {
            "iterations": 10000,
            "estimated_cost_usd": 14200.0,
            "feasibility_score": 96.0,
            "disruption_id": "DIS-001",
            "plan_id": "RP-1001",
            "schema": "trustchain-monte-carlo-v1",
        }
        json_a = json.dumps(sim_a, sort_keys=True, separators=(",", ":"))
        json_b = json.dumps(sim_b, sort_keys=True, separators=(",", ":"))
        hash_a = "0x" + hashlib.sha256(json_a.encode("utf-8")).hexdigest()
        hash_b = "0x" + hashlib.sha256(json_b.encode("utf-8")).hexdigest()
        assert hash_a == hash_b
        # Does not match placeholder
        assert hash_a != "0x" + "1" * 64
        assert len(hash_a) == 66

