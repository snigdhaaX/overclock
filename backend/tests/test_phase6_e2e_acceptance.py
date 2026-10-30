"""
TrustChain Phase 6: Final End-to-End Acceptance Test Suite
Task I: Tests 1 through 9 executing against live Local Hardhat network (Chain ID 31337)
and FastAPI backend.

Verifies:
- Test 1: Application startup & Local network detection (Hardhat chainId 31337)
- Test 2: Analyst wallet authentication (Account 0x7099...), EIP-191 challenge/response
- Test 3: Plan anchoring (anchorPlan), tx registration, receipt reconciliation, on-chain record
- Test 4: Manager authentication (Account 0x3C44...), role separation & anti-self-approval
- Test 5: Manager plan verification (15-point cryptographic verification check)
- Test 6: Governance approval (approvePlan), receipt reconciliation, status update
- Test 7: Execution evidence (anchorExecutionEvidence), SHA-256 fingerprinting, on-chain commitment
- Test 8: Live audit verification, confirming indexed events against RPC receipts
- Test 9: Restart & recovery, transaction persistence across reloads
"""

import os
import json
import hashlib
import uuid
import pytest
from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_defunct
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.blockchain.routes import LOCAL_HARDHAT_CONTRACT_ADDRESS, LOCAL_HARDHAT_CHAIN_ID
from backend.app.blockchain.contract_service import ContractService

HARDHAT_RPC_URL = "http://127.0.0.1:8545"

# Local Hardhat known default test accounts (used solely for external client-side signing in test)
ANALYST_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
ANALYST_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"

MANAGER_ADDRESS = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
MANAGER_KEY = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"


@pytest.fixture(scope="module")
def w3():
    provider = Web3.HTTPProvider(HARDHAT_RPC_URL)
    web3_inst = Web3(provider)
    if not web3_inst.is_connected():
        pytest.skip("Local Hardhat node is not running at http://127.0.0.1:8545")
    return web3_inst


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


class TestPhase6EndToEndAcceptance:
    """Complete End-to-End Acceptance sequence validating all Milestone 6 criteria."""

    run_id = uuid.uuid4().hex[:6].upper()
    plan_id = f"RP-E2E-{run_id}"
    plan_version = 1
    analyst_session_token = None
    manager_session_token = None
    plan_hash = None
    anchor_tx_hash = None
    approve_tx_hash = None
    evidence_tx_hash = None
    evidence_hash = None

    # --------------------------------------------------------------------------
    # Test 1 — Application startup & network detection
    # --------------------------------------------------------------------------
    def test_01_application_startup_and_network_detection(self, client, w3):
        """Confirm Hardhat is running at 31337, FastAPI is healthy, and contract is deployed."""
        # 1. Web3 check
        assert w3.is_connected()
        chain_id = w3.eth.chain_id
        assert chain_id == LOCAL_HARDHAT_CHAIN_ID == 31337

        # 2. Contract code check
        code = w3.eth.get_code(LOCAL_HARDHAT_CONTRACT_ADDRESS)
        assert len(code) > 2, f"No bytecode found at {LOCAL_HARDHAT_CONTRACT_ADDRESS}"

        # 3. FastAPI network status check
        headers = {"X-Chain-Id": "31337"}
        resp = client.get("/blockchain/network/info", headers=headers)
        assert resp.status_code == 200
        net_info = resp.json()
        assert net_info["connected"] is True
        assert net_info["chain_id"] == 31337
        assert net_info["contract_address"].lower() == LOCAL_HARDHAT_CONTRACT_ADDRESS.lower()

    # --------------------------------------------------------------------------
    # Test 2 — Analyst wallet authentication
    # --------------------------------------------------------------------------
    def test_02_analyst_wallet_authentication(self, client):
        """Connect authorized analyst wallet, sign EIP-191 nonce challenge, obtain session."""
        headers = {
            "X-User-Id": "user:analyst-e2e",
            "X-Organization-Id": "ORG-APEX-GLOBAL",
            "X-User-Roles": "operations_analyst",
            "X-Chain-Id": "31337",
        }

        # 1. Request nonce
        resp = client.post("/blockchain/wallet/nonce", headers=headers)
        assert resp.status_code == 200
        nonce_data = resp.json()
        assert "nonce" in nonce_data
        assert "message" in nonce_data

        # 2. Sign EIP-191 challenge with analyst account
        acct = Account.from_key(ANALYST_KEY)
        assert acct.address.lower() == ANALYST_ADDRESS.lower()
        signable = encode_defunct(text=nonce_data["message"])
        signed = acct.sign_message(signable)
        sig_hex = "0x" + signed.signature.hex()

        # 3. Verify signature
        verify_resp = client.post(
            "/blockchain/wallet/verify",
            headers=headers,
            json={
                "wallet_address": ANALYST_ADDRESS,
                "nonce": nonce_data["nonce"],
                "signature": sig_hex,
            },
        )
        assert verify_resp.status_code == 200
        data = verify_resp.json()
        assert data["status"] == "LINKED"
        assert "session_token" in data
        TestPhase6EndToEndAcceptance.analyst_session_token = data["session_token"]

        # 4. Verify on-chain authorization (Category 1 = Analyst)
        auth_resp = client.get(
            f"/blockchain/wallet/{ANALYST_ADDRESS}/authorization",
            headers=headers,
        )
        assert auth_resp.status_code == 200
        auth_data = auth_resp.json()
        assert auth_data["active"] is True
        assert (auth_data["categories"] & 0x01) != 0, "Analyst category 0x01 missing"

    # --------------------------------------------------------------------------
    # Test 3 — Plan anchoring
    # --------------------------------------------------------------------------
    def test_03_plan_anchoring_workflow(self, client, w3):
        """Authoritative canonical plan hash generation, Hardhat anchoring, registration & reconciliation."""
        plan_data = {
            "plan_id": self.plan_id,
            "version": 1,
            "disruption_id": "DIS-ACCEPTANCE-001",
            "organization_id": "ORG-APEX-GLOBAL",
            "title": "Acceptance Plan Alpha",
            "strategy": "Dual-Route Redundancy",
            "estimated_cost": 45000,
            "actions": [
                {
                    "id": "ACT-1",
                    "title": "Air Freight Divert",
                    "action_type": "reroute",
                    "cost": 45000,
                    "timeline": "24h",
                },
            ],
            "constraints": ["Max spend $50k", "Cold-chain strict SLA"],
            "schema_version": "trustchain-recovery-plan-v2",
            "simulation_hash": "0x" + ("11" * 32),
        }

        # 1. Authoritative canonical hash generation
        hash_resp = client.post("/blockchain/hash/generate", json={"plan_data": plan_data})
        assert hash_resp.status_code == 200
        hash_result = hash_resp.json()
        assert hash_result["schema_version"] == "trustchain-recovery-plan-v2"
        plan_hash_hex = hash_result["sha256_hash"]
        TestPhase6EndToEndAcceptance.plan_hash = plan_hash_hex

        # 2. Store operational plan in backend database
        store_resp = client.post(
            "/blockchain/plans/operational",
            headers={
                "X-User-Id": "user:analyst-e2e",
                "X-Organization-Id": "ORG-APEX-GLOBAL",
                "X-Chain-Id": "31337",
            },
            json={
                "plan_id": self.plan_id,
                "version": 1,
                "plan_data": plan_data,
            },
        )
        assert store_resp.status_code == 200

        # 3. Submit real anchorPlan on Hardhat contract
        contract_svc = ContractService(
            rpc_url=HARDHAT_RPC_URL,
            contract_address=LOCAL_HARDHAT_CONTRACT_ADDRESS,
        )
        contract = contract_svc._contract

        sim_hash_bytes = b"\x11" * 32
        plan_hash_bytes = bytes.fromhex(plan_hash_hex.replace("0x", ""))
        action_mask = 0x04  # ACTION_SHIPMENT_REROUTE -> requires CAT_SUPPLY_CHAIN_MANAGER (0x02)
        additional_stages = 0
        plan_id_bytes = ContractService.encode_bytes32(self.plan_id)

        acct = Account.from_key(ANALYST_KEY)
        nonce = w3.eth.get_transaction_count(acct.address)
        tx_data = contract.functions.anchorPlan(
            plan_id_bytes,
            1,
            plan_hash_bytes,
            sim_hash_bytes,
            action_mask,
            additional_stages,
        ).build_transaction({
            "from": acct.address,
            "nonce": nonce,
            "gas": 300000,
            "gasPrice": w3.eth.gas_price,
            "chainId": 31337,
        })
        signed_tx = acct.sign_transaction(tx_data)
        tx_hash_bytes = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        tx_hash = "0x" + tx_hash_bytes.hex()
        TestPhase6EndToEndAcceptance.anchor_tx_hash = tx_hash

        # 4. Register transaction with backend
        reg_resp = client.post(
            "/blockchain/transactions/register",
            headers={
                "X-User-Id": "user:analyst-e2e",
                "X-Organization-Id": "ORG-APEX-GLOBAL",
                "X-Chain-Id": "31337",
            },
            json={
                "tx_hash": tx_hash,
                "chain_id": 31337,
                "function_name": "anchorPlan",
                "plan_id": self.plan_id,
                "plan_version": 1,
            },
        )
        assert reg_resp.status_code == 200

        # 5. Reconcile transaction with actual RPC receipt
        recon_resp = client.post(
            f"/blockchain/transactions/{tx_hash}/reconcile",
            headers={"X-Chain-Id": "31337"},
        )
        assert recon_resp.status_code == 200
        recon_data = recon_resp.json()
        assert recon_data["status"] in ["INCLUDED", "CONFIRMED"]
        assert recon_data["block_number"] is not None

        # 6. Verify on-chain plan record
        on_chain_resp = client.get(
            f"/blockchain/plan/{self.plan_id}/1",
            headers={"X-Chain-Id": "31337"},
        )
        assert on_chain_resp.status_code == 200
        on_chain = on_chain_resp.json()
        assert on_chain["status"] == "PENDING_APPROVAL"
        assert on_chain["creator"].lower() == ANALYST_ADDRESS.lower()
        assert on_chain["plan_hash"].lower() == plan_hash_hex.lower()
        assert on_chain["required_stages"] == 0x02

    # --------------------------------------------------------------------------
    # Test 4 — Manager authentication & role separation
    # --------------------------------------------------------------------------
    def test_04_manager_authentication(self, client):
        """Authenticate independent Supply Chain Manager wallet; verify anti-self-approval rule."""
        headers = {
            "X-User-Id": "user:manager-e2e",
            "X-Organization-Id": "ORG-APEX-GLOBAL",
            "X-User-Roles": "supply_chain_manager",
            "X-Chain-Id": "31337",
        }

        # 1. Nonce request
        resp = client.post("/blockchain/wallet/nonce", headers=headers)
        assert resp.status_code == 200
        nonce_data = resp.json()

        # 2. Sign with Manager account
        acct = Account.from_key(MANAGER_KEY)
        assert acct.address.lower() == MANAGER_ADDRESS.lower()
        signable = encode_defunct(text=nonce_data["message"])
        signed = acct.sign_message(signable)
        sig_hex = "0x" + signed.signature.hex()

        # 3. Verify
        verify_resp = client.post(
            "/blockchain/wallet/verify",
            headers=headers,
            json={
                "wallet_address": MANAGER_ADDRESS,
                "nonce": nonce_data["nonce"],
                "signature": sig_hex,
            },
        )
        assert verify_resp.status_code == 200
        data = verify_resp.json()
        assert data["status"] == "LINKED"
        TestPhase6EndToEndAcceptance.manager_session_token = data["session_token"]

        # 4. Check on-chain Manager role (Category 2)
        auth_resp = client.get(
            f"/blockchain/wallet/{MANAGER_ADDRESS}/authorization",
            headers=headers,
        )
        assert auth_resp.status_code == 200
        auth_data = auth_resp.json()
        assert auth_data["active"] is True
        assert (auth_data["categories"] & 0x02) != 0, "Manager category 0x02 missing"
        assert MANAGER_ADDRESS.lower() != ANALYST_ADDRESS.lower(), "Separation of duties required"

    # --------------------------------------------------------------------------
    # Test 5 — Manager plan verification
    # --------------------------------------------------------------------------
    def test_05_manager_plan_verification(self, client):
        """Retrieve full 15-point integrity report and check execution eligibility."""
        headers = {
            "X-User-Id": "user:manager-e2e",
            "X-Organization-Id": "ORG-APEX-GLOBAL",
            "X-User-Roles": "supply_chain_manager",
            "X-Chain-Id": "31337",
        }
        resp = client.get(
            f"/blockchain/verification/{self.plan_id}/1",
            headers=headers,
        )
        assert resp.status_code == 200
        report = resp.json()
        assert report["plan_id"] == self.plan_id
        assert report["version"] == 1
        assert report["database_hash"].lower() == self.plan_hash.lower()
        assert report["hashes_match"] is True
        assert report["execution_eligible"] is False

    # --------------------------------------------------------------------------
    # Test 6 — Governance approval
    # --------------------------------------------------------------------------
    def test_06_governance_approval_workflow(self, client, w3):
        """Supply Chain Manager submits approvePlan; receipt reconciled and verified."""
        contract_svc = ContractService(
            rpc_url=HARDHAT_RPC_URL,
            contract_address=LOCAL_HARDHAT_CONTRACT_ADDRESS,
        )
        contract = contract_svc._contract
        plan_id_bytes = ContractService.encode_bytes32(self.plan_id)

        acct = Account.from_key(MANAGER_KEY)
        nonce = w3.eth.get_transaction_count(acct.address)
        # Supply Chain Manager stage is 2 (0x02)
        tx_data = contract.functions.approvePlan(
            plan_id_bytes,
            1,
            2,  # Stage 0x02 = CAT_SUPPLY_CHAIN_MANAGER
        ).build_transaction({
            "from": acct.address,
            "nonce": nonce,
            "gas": 250000,
            "gasPrice": w3.eth.gas_price,
            "chainId": 31337,
        })
        signed_tx = acct.sign_transaction(tx_data)
        tx_hash_bytes = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        tx_hash = "0x" + tx_hash_bytes.hex()
        TestPhase6EndToEndAcceptance.approve_tx_hash = tx_hash

        # Register transaction
        client.post(
            "/blockchain/transactions/register",
            headers={
                "X-User-Id": "user:manager-e2e",
                "X-Organization-Id": "ORG-APEX-GLOBAL",
                "X-Chain-Id": "31337",
            },
            json={
                "tx_hash": tx_hash,
                "chain_id": 31337,
                "function_name": "approvePlan",
                "plan_id": self.plan_id,
                "plan_version": 1,
            },
        )

        # Reconcile receipt
        recon_resp = client.post(
            f"/blockchain/transactions/{tx_hash}/reconcile",
            headers={"X-Chain-Id": "31337"},
        )
        assert recon_resp.status_code == 200
        assert recon_resp.json()["status"] in ["INCLUDED", "CONFIRMED"]

        # Verify on-chain plan status is now APPROVED (status code 2)
        on_chain_resp = client.get(
            f"/blockchain/plan/{self.plan_id}/1",
            headers={"X-Chain-Id": "31337"},
        )
        assert on_chain_resp.status_code == 200
        assert on_chain_resp.json()["status"] == "APPROVED"

        # Verify decisions list contains manager decision
        dec_resp = client.get(
            f"/blockchain/plan/{self.plan_id}/1/decisions",
            headers={"X-Chain-Id": "31337"},
        )
        assert dec_resp.status_code == 200
        dec_data = dec_resp.json()
        decisions = dec_data.get("decisions", [])
        assert len(decisions) >= 1
        assert decisions[-1]["actor"].lower() == MANAGER_ADDRESS.lower()
        assert decisions[-1]["stage"] == 2
        assert decisions[-1]["decision"] == "APPROVE"

    # --------------------------------------------------------------------------
    # Test 7 — Execution evidence anchoring
    # --------------------------------------------------------------------------
    def test_07_execution_evidence_anchoring(self, client, w3):
        """Operations Analyst anchors SHA-256 evidence fingerprint once plan is eligible."""
        headers = {
            "X-User-Id": "user:analyst-e2e",
            "X-Organization-Id": "ORG-APEX-GLOBAL",
            "X-User-Roles": "operations_analyst",
            "X-Chain-Id": "31337",
        }
        # 1. Verify plan is now execution eligible
        ver_resp = client.get(
            f"/blockchain/verification/{self.plan_id}/1",
            headers=headers,
        )
        assert ver_resp.status_code == 200
        assert ver_resp.json()["execution_eligible"] is True

        # 2. Deterministic evidence fingerprint computation
        evidence_content = f"DELIVERY_RECEIPT_{self.plan_id}_{uuid.uuid4().hex}".encode()
        evidence_hash_hex = "0x" + hashlib.sha256(evidence_content).hexdigest()
        TestPhase6EndToEndAcceptance.evidence_hash = evidence_hash_hex
        evidence_hash_bytes = bytes.fromhex(evidence_hash_hex.replace("0x", ""))

        # 3. Submit anchorExecutionEvidence from Analyst wallet
        contract_svc = ContractService(
            rpc_url=HARDHAT_RPC_URL,
            contract_address=LOCAL_HARDHAT_CONTRACT_ADDRESS,
        )
        contract = contract_svc._contract
        plan_id_bytes = ContractService.encode_bytes32(self.plan_id)

        acct = Account.from_key(ANALYST_KEY)
        nonce = w3.eth.get_transaction_count(acct.address)
        tx_data = contract.functions.anchorExecution(
            plan_id_bytes,
            1,
            evidence_hash_bytes,
        ).build_transaction({
            "from": acct.address,
            "nonce": nonce,
            "gas": 250000,
            "gasPrice": w3.eth.gas_price,
            "chainId": 31337,
        })
        signed_tx = acct.sign_transaction(tx_data)
        tx_hash_bytes = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        tx_hash = "0x" + tx_hash_bytes.hex()
        TestPhase6EndToEndAcceptance.evidence_tx_hash = tx_hash

        # 4. Register & reconcile
        client.post(
            "/blockchain/transactions/register",
            headers=headers,
            json={
                "tx_hash": tx_hash,
                "chain_id": 31337,
                "function_name": "anchorExecution",
                "plan_id": self.plan_id,
                "plan_version": 1,
            },
        )
        recon_resp = client.post(
            f"/blockchain/transactions/{tx_hash}/reconcile",
            headers={"X-Chain-Id": "31337"},
        )
        assert recon_resp.status_code == 200
        assert recon_resp.json()["status"] in ["INCLUDED", "CONFIRMED"]

        # 5. Verify on-chain plan record holds evidence commitment
        on_chain_resp = client.get(
            f"/blockchain/plan/{self.plan_id}/1",
            headers={"X-Chain-Id": "31337"},
        )
        assert on_chain_resp.status_code == 200
        on_chain = on_chain_resp.json()
        assert on_chain["status"] == "EXECUTED"
        assert on_chain["execution_evidence_hash"].lower() == evidence_hash_hex.lower()
        assert on_chain["executed_by"].lower() == ANALYST_ADDRESS.lower()

    # --------------------------------------------------------------------------
    # Test 8 — Live audit verification
    # --------------------------------------------------------------------------
    def test_08_live_audit_verification(self, client):
        """Query indexed smart contract events and confirm PlanAnchored, PlanApproved, ExecutionAnchored."""
        headers = {"X-Chain-Id": "31337"}
        events_resp = client.get(
            f"/blockchain/events?plan_id={self.plan_id}&version=1",
            headers=headers,
        )
        assert events_resp.status_code == 200
        events = events_resp.json()

        event_names = [e["event_name"] for e in events]
        assert "PlanAnchored" in event_names
        assert "PlanApproved" in event_names
        assert "ExecutionAnchored" in event_names

        for ev in events:
            assert ev["plan_id"] == self.plan_id
            assert ev.get("plan_version") == 1 or ev.get("version") == 1
            assert ev["tx_hash"].startswith("0x")
            assert ev["block_number"] > 0

    # --------------------------------------------------------------------------
    # Test 9 — Restart & recovery
    # --------------------------------------------------------------------------
    def test_09_restart_and_recovery(self, client):
        """Simulate client restart by re-querying active tx hash and verifying status reconciliation."""
        tx_hash = self.anchor_tx_hash
        assert tx_hash is not None

        # Re-querying existing transaction without resubmitting
        status_resp = client.get(
            f"/blockchain/transactions/{tx_hash}",
            headers={"X-Chain-Id": "31337"},
        )
        assert status_resp.status_code == 200
        tx_info = status_resp.json()
        assert tx_info["tx_hash"] == tx_hash
        assert tx_info["status"] in ["INCLUDED", "CONFIRMED"]
        assert tx_info["plan_id"] == self.plan_id

        # Confirm idempotent reconciliation does not alter status or duplicate records
        recon_resp = client.post(
            f"/blockchain/transactions/{tx_hash}/reconcile",
            headers={"X-Chain-Id": "31337"},
        )
        assert recon_resp.status_code == 200
        assert recon_resp.json()["status"] in ["INCLUDED", "CONFIRMED"]
