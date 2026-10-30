import pytest
from backend.app.blockchain.hash_service import (
    RecoveryPlanHashService,
    normalize_decimal,
    normalize_timestamp,
    normalize_hash,
)

SAMPLE_PLAN = {
    "organization_id": "org:acme-logistics",
    "plan_id": "RCP-1001",
    "version": 1,
    "disruption_id": "DISRUPT-404-PORT-STRIKE",
    "simulation_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "action_categories": [1, 2],  # WAREHOUSE_TRANSFER (1), PROCUREMENT (2)
    "recovery_actions": [
        {
            "action_type": "WAREHOUSE_TRANSFER",
            "source_warehouse": "WH-WEST-01",
            "destination_warehouse": "WH-CENTRAL-02",
            "product_reference": "SKU-ELEC-440",
            "quantity": 1500,
            "estimated_cost": 4500.5,
            "currency": "USD",
            "constraints": {"transit_days": "2", "temp_controlled": "true"},
        },
        {
            "action_type": "ALTERNATIVE_PROCUREMENT",
            "supplier_reference": "SUP-GLOBAL-88",
            "product_reference": "SKU-ELEC-440",
            "quantity": 500,
            "estimated_cost": 8000.0,
            "currency": "USD",
            "constraints": {"lead_time_days": "5"},
        },
    ],
    "estimated_total_cost": 12500.50,
    "currency": "USD",
    "operational_constraints": {"sla_hours": "48", "priority": "high"},
    "policy_snapshot": {"required_stages": "3"},
}

def test_identical_inputs_generate_identical_hashes():
    """Identical plan data must produce the exact same canonical JSON and SHA-256 hash."""
    json1, hash1 = RecoveryPlanHashService.generate_plan_hash(SAMPLE_PLAN)
    json2, hash2 = RecoveryPlanHashService.generate_plan_hash(SAMPLE_PLAN)
    assert json1 == json2
    assert hash1 == hash2
    assert hash1.startswith("0x")
    assert len(hash1) == 66  # 0x + 64 hex characters

def test_dict_key_ordering_does_not_affect_hash():
    """RFC 8785 canonicalization sorts keys lexicographically, so dict insertion order doesn't matter."""
    reversed_plan = dict(reversed(list(SAMPLE_PLAN.items())))
    json1, hash1 = RecoveryPlanHashService.generate_plan_hash(SAMPLE_PLAN)
    json2, hash2 = RecoveryPlanHashService.generate_plan_hash(reversed_plan)
    assert json1 == json2
    assert hash1 == hash2

def test_changed_quantity_changes_hash():
    """Modifying an approval-relevant quantity must alter the resulting hash."""
    modified = dict(SAMPLE_PLAN)
    modified["recovery_actions"] = [
        dict(SAMPLE_PLAN["recovery_actions"][0], quantity=1501),  # changed 1500 -> 1501
        SAMPLE_PLAN["recovery_actions"][1],
    ]
    _, hash1 = RecoveryPlanHashService.generate_plan_hash(SAMPLE_PLAN)
    _, hash2 = RecoveryPlanHashService.generate_plan_hash(modified)
    assert hash1 != hash2

def test_changed_version_changes_hash():
    """Modifying plan version produces a distinct fingerprint."""
    modified = dict(SAMPLE_PLAN, version=2)
    _, hash1 = RecoveryPlanHashService.generate_plan_hash(SAMPLE_PLAN)
    _, hash2 = RecoveryPlanHashService.generate_plan_hash(modified)
    assert hash1 != hash2

def test_changed_organization_changes_hash():
    """Organization isolation: two orgs with identical actions have distinct fingerprints."""
    modified = dict(SAMPLE_PLAN, organization_id="org:globex-freight")
    _, hash1 = RecoveryPlanHashService.generate_plan_hash(SAMPLE_PLAN)
    _, hash2 = RecoveryPlanHashService.generate_plan_hash(modified)
    assert hash1 != hash2

def test_changed_simulation_hash_changes_hash():
    """Altering the simulation reference changes the hash."""
    modified = dict(SAMPLE_PLAN, simulation_hash="0x" + "f" * 64)
    _, hash1 = RecoveryPlanHashService.generate_plan_hash(SAMPLE_PLAN)
    _, hash2 = RecoveryPlanHashService.generate_plan_hash(modified)
    assert hash1 != hash2

def test_changed_cost_changes_hash():
    """Financial field changes alter the hash."""
    modified = dict(SAMPLE_PLAN, estimated_total_cost=12500.51)
    _, hash1 = RecoveryPlanHashService.generate_plan_hash(SAMPLE_PLAN)
    _, hash2 = RecoveryPlanHashService.generate_plan_hash(modified)
    assert hash1 != hash2

def test_action_ordering_is_preserved():
    """Recovery actions have execution sequence semantics; swapping order must change the hash."""
    actions_swapped = list(reversed(SAMPLE_PLAN["recovery_actions"]))
    modified = dict(SAMPLE_PLAN, recovery_actions=actions_swapped)
    _, hash1 = RecoveryPlanHashService.generate_plan_hash(SAMPLE_PLAN)
    _, hash2 = RecoveryPlanHashService.generate_plan_hash(modified)
    assert hash1 != hash2

def test_decimal_normalization():
    """Test numeric and decimal formatting consistency."""
    assert normalize_decimal(100) == "100.00"
    assert normalize_decimal(100.0) == "100.00"
    assert normalize_decimal("100.0000") == "100.00"
    assert normalize_decimal(100.555, places=2) == "100.56"
    assert normalize_decimal(None) == "0.00"

def test_timestamp_normalization():
    """Test ISO-8601 UTC timestamp formatting consistency."""
    t1 = normalize_timestamp("2026-10-30T10:00:00Z")
    t2 = normalize_timestamp("2026-10-30T15:30:00+05:30")
    assert t1 == "2026-10-30T10:00:00Z"
    assert t2 == "2026-10-30T10:00:00Z"
    assert t1 == t2

def test_verify_plan_hash_helper():
    """Test verification helper function."""
    _, expected = RecoveryPlanHashService.generate_plan_hash(SAMPLE_PLAN)
    assert RecoveryPlanHashService.verify_plan_hash(SAMPLE_PLAN, expected) is True
    assert RecoveryPlanHashService.verify_plan_hash(SAMPLE_PLAN, "0x" + "0" * 64) is False
