import os
import sys
import json
import time

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_defunct
from dotenv import load_dotenv

load_dotenv(os.path.join(ROOT_DIR, "blockchain", ".env"))

RPC_URL = os.getenv("POLYGON_AMOY_RPC_URL", "https://polygon-amoy-bor-rpc.publicnode.com")
CONTRACT_ADDRESS = os.getenv("TRUSTCHAIN_CONTRACT_ADDRESS", "0x33D476cE98f8a374C73D3eDa5FDE65917bA3e24A")
DEPLOYER_KEY = os.getenv("DEPLOYER_PRIVATE_KEY")

w3 = Web3(Web3.HTTPProvider(RPC_URL))
deployer = Account.from_key(DEPLOYER_KEY)

print("=" * 65)
print("TRUSTCHAIN — POLYGON AMOY LIVE LEDGER DEMONSTRATION")
print("=" * 65)
print(f"Connected to Amoy RPC: {w3.is_connected()}")
print(f"Amoy Chain ID:         {w3.eth.chain_id}")
print(f"Contract Address:      {CONTRACT_ADDRESS}")
print(f"Registrar Account:     {deployer.address}")
print(f"Registrar Balance:     {w3.from_wei(w3.eth.get_balance(deployer.address), 'ether')} POL")

# Load ABI
abi_path = os.path.join(os.path.dirname(__file__), "..", "artifacts", "contracts", "TrustChainGovernance.sol", "TrustChainGovernance.json")
with open(abi_path, "r") as f:
    artifact = json.load(f)
abi = artifact["abi"]

contract = w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=abi)

def send_tx(acct, fn):
    nonce = w3.eth.get_transaction_count(acct.address)
    tx = fn.build_transaction({
        "from": acct.address,
        "nonce": nonce,
        "maxPriorityFeePerGas": w3.to_wei(30, "gwei"),
        "maxFeePerGas": w3.to_wei(35, "gwei"),
    })
    signed = acct.sign_transaction(tx)
    raw_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"  -> Broadcasted Tx: {raw_hash.hex()}")
    print("     Waiting for 2 Polygon Amoy confirmations...")
    receipt = w3.eth.wait_for_transaction_receipt(raw_hash)
    if receipt.status != 1:
        raise Exception(f"Transaction failed on Amoy: {receipt}")
    return receipt

# Step 1: Register Analyst Wallet on Amoy
ANALYST_WALLET = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
APPROVER_WALLET = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
ORG_ID_BYTES = Web3.to_bytes(text="ORG-APEX-GLOBAL").ljust(32, b"\0")

print("\n[Step 1] Registering Analyst Wallet on Polygon Amoy...")
is_analyst_active = contract.functions.isActiveWallet(ANALYST_WALLET).call()
if not is_analyst_active:
    rec1 = send_tx(deployer, contract.functions.registerWallet(ANALYST_WALLET, ORG_ID_BYTES, 0x01))
    print(f"  [CONFIRMED] Analyst Registered in Block #{rec1.blockNumber}")
    print(f"  Tx Hash: {rec1.transactionHash.hex()}")
    print(f"  PolygonScan: https://amoy.polygonscan.com/tx/{rec1.transactionHash.hex()}")
else:
    print(f"  Analyst {ANALYST_WALLET} already active on Amoy ledger.")

# Step 2: Register SCM Approver Wallet on Amoy
print("\n[Step 2] Registering Approver Wallet (SCM - 0x02) on Polygon Amoy...")
is_approver_active = contract.functions.isActiveWallet(APPROVER_WALLET).call()
if not is_approver_active:
    rec2 = send_tx(deployer, contract.functions.registerWallet(APPROVER_WALLET, ORG_ID_BYTES, 0x02))
    print(f"  [CONFIRMED] Approver Registered in Block #{rec2.blockNumber}")
    print(f"  Tx Hash: {rec2.transactionHash.hex()}")
    print(f"  PolygonScan: https://amoy.polygonscan.com/tx/{rec2.transactionHash.hex()}")
else:
    print(f"  Approver {APPROVER_WALLET} already active on Amoy ledger.")

# Step 3: Backend Database & EIP-191 Nonce Linking
print("\n[Step 3] EIP-191 Nonce Linking through Backend API...")
from backend.app.blockchain.wallet_service import WalletService
from backend.app.blockchain.contract_service import ContractService
from backend.app.blockchain.database import init_db, SessionLocal
from backend.app.blockchain.hash_service import RecoveryPlanHashService
from backend.app.blockchain.transaction_service import TransactionService
from backend.app.blockchain.event_listener import EventListenerService
from backend.app.blockchain.verification_service import PlanVerificationService

init_db()
db = SessionLocal()
contract_svc = ContractService()

# Create domain-bound nonce
nonce_obj = WalletService.create_nonce(db, user_id="USR-AMOY-ANALYST", organization_id="ORG-APEX-GLOBAL")
print(f"  - Nonce:   {nonce_obj['nonce']}")
print(f"  - Message: {nonce_obj['message'][:60]}...")

# Sign with Analyst key (Account #1 in Hardhat standard accounts)
ANALYST_PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
analyst_acct = Account.from_key(ANALYST_PRIVATE_KEY)
sig = analyst_acct.sign_message(encode_defunct(text=nonce_obj["message"]))

link_result = WalletService.verify_and_link_wallet(
    db=db,
    user_id="USR-AMOY-ANALYST",
    organization_id="ORG-APEX-GLOBAL",
    wallet_address=analyst_acct.address,
    nonce=nonce_obj["nonce"],
    signature=sig.signature.hex(),
    contract_service=contract_svc,
)
print(f"  - Verified Link Status: {link_result['status']}")
print(f"  - On-Chain Categories:  {link_result['on_chain_status']['categories']} (Operations Analyst)")

# Step 4: Plan RCP-AMOY-001 Creation and Canonical Hashing
print("\n[Step 4] Creating Recovery Plan RCP-AMOY-001 & RFC 8785 Canonical Hashing...")
plan_id = "RCP-AMOY-001"
plan_version = 1
plan_data = {
    "plan_id": plan_id,
    "version": plan_version,
    "organization_id": "ORG-APEX-GLOBAL",
    "disruption_id": "DISRUPT-AMOY-TEST-FEED",
    "simulation_hash": "0x" + "c" * 64,
    "action_categories": [4],
    "recovery_actions": [
        {
            "action_id": "ACT-AMOY-01",
            "category": 4,
            "description": "Reroute shipment from Rotterdam to Antwerp terminal",
            "estimated_cost": 24000.0,
            "currency": "EUR",
        }
    ],
    "estimated_total_cost": 24000.0,
    "currency": "EUR",
}

canon_json, plan_hash = RecoveryPlanHashService.generate_plan_hash(plan_data)
print(f"  - Canonical JSON: {canon_json[:75]}...")
print(f"  - Canonical SHA-256 Digest: {plan_hash}")

# Save in persistent database
PlanVerificationService.save_operational_plan(
    db=db,
    plan_id=plan_id,
    version=plan_version,
    organization_id="ORG-APEX-GLOBAL",
    plan_data=plan_data,
)
print("  - Plan saved in persistent SQLite operational storage.")

# Step 5: Verification Centre Report (Prior to On-Chain Anchor)
print("\n[Step 5] Checking Verification Centre Pre-Anchor Status...")
pre_report = PlanVerificationService.verify_plan_integrity(db, plan_id, plan_version, contract_svc)
print(f"  - Pre-Anchor Result: {pre_report['result']} (Expected: NOT_ANCHORED)")
assert pre_report["result"] == "NOT_ANCHORED", f"Expected NOT_ANCHORED, got {pre_report['result']}"

# Step 6: Tamper Detection Demonstration
print("\n[Step 6] Tamper Detection Rehearsal...")
tampered_data = dict(plan_data)
tampered_data["estimated_total_cost"] = 999999.0
_, tampered_hash = RecoveryPlanHashService.generate_plan_hash(tampered_data)
print(f"  - Original Hash: {plan_hash}")
print(f"  - Tampered Hash: {tampered_hash}")
print(f"  - Hashes Match:  {plan_hash == tampered_hash} (Tampering altered the hash deterministically)")

print("\n" + "=" * 65)
print("POLYGON AMOY LIVE DEMONSTRATION & INTEGRATION COMPLETE")
print("=" * 65)
