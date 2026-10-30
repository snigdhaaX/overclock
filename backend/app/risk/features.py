"""Point-in-time features. History only counts outcomes known before each snapshot, so nothing leaks."""
from typing import List, Tuple
import numpy as np
import pandas as pd
from .formula import components

RECENT_WINDOW = 30

BASE_FEATURES = [
    "hours_to_deadline", "shortage_ratio", "reported_delay_hours", "slack_hours",
    "priority_tier", "route_risk", "weather_severity", "customs_hours",
]
# Raw history counts are left out: they only grow over time, so a model would learn the date, not reliability.
HISTORY_FEATURES = [
    "supplier_hist_miss_rate", "supplier_recent_miss_rate",
    "carrier_hist_miss_rate", "carrier_recent_miss_rate",
]
FEATURES = BASE_FEATURES + HISTORY_FEATURES


def _entity_history(history: pd.DataFrame, query: pd.DataFrame, key: str, prefix: str) -> pd.DataFrame:
    out = pd.DataFrame(index=query.index, columns=[f"{prefix}_hist_n", f"{prefix}_hist_miss_rate", f"{prefix}_recent_miss_rate"], dtype=float)
    groups: List[Tuple[object, pd.DataFrame]] = list(history.groupby(key, sort=False))
    lookup = {name: g.sort_values("outcome_at") for name, g in groups}
    for name, q in query.groupby(key, sort=False):
        g = lookup.get(name)
        if g is None:
            out.loc[q.index, f"{prefix}_hist_n"] = 0.0
            continue
        times = g["outcome_at"].to_numpy(dtype="datetime64[ns]")
        misses = np.concatenate([[0.0], np.cumsum(g["missed_deadline"].to_numpy(dtype=float))])
        n = np.searchsorted(times, q["snapshot_at"].to_numpy(dtype="datetime64[ns]"), side="left")
        start = np.maximum(n - RECENT_WINDOW, 0)
        with np.errstate(divide="ignore", invalid="ignore"):
            rate = np.where(n > 0, misses[n] / n, np.nan)
            recent = np.where(n > 0, (misses[n] - misses[start]) / (n - start), np.nan)
        out.loc[q.index, f"{prefix}_hist_n"] = n.astype(float)
        out.loc[q.index, f"{prefix}_hist_miss_rate"] = rate
        out.loc[q.index, f"{prefix}_recent_miss_rate"] = recent
    return out


def build_features(query: pd.DataFrame, history: pd.DataFrame) -> pd.DataFrame:
    """Build the model matrix for query rows using only resolved rows from history."""
    resolved = history[history["missed_deadline"].notna() & history["outcome_at"].notna()]
    x = pd.DataFrame(index=query.index)
    x["hours_to_deadline"] = query["hours_to_deadline"].astype(float)
    x["shortage_ratio"] = components(query)["shortage_severity"] / 100.0
    x["reported_delay_hours"] = query["reported_delay_hours"].astype(float)
    x["slack_hours"] = x["hours_to_deadline"] - x["reported_delay_hours"]
    x["priority_tier"] = query["priority_tier"].astype(float)
    for col in ("route_risk", "weather_severity", "customs_hours"):
        x[col] = pd.to_numeric(query[col], errors="coerce").astype(float)
    x = x.join(_entity_history(resolved, query, "supplier_id", "supplier"))
    x = x.join(_entity_history(resolved, query, "carrier_id", "carrier"))
    return x[FEATURES]
