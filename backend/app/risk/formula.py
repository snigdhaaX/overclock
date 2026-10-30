"""PRD 6.58 deterministic risk formula: Risk = 0.35D + 0.30S + 0.20I + 0.15P."""
from dataclasses import dataclass
from typing import Dict
import numpy as np
import pandas as pd


@dataclass(frozen=True)
class FormulaPolicy:
    version: str = "formula-v1"
    deadline_weight: float = 0.35
    shortage_weight: float = 0.30
    impact_weight: float = 0.20
    priority_weight: float = 0.15
    deadline_horizon_hours: float = 168.0
    impact_horizon_hours: float = 336.0


DEFAULT_POLICY = FormulaPolicy()
PRIORITY_SCORE = {1: 100.0, 2: 75.0, 3: 50.0, 4: 25.0}
# ML estimates how likely a miss is; this scales it by how much that order matters.
PRIORITY_WEIGHT = {1: 1.0, 2: 0.85, 3: 0.7, 4: 0.5}


def components(df: pd.DataFrame, policy: FormulaPolicy = DEFAULT_POLICY) -> pd.DataFrame:
    """Each component is normalized to 0-100 as PRD 6.58 requires."""
    deadline = 100.0 - df["hours_to_deadline"].clip(lower=0) / policy.deadline_horizon_hours * 100.0
    shortage = df["shortage_qty"] / df["required_qty"].clip(lower=1) * 100.0
    impact = df["reported_delay_hours"].clip(lower=0) / policy.impact_horizon_hours * 100.0
    priority = df["priority_tier"].map(PRIORITY_SCORE).fillna(50.0)
    return pd.DataFrame({
        "deadline_urgency": deadline.clip(0, 100),
        "shortage_severity": shortage.clip(0, 100),
        "disruption_impact": impact.clip(0, 100),
        "business_priority": priority,
    }, index=df.index)


def score(df: pd.DataFrame, policy: FormulaPolicy = DEFAULT_POLICY) -> np.ndarray:
    c = components(df, policy)
    return (
        policy.deadline_weight * c["deadline_urgency"]
        + policy.shortage_weight * c["shortage_severity"]
        + policy.impact_weight * c["disruption_impact"]
        + policy.priority_weight * c["business_priority"]
    ).to_numpy()


def category(value: float) -> str:
    """PRD 6.59 risk categories."""
    if value >= 75:
        return "CRITICAL"
    if value >= 50:
        return "HIGH"
    if value >= 25:
        return "MODERATE"
    return "LOW"


def explain_row(row: pd.DataFrame, policy: FormulaPolicy = DEFAULT_POLICY) -> Dict[str, Dict[str, float]]:
    c = components(row, policy).iloc[0]
    weights = {
        "deadline_urgency": policy.deadline_weight,
        "shortage_severity": policy.shortage_weight,
        "disruption_impact": policy.impact_weight,
        "business_priority": policy.priority_weight,
    }
    return {k: {"component": round(float(c[k]), 2), "contribution": round(float(c[k]) * w, 2)} for k, w in weights.items()}
