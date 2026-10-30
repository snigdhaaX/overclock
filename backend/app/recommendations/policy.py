"""Settings carried over from the notebook, in one place so they can be tuned without code changes."""
import os
from dataclasses import dataclass


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except ValueError:
        return default


@dataclass(frozen=True)
class RecoveryPolicy:
    # Notebook THR: only orders at least this likely to miss their date get recovery actions.
    action_threshold: float = 0.40
    # Notebook 0.10 margin: an alternative must beat the current supplier's late rate by this much.
    switch_margin: float = 0.10
    # PRD 6.23: below this many recorded outcomes, a supplier has no score.
    min_supplier_outcomes: int = 10
    # Notebook ENV_THR and RESID_THR: when to reroute, and the risk a route may leave behind.
    reroute_risk_threshold: float = 0.70
    residual_risk_limit: float = 0.55
    customs_hours_full_risk: float = 48.0
    # Notebook MAX_TRANSFER, in hours. Its percentile limits don't apply to real stock quantities.
    max_transfer_hours: float = 72.0
    min_donor_free_units: float = 25.0
    # Scores that set the P1, P2 and P3 queues. The notebook's separate priority formula is dropped.
    p1_score: float = 60.0
    p2_score: float = 30.0


def plan_budget_limit() -> float:
    return _env_float("TRUSTCHAIN_PLAN_BUDGET_LIMIT", 100000.0)


DEFAULT_POLICY = RecoveryPolicy()
