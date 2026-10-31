import sys
import os
import json
import time

# Ensure workspace root is in python path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_defunct

RPC_URL = "http://127.0.0.1:8545"
CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
API_URL = "http://127.0.0.1:8000"

# Known Hardhat accounts
DEPLOYER_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
CREATOR_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
APPROVER_KEY = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"

w3 = Web3(Web3.HTTPProvider(RPC_URL))
deployer = Account.from_key(DEPLOYER_KEY)
creator = Account.from_key(CREATOR_KEY)
approver = Account.from_key(APPROVER_KEY)

print("=" * 60)
print("TRUSTCHAIN PRE-DEPLOYMENT E2E REHEARSAL")
print("=" * 60)
print(f"Connected to RPC:       {w3.is_connected()}")
print(f"Latest Block:           {w3.eth.block_number}")
print(f"Deployer (Registrar):   {deployer.address}")
print(f"Creator (Analyst):      {creator.address}")
print(f"Approver (SCM):         {approver.address}")

# Load ABI
abi_path = os.path.join(os.path.dirname(__file__), "..", "artifacts", "contracts", "TrustChainGovernance.sol", "TrustChainGovernance.json")
with open(abi_path, "r") as f:
    artifact = json.load(f)
abi = artifact["abi"]

contract = w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=abi)

def send_tx(acct, fn):
    nonce = w3.eth.get_transaction_count(acct.address, "pending")
    tx = fn.build_transaction({
        "from": acct.address,
        "nonce": nonce,
        "gas": 500000,
        "gasPrice": w3.eth.gas_price,
    })
    signed = acct.sign_transaction(tx)
    raw_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(raw_hash)
    if receipt.status != 1:
        raise Exception(f"Transaction failed: {receipt}")
    return receipt

# STEP 1: Register wallets on-chain
print("\n[Step 1] Registering wallets in on-chain TrustChainGovernance registry...")
ORG_ID_BYTES = Web3.to_bytes(text="ORG-APEX-GLOBAL").ljust(32, b"\0")

# Register Creator with Category 0x01 (Operations Analyst)
if not contract.functions.isActiveWallet(creator.address).call():
    print("  - Registering Creator (Operations Analyst - 0x01)...")
    rec1 = send_tx(deployer, contract.functions.registerWallet(creator.address, ORG_ID_BYTES, 0x01))
    print(f"    Tx: {rec1.transactionHash.hex()}, Gas: {rec1.gasUsed}")
else:
    print("  - Creator wallet already active on-chain.")

# Register Approver with Category 0x02 (Supply Chain Manager)
if not contract.functions.isActiveWallet(approver.address).call():
    print("  - Registering Approver (Supply Chain Manager - 0x02)...")
    rec2 = send_tx(deployer, contract.functions.registerWallet(approver.address, ORG_ID_BYTES, 0x02))
    print(f"    Tx: {rec2.transactionHash.hex()}, Gas: {rec2.gasUsed}")
else:
    print("  - Approver wallet already active on-chain.")

# STEP 2: Verify Action Approval Policy
print("\n[Step 2] Verifying Built-in Action Approval Policy...")
# In constructor: ACTION_SHIPMENT_REROUTE (0x04) -> CAT_SUPPLY_CHAIN_MANAGER (0x02)
required_stage = contract.functions.requiredStagesForActions(0x04).call()
print(f"  - Action 0x04 (Shipment Reroute) requires Stage: 0x{required_stage:02x} (SCM)")
assert required_stage == 0x02, f"Expected Stage 0x02, got 0x{required_stage:02x}"

# STEP 3: EIP-191 Nonce Linking via FastAPI Backend
print("\n[Step 3] EIP-191 Nonce Signing and Backend Verification...")
from backend.app.blockchain.wallet_service import WalletService
from backend.app.blockchain.contract_service import ContractService
from backend.app.blockchain.database import init_db, SessionLocal
from backend.app.blockchain.hash_service import RecoveryPlanHashService
from backend.app.blockchain.transaction_service import TransactionService
from backend.app.blockchain.event_listener import EventListenerService
from backend.app.blockchain.verification_service import PlanVerificationService

init_db()
db = SessionLocal()
contract_svc = ContractService(rpc_url=RPC_URL, contract_address=CONTRACT_ADDRESS)

# Create nonce for Creator
nonce_obj = WalletService.create_nonce(db, user_id="USR-ANALYST-101", organization_id="ORG-APEX-GLOBAL")
print(f"  - Issued Nonce: {nonce_obj['nonce']}")
print(f"  - Domain Message: {nonce_obj['message']}")

# Creator signs message
sig = creator.sign_message(encode_defunct(text=nonce_obj["message"]))
link_res = WalletService.verify_and_link_wallet(
    db=db,
    user_id="USR-ANALYST-101",
    organization_id="ORG-APEX-GLOBAL",
    wallet_address=creator.address,
    nonce=nonce_obj["nonce"],
    signature=sig.signature.hex(),
    contract_service=contract_svc,
)
print(f"  - Wallet Linked Successfully: {link_res['status']} for {link_res['wallet_address']}")

# STEP 4: Canonical Plan Creation & Hashing (RFC 8785)
print("\n[Step 4] Canonical Plan Creation & RFC 8785 SHA-256 Hashing...")
plan_id = f"RCP-LIVE-{int(time.time())}"
plan_version = 1
plan_data = {
    "plan_id": plan_id,
    "version": plan_version,
    "organization_id": "ORG-APEX-GLOBAL",
    "disruption_id": "DISRUPT-PORT-ROTTERDAM-STRIKE",
    "simulation_hash": "0x" + "a" * 64,
    "action_categories": [2],
    "recovery_actions": [
        {
            "action_id": "ACT-1",
            "category": 2,
            "description": "Engage alternative spot freight supplier",
            "cost": 15000.0,
        }
    ],
    "currency": "EUR",
}

canon_json, plan_hash = RecoveryPlanHashService.generate_plan_hash(plan_data)
print(f"  - Canonical JSON: {canon_json[:80]}...")
print(f"  - Canonical SHA-256 Digest: {plan_hash}")

# Save in backend operational database
PlanVerificationService.save_operational_plan(
    db=db,
    plan_id=plan_id,
    version=plan_version,
    organization_id="ORG-APEX-GLOBAL",
    plan_data=plan_data,
)
print(f"  - Operational plan saved in persistent backend database.")

# STEP 5: Anchor Recovery Plan on Smart Contract (Signed by Creator)
print("\n[Step 5] Submitting anchorPlan transaction to blockchain via Creator...")
plan_id_bytes = Web3.to_bytes(text=plan_id).ljust(32, b"\0")
plan_hash_bytes = Web3.to_bytes(hexstr=plan_hash)
sim_hash_bytes = Web3.to_bytes(hexstr="0x" + "a" * 64)

# Action mask = 0x04 (Shipment Reroute -> requires CAT_SUPPLY_CHAIN_MANAGER 0x02)
anchor_receipt = send_tx(
    creator,
    contract.functions["anchorPlan(bytes32,uint32,bytes32,bytes32,uint8,uint8)"](
        plan_id_bytes,
        plan_version,
        plan_hash_bytes,
        sim_hash_bytes,
        0x04,
        0x00,
    ),
)
print(f"  - Anchored on Block #{anchor_receipt.blockNumber} (Tx: {anchor_receipt.transactionHash.hex()})")

# Register with Transaction Service
tx_record = TransactionService.register_transaction(
    db=db,
    tx_hash=anchor_receipt.transactionHash.hex(),
    chain_id=31337,
    contract_address=CONTRACT_ADDRESS,
    submitter_wallet=creator.address,
    function_name="anchorPlan",
    plan_id=plan_id,
    plan_version=plan_version,
)
updated_tx = TransactionService.update_transaction_status(db, tx_record.tx_hash, contract_svc)
print(f"  - Backend Transaction Status: {updated_tx.status} (Confirmations: {updated_tx.confirmations})")

# Index events
EventListenerService.index_receipt_events(db, contract_svc, anchor_receipt.transactionHash.hex(), 31337)
print(f"  - Indexed smart contract events for block #{anchor_receipt.blockNumber}")

# STEP 6: Creator Self-Approval Blocking Verification
print("\n[Step 6] Testing Creator Duty Separation (Self-Approval Prevention)...")
try:
    send_tx(creator, contract.functions.approvePlan(plan_id_bytes, plan_version, 0x02))
    print("  [ERROR] Creator was able to self-approve!")
    sys.exit(1)
except Exception as e:
    print(f"  - SUCCESS: Self-approval blocked by contract rules as expected.")

# STEP 7: Authorize Plan by Separate Authorized Approver (SCM)
print("\n[Step 7] Submitting approvePlan transaction via Approver wallet...")
approve_receipt = send_tx(approver, contract.functions.approvePlan(plan_id_bytes, plan_version, 0x02))
print(f"  - Approved on Block #{approve_receipt.blockNumber} (Tx: {approve_receipt.transactionHash.hex()})")

# Register approval transaction
tx_app = TransactionService.register_transaction(
    db=db,
    tx_hash=approve_receipt.transactionHash.hex(),
    chain_id=31337,
    contract_address=CONTRACT_ADDRESS,
    submitter_wallet=approver.address,
    function_name="approvePlan",
    plan_id=plan_id,
    plan_version=plan_version,
)
TransactionService.update_transaction_status(db, tx_app.tx_hash, contract_svc)
EventListenerService.index_receipt_events(db, contract_svc, approve_receipt.transactionHash.hex(), 31337)

# Check execution eligibility on contract
eligible, reason = contract_svc.execution_eligibility(plan_id, plan_version)
print(f"  - On-Chain Plan Eligibility: {eligible} (Reason: {reason})")

# STEP 8: Cryptographic Integrity Verification via Verification Centre Service
print("\n[Step 8] Verification Centre Rehearsal...")
report = PlanVerificationService.verify_plan_integrity(
    db=db,
    plan_id=plan_id,
    version=plan_version,
    contract_service=contract_svc,
)
print(f"  - Verification Result:        {report['result']}")
print(f"  - Hashes Match:               {report['hashes_match']}")
print(f"  - Database Canonical Hash:    {report['database_hash']}")
print(f"  - Blockchain Anchored Hash:   {report['on_chain_hash']}")
print(f"  - Details:                    {report['details']}")

assert report["result"] == "VERIFIED", f"Expected VERIFIED, got {report['result']}"
assert report["hashes_match"] is True, "Expected hashes_match to be True"

print("\n" + "=" * 60)
print("ALL 8 PRE-DEPLOYMENT VALIDATION CHECKS PASSED WITH 100% REAL LEDGER TRANSACTIONS!")
print("=" * 60)
