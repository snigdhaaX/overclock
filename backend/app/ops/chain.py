"""Sends real transactions from per-role TESTNET wallets held on the server.

DEMO ONLY. This replaces wallet apps so the mobile demo works without WalletConnect. It breaks the
PRD's non-custodial rule, so production must move signing back to user wallets. Never use mainnet keys.
With no keys set, nothing is sent and approvals stay CHAIN_PENDING. A hash is never invented.
"""
import json
import os
from pathlib import Path
from typing import Any, Dict, Optional
from web3 import Web3
from ..blockchain.config import settings

STAGE_MANAGER = 0x02
DEPLOYMENT_FILE = Path(__file__).resolve().parents[3] / "blockchain" / "deployments" / "amoy.json"
KEY_ENV = {"ANALYST": "TRUSTCHAIN_KEY_ANALYST", "MANAGER": "TRUSTCHAIN_KEY_MANAGER"}


def _deployment() -> Dict[str, Any]:
    return json.loads(Path(os.getenv("TRUSTCHAIN_DEPLOYMENT_FILE", str(DEPLOYMENT_FILE))).read_text(encoding="utf-8"))


def _rpc_url() -> str:
    return os.getenv("POLYGON_AMOY_RPC_URL", settings.POLYGON_AMOY_RPC_URL)


def enabled() -> bool:
    return all(os.getenv(name) for name in KEY_ENV.values())


def to_bytes32(value: str) -> bytes:
    raw = value.encode("utf-8")
    if len(raw) > 31:
        raise ValueError(f"Plan id {value} is longer than 31 bytes.")
    return raw.ljust(32, b"\0")


def _contract(w3: Web3):
    deployment = _deployment()
    address = os.getenv("TRUSTCHAIN_CONTRACT_ADDRESS") or deployment["address"]
    return w3.eth.contract(address=Web3.to_checksum_address(address), abi=deployment["abi"])


def _client() -> Web3:
    return Web3(Web3.HTTPProvider(_rpc_url(), request_kwargs={"timeout": 20}))


def _send(w3: Web3, role: str, function) -> str:
    account = w3.eth.account.from_key(os.environ[KEY_ENV[role]])
    tx = function.build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address, "pending"),
        "chainId": w3.eth.chain_id,
    })
    if w3.eth.chain_id == 80002:
        # Amoy rejects low priority fees.
        priority = max(w3.eth.max_priority_fee, Web3.to_wei(30, "gwei"))
        tx["maxPriorityFeePerGas"] = priority
        tx["maxFeePerGas"] = w3.eth.gas_price + priority
    signed = account.sign_transaction(tx)
    return w3.to_hex(w3.eth.send_raw_transaction(signed.raw_transaction))


def _bytes32_hash(value: str) -> bytes:
    return bytes.fromhex(value.removeprefix("0x"))


def anchor_plan(plan_key: str, version: int, plan_hash: str, simulation_hash: str) -> str:
    w3 = _client()
    c = _contract(w3)
    fn = c.get_function_by_signature("anchorPlan(bytes32,uint32,bytes32,bytes32,uint8)")
    return _send(w3, "ANALYST", fn(to_bytes32(plan_key), version, _bytes32_hash(plan_hash), _bytes32_hash(simulation_hash), STAGE_MANAGER))


def approve_plan(plan_key: str, version: int) -> str:
    w3 = _client()
    return _send(w3, "MANAGER", _contract(w3).functions.approvePlan(to_bytes32(plan_key), version, STAGE_MANAGER))


def reject_plan(plan_key: str, version: int, reason_hash: str) -> str:
    w3 = _client()
    return _send(w3, "MANAGER", _contract(w3).functions.rejectPlan(to_bytes32(plan_key), version, STAGE_MANAGER, _bytes32_hash(reason_hash)))


def anchor_execution(plan_key: str, version: int, evidence_hash: str) -> str:
    w3 = _client()
    return _send(w3, "MANAGER", _contract(w3).functions.anchorExecution(to_bytes32(plan_key), version, _bytes32_hash(evidence_hash)))


def receipt_status(tx_hash: str) -> Optional[int]:
    """1 confirmed, 0 reverted, None still pending."""
    try:
        receipt = _client().eth.get_transaction_receipt(tx_hash)
    except Exception:
        return None
    return int(receipt["status"]) if receipt else None


def on_chain_hash_matches(plan_key: str, version: int, plan_hash: str) -> Optional[bool]:
    """None when the chain can't be reached or the plan isn't anchored."""
    try:
        w3 = _client()
        return bool(_contract(w3).functions.verifyPlanHash(to_bytes32(plan_key), version, _bytes32_hash(plan_hash)).call())
    except Exception:
        return None
