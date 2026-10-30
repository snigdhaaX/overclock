import hashlib
import json
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import jcs

SCHEMA_VERSION = "trustchain-recovery-plan-v1"

def normalize_decimal(val: Any, places: int = 2) -> str:
    """Normalize numeric values to a deterministic decimal string representation."""
    if val is None:
        return "0.00"
    d = Decimal(str(val))
    # Quantize to standard decimal places
    normalized = d.quantize(Decimal(10) ** -places, rounding=ROUND_HALF_UP)
    return f"{normalized:.{places}f}"

def normalize_timestamp(val: Any) -> Optional[str]:
    """Normalize datetime to UTC ISO-8601 formatted string: YYYY-MM-DDTHH:MM:SSZ."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        dt = datetime.fromtimestamp(val, tz=timezone.utc)
    elif isinstance(val, str):
        # Parse ISO string
        s = val.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
    elif isinstance(val, datetime):
        if val.tzinfo is None:
            dt = val.replace(tzinfo=timezone.utc)
        else:
            dt = val.astimezone(timezone.utc)
    else:
        raise ValueError(f"Unsupported timestamp format: {type(val)}")
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def normalize_hash(val: Optional[str]) -> str:
    """Normalize 0x-prefixed or bare hex hashes to lowercase 0x + 64 hex."""
    if not val:
        return "0x" + "0" * 64
    s = val.strip().lower()
    if s.startswith("0x"):
        s = s[2:]
    return "0x" + s.zfill(64)

class RecoveryPlanHashService:
    """
    Dedicated canonical SHA-256 hashing service implementing RFC 8785 (JSON Canonicalization Scheme).
    Ensures:
      1. Identical plan data produces identical hashes.
      2. Material changes, version changes, and organization changes yield different hashes.
      3. Decimals, timestamps, and list ordering are strictly normalized.
      4. Output is compatible with Solidity bytes32.
    """

    @classmethod
    def build_canonical_representation(cls, plan_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract and normalize all approval-relevant fields into a structured canonical dictionary.
        Arbitrary extra fields from frontend objects are stripped out.
        """
        # 1. Organization & Identification
        org_id = str(plan_data.get("organization_id", "")).strip().lower()
        plan_id = str(plan_data.get("plan_id", "")).strip()
        version = int(plan_data.get("version", 1))
        disruption_id = str(plan_data.get("disruption_id", "")).strip()
        sim_hash = normalize_hash(plan_data.get("simulation_hash"))

        # 2. Action Categories (bitmask or list of categories)
        raw_cats = plan_data.get("action_categories", [])
        if isinstance(raw_cats, int):
            action_categories = [raw_cats]
        elif isinstance(raw_cats, list):
            action_categories = sorted(list({int(c) for c in raw_cats}))
        else:
            action_categories = []

        # 3. Recovery Actions (semantic sequence order is preserved)
        raw_actions = plan_data.get("recovery_actions", [])
        normalized_actions: List[Dict[str, Any]] = []
        for act in raw_actions:
            action_entry = {
                "action_type": str(act.get("action_type", "")).strip(),
                "source_warehouse": str(act.get("source_warehouse", "")).strip() if act.get("source_warehouse") else None,
                "destination_warehouse": str(act.get("destination_warehouse", "")).strip() if act.get("destination_warehouse") else None,
                "product_reference": str(act.get("product_reference", "")).strip() if act.get("product_reference") else None,
                "quantity": normalize_decimal(act.get("quantity", 0), places=4),
                "supplier_reference": str(act.get("supplier_reference", "")).strip() if act.get("supplier_reference") else None,
                "estimated_cost": normalize_decimal(act.get("estimated_cost", 0), places=2),
                "currency": str(act.get("currency", "USD")).strip().upper(),
            }
            # Add action-level constraints deterministically
            act_constraints = act.get("constraints")
            if isinstance(act_constraints, dict):
                action_entry["constraints"] = {
                    str(k): str(v) for k, v in sorted(act_constraints.items())
                }
            else:
                action_entry["constraints"] = None
            normalized_actions.append(action_entry)

        # 4. Financials
        total_cost = normalize_decimal(plan_data.get("estimated_total_cost", 0), places=2)
        currency = str(plan_data.get("currency", "USD")).strip().upper()

        # 5. Operational Constraints (sorted key-value)
        raw_constraints = plan_data.get("operational_constraints", {})
        if isinstance(raw_constraints, dict):
            operational_constraints = {
                str(k): str(v) for k, v in sorted(raw_constraints.items())
            }
        else:
            operational_constraints = {}

        # 6. Policy Snapshot or Hash
        policy_snapshot = plan_data.get("policy_snapshot")
        if isinstance(policy_snapshot, dict):
            policy_normalized = {str(k): str(v) for k, v in sorted(policy_snapshot.items())}
        elif isinstance(policy_snapshot, str):
            policy_normalized = policy_snapshot.strip()
        else:
            policy_normalized = None

        return {
            "schema_version": SCHEMA_VERSION,
            "organization_id": org_id,
            "plan_id": plan_id,
            "version": version,
            "disruption_id": disruption_id,
            "simulation_hash": sim_hash,
            "action_categories": action_categories,
            "recovery_actions": normalized_actions,
            "estimated_total_cost": total_cost,
            "currency": currency,
            "operational_constraints": operational_constraints,
            "policy_snapshot": policy_normalized,
        }

    @classmethod
    def generate_plan_hash(cls, plan_data: Dict[str, Any]) -> Tuple[str, str]:
        """
        Generates deterministic RFC 8785 canonical JSON and its SHA-256 digest.
        Returns:
            Tuple[canonical_json_str, bytes32_hex_str]
        """
        canonical_obj = cls.build_canonical_representation(plan_data)
        canonical_bytes = jcs.canonicalize(canonical_obj)
        canonical_json_str = canonical_bytes.decode("utf-8")
        
        digest = hashlib.sha256(canonical_bytes).hexdigest()
        bytes32_hex = f"0x{digest}"
        return canonical_json_str, bytes32_hex

    @classmethod
    def verify_plan_hash(cls, plan_data: Dict[str, Any], expected_hash: str) -> bool:
        """Verify whether a plan's computed canonical hash matches the expected hash."""
        _, computed = cls.generate_plan_hash(plan_data)
        return computed.lower() == expected_hash.strip().lower()
