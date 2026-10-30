"""Quantity-aware disruption impact and deterministic risk scoring."""
from __future__ import annotations
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..models import Shipment, Inventory, OrderLine, CustomerOrder

PRIORITY_SCORE = {"tier_1": 100, "tier_2": 75, "tier_3": 50, "tier_4": 25}


def risk_band(score: float) -> str:
    if score >= 75:
        return "critical"
    if score >= 50:
        return "high"
    if score >= 25:
        return "moderate"
    return "low"


def deadline_urgency(deadline: datetime) -> float:
    now = datetime.now(timezone.utc)
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    hours_left = (deadline - now).total_seconds() / 3600
    # Linear urgency over a seven-day planning horizon.
    return max(0.0, min(100.0, 100.0 - (max(0.0, hours_left) / 168.0 * 100.0)))


def calculate_risk(order: CustomerOrder, exposed_units: int, delay_days: int, line_quantity: int) -> dict:
    d = deadline_urgency(order.sla_deadline)
    s = min(100.0, (exposed_units / max(line_quantity, 1)) * 100.0)
    i = min(100.0, (max(delay_days, 0) / 14.0) * 100.0)
    p = float(PRIORITY_SCORE.get(order.priority.lower(), 50))
    score = round(0.35 * d + 0.30 * s + 0.20 * i + 0.15 * p, 1)
    return {
        "score": score,
        "band": risk_band(score),
        "components": {"deadline_urgency": round(d, 1), "shortage_severity": round(s, 1),
                       "disruption_impact": round(i, 1), "business_priority": p},
    }


def analyze_shipment(db: Session, shipment_id: int) -> dict:
    shipment = db.get(Shipment, shipment_id)
    if not shipment:
        return None
    po = shipment.purchase_order
    usable_total = sum(row.usable for row in db.scalars(select(Inventory).where(Inventory.sku == po.sku)).all())
    lines = db.scalars(
        select(OrderLine)
        .join(CustomerOrder, OrderLine.order_id == CustomerOrder.id)
        .where(OrderLine.sku == po.sku, CustomerOrder.status == "open")
        .order_by(
            # Tier ordering is handled in Python for clarity and portability.
            OrderLine.id.asc()
        )
    ).all()
    # Allocate free stock to the most important and earliest-deadline orders first.
    order_rows = [(line, db.get(CustomerOrder, line.order_id)) for line in lines]
    order_rows.sort(key=lambda pair: (
        -PRIORITY_SCORE.get(pair[1].priority.lower(), 50),
        pair[1].sla_deadline,
        pair[1].id,
    ))
    inventory_left = usable_total
    delayed_supply_left = po.quantity
    impacts = []
    for line, order in order_rows:
        remaining_demand = max(0, line.quantity - line.fulfilled_qty)
        stock_allocated = min(inventory_left, remaining_demand)
        inventory_left -= stock_allocated
        uncovered = remaining_demand - stock_allocated
        exposed = min(uncovered, delayed_supply_left) if shipment.status == "delayed" and shipment.delay_days > 0 else 0
        delayed_supply_left = max(0, delayed_supply_left - exposed)
        if exposed > 0:
            risk = calculate_risk(order, exposed, shipment.delay_days, remaining_demand)
            impacts.append({
                "order_id": order.id,
                "customer_name": order.customer_name,
                "priority": order.priority,
                "sla_deadline": order.sla_deadline.isoformat(),
                "sku": line.sku,
                "line_quantity": line.quantity,
                "fulfilled_qty": line.fulfilled_qty,
                "usable_stock_allocated": stock_allocated,
                "exposed_units": exposed,
                "risk": risk,
            })
    impacts.sort(key=lambda row: (-row["risk"]["score"], row["sla_deadline"]))
    return {
        "shipment_id": shipment.id,
        "shipment_status": shipment.status,
        "purchase_order_id": po.id,
        "sku": po.sku,
        "delayed_supply_units": po.quantity,
        "usable_inventory_units": usable_total,
        "affected_order_count": len(impacts),
        "total_exposed_units": sum(row["exposed_units"] for row in impacts),
        "orders": impacts,
        "method": "Deterministic prototype calculation; inventory is allocated by priority and SLA deadline.",
    }
