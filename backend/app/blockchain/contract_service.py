import json
import os
from typing import Any, Dict, List, Optional, Tuple, Union
from web3 import Web3
from web3.exceptions import ContractLogicError, TransactionNotFound
from .config import settings

class ContractService:
    """
    Web3.py read-only and interaction preparation service for TrustChainGovernance.
    Reads contract state directly from RPC without holding private keys.
    """

    def __init__(
        self,
        rpc_url: Optional[str] = None,
        contract_address: Optional[str] = None,
        abi_path: Optional[str] = None,
    ):
        self.rpc_url = rpc_url or settings.POLYGON_AMOY_RPC_URL
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        self.contract_address = contract_address or settings.TRUSTCHAIN_CONTRACT_ADDRESS
        
        # Resolve ABI path relative to project structure
        if abi_path is None:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
            abi_path = os.path.join(
                base_dir,
                "blockchain",
                "artifacts",
                "contracts",
                "TrustChainGovernance.sol",
                "TrustChainGovernance.json",
            )
        self.abi_path = abi_path
        self._abi = self._load_abi()
        self._contract = None
        if self.contract_address and self._abi and self.w3.is_address(self.contract_address):
            self._contract = self.w3.eth.contract(
                address=self.w3.to_checksum_address(self.contract_address),
                abi=self._abi,
            )

    def _load_abi(self) -> List[Dict[str, Any]]:
        if os.path.exists(self.abi_path):
            with open(self.abi_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("abi", [])
        return []

    @property
    def is_connected(self) -> bool:
        try:
            return self.w3.is_connected()
        except Exception:
            return False

    def validate_chain_id(self, expected_chain_id: Optional[int] = None) -> bool:
        expected = expected_chain_id or settings.POLYGON_AMOY_CHAIN_ID
        try:
            actual = self.w3.eth.chain_id
            return actual == expected
        except Exception:
            return False

    def get_network_info(self) -> Dict[str, Any]:
        connected = self.is_connected
        chain_id = None
        block_number = None
        if connected:
            try:
                chain_id = self.w3.eth.chain_id
                block_number = self.w3.eth.block_number
            except Exception:
                pass
        return {
            "rpc_url": self.rpc_url,
            "connected": connected,
            "chain_id": chain_id,
            "expected_chain_id": settings.POLYGON_AMOY_CHAIN_ID,
            "latest_block": block_number,
            "contract_address": self.contract_address,
            "abi_loaded": len(self._abi) > 0,
        }

    @staticmethod
    def encode_bytes32(val: str) -> bytes:
        """Encodes a string into 32 bytes (right-padded with zeros if string, or raw hex bytes)."""
        if val.startswith("0x") and len(val) == 66:
            return bytes.fromhex(val[2:])
        # Pad up to 32 bytes
        raw = val.encode("utf-8")
        if len(raw) > 32:
            raise ValueError(f"String exceeds 32 bytes: {val}")
        return raw.ljust(32, b"\x00")

    def _get_contract(self):
        if not self._contract:
            if not self.contract_address or not self.w3.is_address(self.contract_address):
                raise ValueError("Valid TRUSTCHAIN_CONTRACT_ADDRESS is not configured.")
            if not self._abi:
                raise ValueError(f"Contract ABI could not be loaded from {self.abi_path}")
            self._contract = self.w3.eth.contract(
                address=self.w3.to_checksum_address(self.contract_address),
                abi=self._abi,
            )
        return self._contract

    # --- Read Contract Methods ---

    def get_latest_version(self, plan_id: str) -> int:
        contract = self._get_contract()
        plan_id_bytes = self.encode_bytes32(plan_id)
        return contract.functions.latestVersion(plan_id_bytes).call()

    def plan_exists(self, plan_id: str, version: int) -> bool:
        contract = self._get_contract()
        plan_id_bytes = self.encode_bytes32(plan_id)
        return contract.functions.planExists(plan_id_bytes, version).call()

    def get_plan_version(self, plan_id: str, version: int) -> Dict[str, Any]:
        contract = self._get_contract()
        plan_id_bytes = self.encode_bytes32(plan_id)
        raw = contract.functions.getPlanVersion(plan_id_bytes, version).call()
        # Struct: planHash, simulationHash, orgId, creator, actionMask, requiredStages, completedStages, status, anchoredAt, executionEvidenceHash, executedBy, executedAt
        status_map = {
            0: "NONE",
            1: "PENDING_APPROVAL",
            2: "APPROVED",
            3: "REJECTED",
            4: "REVISION_REQUESTED",
            5: "SUPERSEDED",
            6: "EXECUTED",
        }
        return {
            "plan_hash": "0x" + raw[0].hex(),
            "simulation_hash": "0x" + raw[1].hex(),
            "org_id": "0x" + raw[2].hex(),
            "creator": raw[3],
            "action_mask": raw[4],
            "required_stages": raw[5],
            "completed_stages": raw[6],
            "status_code": raw[7],
            "status": status_map.get(raw[7], "UNKNOWN"),
            "anchored_at": raw[8],
            "execution_evidence_hash": "0x" + raw[9].hex() if raw[9] != b"\x00" * 32 else None,
            "executed_by": raw[10] if raw[10] != "0x0000000000000000000000000000000000000000" else None,
            "executed_at": raw[11] if raw[11] != 0 else None,
        }

    def verify_plan_hash_on_chain(self, plan_id: str, version: int, plan_hash: str) -> bool:
        contract = self._get_contract()
        plan_id_bytes = self.encode_bytes32(plan_id)
        hash_bytes = self.encode_bytes32(plan_hash)
        return contract.functions.verifyPlanHash(plan_id_bytes, version, hash_bytes).call()

    def get_decisions(self, plan_id: str, version: int) -> List[Dict[str, Any]]:
        contract = self._get_contract()
        plan_id_bytes = self.encode_bytes32(plan_id)
        raw_decisions = contract.functions.getDecisions(plan_id_bytes, version).call()
        decision_map = {0: "APPROVE", 1: "REJECT", 2: "REQUEST_REVISION"}
        formatted = []
        for d in raw_decisions:
            formatted.append({
                "actor": d[0],
                "stage": d[1],
                "decision_code": d[2],
                "decision": decision_map.get(d[2], "UNKNOWN"),
                "timestamp": d[3],
                "reason_hash": "0x" + d[4].hex() if d[4] != b"\x00" * 32 else None,
            })
        return formatted

    def execution_eligibility(self, plan_id: str, version: int) -> Tuple[bool, str]:
        contract = self._get_contract()
        plan_id_bytes = self.encode_bytes32(plan_id)
        eligible, reason_code = contract.functions.executionEligibility(plan_id_bytes, version).call()
        reason_map = {
            0: "ELIGIBLE",
            1: "NOT_FOUND",
            2: "NOT_CURRENT_VERSION",
            3: "REJECTED",
            4: "REVISION_REQUESTED",
            5: "APPROVALS_INCOMPLETE",
            6: "ALREADY_EXECUTED",
        }
        return eligible, reason_map.get(reason_code, "UNKNOWN")

    def get_wallet(self, wallet_address: str) -> Dict[str, Any]:
        contract = self._get_contract()
        addr = self.w3.to_checksum_address(wallet_address)
        raw = contract.functions.getWallet(addr).call()
        return {
            "org_id": "0x" + raw[0].hex(),
            "categories": raw[1],
            "active": raw[2],
            "registered_at": raw[3],
            "revoked_at": raw[4],
        }

    def is_active_wallet(self, wallet_address: str) -> bool:
        contract = self._get_contract()
        addr = self.w3.to_checksum_address(wallet_address)
        return contract.functions.isActiveWallet(addr).call()

    # --- Transaction & Receipt Querying ---

    def get_transaction(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        """Queries the RPC node for full transaction details (sender, target, calldata, gas)."""
        try:
            tx = self.w3.eth.get_transaction(tx_hash)
            return dict(tx)
        except TransactionNotFound:
            return None
        except Exception as e:
            raise RuntimeError(f"Error querying RPC for transaction {tx_hash}: {str(e)}")

    def get_transaction_receipt(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        try:
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            return dict(receipt)
        except TransactionNotFound:
            return None
        except Exception as e:
            raise RuntimeError(f"Error querying RPC for transaction receipt {tx_hash}: {str(e)}")

    def get_block_number(self) -> int:
        return self.w3.eth.block_number
