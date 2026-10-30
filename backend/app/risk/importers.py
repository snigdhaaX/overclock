"""Load outside datasets into the risk pipeline. Each mapping states what the source lacks."""
import datetime
from typing import Any, Dict
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from .models import RiskExposure

SEED = 42
UNDATED_START = pd.Timestamp("2023-01-01")
UNDATED_SPAN_DAYS = 730
LATE_DAYS = 2.0


def _store(db: Session, organization_id: str, df: pd.DataFrame, data_source: str) -> int:
    existing = db.query(RiskExposure.id).filter(RiskExposure.organization_id == organization_id).first()
    if existing is not None:
        raise ValueError(f"{organization_id} already has data; import into a new organization id.")
    records = df.assign(organization_id=organization_id, data_source=data_source, created_at=datetime.datetime.utcnow())
    rows = records.to_dict("records")
    for row in rows:
        row["snapshot_at"] = row["snapshot_at"].to_pydatetime()
        row["outcome_at"] = row["outcome_at"].to_pydatetime()
    db.bulk_insert_mappings(RiskExposure, rows)
    db.commit()
    return len(rows)


def map_logistics_csv(raw: pd.DataFrame, sample: int = 20000) -> pd.DataFrame:
    """dynamic_supply_chain_logistics_dataset_with_country.csv.

    It has no dates, deadlines, shortages or priorities. Dates here are randomly assigned, so
    a time split on this data is really a random split, and formula inputs are rough proxies.
    """
    df = raw.copy()
    df.columns = df.columns.str.strip().str.lower().str.replace(r"\s+", "_", regex=True)
    # Suppliers of one product share identical rows, including the outcome. Keeping them would
    # put copies of test rows into training and fake a high score.
    numeric = df.select_dtypes("number").columns.tolist()
    df = df.drop_duplicates(subset=numeric).reset_index(drop=True)
    if len(df) > sample:
        df = df.sample(sample, random_state=SEED).reset_index(drop=True)
    rng = np.random.default_rng(SEED)
    snapshot = UNDATED_START + pd.to_timedelta(rng.uniform(0, UNDATED_SPAN_DAYS * 24, len(df)), unit="h")
    required = df["historical_demand"].clip(lower=1.0)
    hours = df["lead_time_days"].clip(lower=0) * 24.0
    return pd.DataFrame({
        "exposure_id": [f"LOG-{i:06d}" for i in range(len(df))],
        "supplier_id": df["supplier_id"],
        "carrier_id": df["supplier_country"],
        "snapshot_at": snapshot,
        "hours_to_deadline": hours,
        "required_qty": required,
        "shortage_qty": (required - df["warehouse_inventory_level"]).clip(lower=0).clip(upper=required),
        "reported_delay_hours": df["delay_probability"].clip(0, 1) * 48.0,
        "priority_tier": 3,
        "route_risk": df["route_risk_level"],
        "weather_severity": df["weather_condition_severity"],
        "customs_hours": df["customs_clearance_time"].clip(lower=0) * 24.0,
        "missed_deadline": (df["delivery_time_deviation"] >= LATE_DAYS).astype(int),
        "outcome_at": snapshot + pd.to_timedelta(hours + 24.0, unit="h"),
    })


def map_dataco(raw: pd.DataFrame) -> pd.DataFrame:
    """DataCo Smart Supply Chain (Mendeley, CC BY 4.0).

    Has real order dates, promised days and a late flag, but no supplier, carrier, shortage,
    disruption or priority. Department and shipping mode stand in for supplier and carrier.
    The formula is left with only its deadline input, so it is handicapped here.
    """
    df = raw[~raw["Delivery Status"].eq("Shipping canceled")].copy()
    snapshot = pd.to_datetime(df["order date (DateOrders)"], format="%m/%d/%Y %H:%M")
    outcome = pd.to_datetime(df["shipping date (DateOrders)"], format="%m/%d/%Y %H:%M")
    quantity = df["Order Item Quantity"].astype(float)
    out = pd.DataFrame({
        "exposure_id": "DC-" + df["Order Item Id"].astype(str),
        "supplier_id": df["Department Name"].astype(str),
        "carrier_id": df["Shipping Mode"].astype(str),
        "snapshot_at": snapshot,
        "hours_to_deadline": df["Days for shipment (scheduled)"].astype(float) * 24.0,
        "required_qty": quantity,
        "shortage_qty": 0.0,
        "reported_delay_hours": 0.0,
        "priority_tier": 3,
        "route_risk": None,
        "weather_severity": None,
        "customs_hours": None,
        "missed_deadline": df["Late_delivery_risk"].astype(int),
        "outcome_at": outcome,
    })
    return out[out["outcome_at"] >= out["snapshot_at"]].reset_index(drop=True)


def import_logistics_csv(db: Session, organization_id: str, path: str, sample: int = 20000) -> Dict[str, Any]:
    raw = pd.read_csv(path)
    mapped = map_logistics_csv(raw, sample)
    return {"source_rows": len(raw), "imported": _store(db, organization_id, mapped, "logistics_csv_undated")}


def import_dataco(db: Session, organization_id: str, path: str) -> Dict[str, Any]:
    raw = pd.read_csv(path, encoding="latin-1", usecols=[
        "Delivery Status", "order date (DateOrders)", "shipping date (DateOrders)", "Order Item Quantity",
        "Order Item Id", "Department Name", "Shipping Mode", "Days for shipment (scheduled)", "Late_delivery_risk",
    ])
    mapped = map_dataco(raw)
    return {"source_rows": len(raw), "imported": _store(db, organization_id, mapped, "dataco_public")}
