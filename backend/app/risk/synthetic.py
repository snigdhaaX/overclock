"""Reproducible demonstration data (PRD 6.17). Results on it show the pipeline works, not real-world accuracy."""
import datetime
from typing import Any, Dict, List, Optional
import numpy as np

START = datetime.datetime(2024, 1, 1)


def generate(
    rows: int = 6000,
    days: int = 730,
    seed: int = 7,
    suppliers: int = 40,
    carriers: int = 6,
    start: datetime.datetime = START,
    id_prefix: str = "EXP",
    degrade_suppliers: float = 0.0,
    random_labels: bool = False,
    supplier_effect: float = 2.8,
) -> List[Dict[str, Any]]:
    """Each row is an order line exposed to a disruption, with a simulated final outcome.

    degrade_suppliers makes that share of the most reliable suppliers much worse, to test
    adaptation to change. random_labels removes all signal, to test that weak models get rejected.
    supplier_effect sets how much supplier reliability matters, which the formula cannot see.
    """
    rng = np.random.default_rng(seed)
    # Fixed by a separate stream so every call in a scenario sees the same suppliers.
    base = np.random.default_rng(1234)
    supplier_quality = base.beta(5, 2, suppliers)
    carrier_quality = base.beta(6, 2, carriers)
    if degrade_suppliers > 0:
        worst_hit = np.argsort(-supplier_quality)[: int(suppliers * degrade_suppliers)]
        supplier_quality = supplier_quality.copy()
        supplier_quality[worst_hit] = 0.15

    s = rng.integers(0, suppliers, rows)
    c = rng.integers(0, carriers, rows)
    offsets = np.sort(rng.uniform(0, days * 24, rows))
    hours_to_deadline = rng.uniform(-12, 240, rows)
    required = rng.integers(10, 500, rows).astype(float)
    shortage = np.floor(required * rng.beta(1.2, 2.5, rows))
    reported_delay = rng.gamma(2.0, 18.0, rows)
    tier = rng.integers(1, 5, rows)
    route_risk = rng.uniform(0, 1, rows)
    weather = rng.uniform(0, 1, rows)
    customs = rng.gamma(2.0, 8.0, rows)

    slack = hours_to_deadline - reported_delay - customs * 0.3
    logit = (
        -1.2
        - slack / 45.0
        + 1.6 * (shortage / required)
        + supplier_effect * (0.7 - supplier_quality[s])
        + 1.4 * (0.75 - carrier_quality[c])
        + 0.8 * route_risk * weather
    )
    probability = 1.0 / (1.0 + np.exp(-logit))
    missed = rng.binomial(1, 0.25, rows) if random_labels else rng.binomial(1, probability)
    resolve_hours = np.maximum(hours_to_deadline, 0) + rng.uniform(1, 48, rows)

    items = []
    for i in range(rows):
        snapshot = start + datetime.timedelta(hours=float(offsets[i]))
        items.append({
            "exposure_id": f"{id_prefix}-{i:06d}",
            "supplier_id": f"SUP-{int(s[i]):03d}",
            "carrier_id": f"CAR-{int(c[i]):02d}",
            "snapshot_at": snapshot,
            "hours_to_deadline": round(float(hours_to_deadline[i]), 2),
            "required_qty": float(required[i]),
            "shortage_qty": float(shortage[i]),
            "reported_delay_hours": round(float(reported_delay[i]), 2),
            "priority_tier": int(tier[i]),
            "route_risk": round(float(route_risk[i]), 4),
            "weather_severity": round(float(weather[i]), 4),
            "customs_hours": round(float(customs[i]), 2),
            "missed_deadline": int(missed[i]),
            "outcome_at": snapshot + datetime.timedelta(hours=float(resolve_hours[i])),
        })
    return items
