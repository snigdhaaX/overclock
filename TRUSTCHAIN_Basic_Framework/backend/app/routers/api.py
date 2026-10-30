from __future__ import annotations
import json
import os
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Body, Depends, Header, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import (
    Supplier, Warehouse, Inventory, PurchaseOrder, Shipment,
    CustomerOrder, OrderLine, DisruptionEvent, RecoveryPlan, AuditLog,
)
from ..schemas import CarrierEventIn, RecoveryPlanIn, ApprovalIn, RecoveryPlanOut
from ..services.audit import record_audit
from ..services.impact import analyze_shipment
from ..services.security import get_actor, require_role

router = APIRouter(prefix="/api/v1", tags=["TRUSTCHAIN API"])


def _dt(value):
    return value.isoformat() if value else None


def _event_dict(event: DisruptionEvent):
    return {
        "id": event.id, "source": event.source, "event_id": event.event_id,
        "shipment_id": event.shipment_id, "event_type": event.event_type,
        "delay_days": event.delay_days, "sequence_no": event.sequence_no,
        "processing_status": event.processing_status, "received_at": _dt(event.received_at),
    }


@router.get("/health")
def health():
    return {"status": "ok", "service": "trustchain-api", "mode": "prototype"}


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    shipments = db.scalars(select(Shipment).where(Shipment.status == "delayed")).all()
    analyses = [analyze_shipment(db, row.id) for row in shipments]
    orders = []
    seen = set()
    for analysis in analyses:
        for impact in analysis["orders"]:
            if impact["order_id"] not in seen:
                seen.add(impact["order_id"])
                orders.append(impact)
    orders.sort(key=lambda item: -item["risk"]["score"])
    recent_events = db.scalars(select(DisruptionEvent).order_by(DisruptionEvent.id.desc()).limit(5)).all()
    return {
        "suppliers": db.scalar(select(func.count()).select_from(Supplier)) or 0,
        "shipments": db.scalar(select(func.count()).select_from(Shipment)) or 0,
        "open_orders": db.scalar(select(func.count()).select_from(CustomerOrder).where(CustomerOrder.status == "open")) or 0,
        "active_disruptions": len(shipments),
        "affected_orders": len(orders),
        "critical_orders": sum(1 for row in orders if row["risk"]["band"] == "critical"),
        "top_risks": orders[:6],
        "recent_events": [_event_dict(event) for event in recent_events],
    }


@router.get("/suppliers")
def list_suppliers(db: Session = Depends(get_db)):
    rows = db.scalars(select(Supplier).order_by(Supplier.id)).all()
    return [{"id": r.id, "name": r.name, "lead_time_days": r.lead_time_days,
             "capacity_units": r.capacity_units, "status": r.status} for r in rows]


@router.get("/shipments")
def list_shipments(db: Session = Depends(get_db)):
    rows = db.scalars(select(Shipment).order_by(Shipment.id)).all()
    return [{"id": r.id, "purchase_order_id": r.purchase_order_id,
             "supplier": r.purchase_order.supplier.name, "sku": r.purchase_order.sku,
             "quantity": r.purchase_order.quantity, "carrier": r.carrier,
             "status": r.status, "delay_days": r.delay_days,
             "eta": _dt(r.eta), "event_sequence": r.event_sequence} for r in rows]


@router.get("/inventory")
def list_inventory(db: Session = Depends(get_db)):
    rows = db.scalars(select(Inventory).order_by(Inventory.sku, Inventory.warehouse_id)).all()
    return [{"id": r.id, "sku": r.sku, "warehouse": r.warehouse.name,
             "warehouse_id": r.warehouse_id, "on_hand": r.on_hand,
             "reserved": r.reserved, "usable": r.usable} for r in rows]


@router.get("/orders")
def list_orders(db: Session = Depends(get_db)):
    rows = db.scalars(select(CustomerOrder).order_by(CustomerOrder.sla_deadline)).all()
    return [{"id": r.id, "customer_name": r.customer_name, "priority": r.priority,
             "sla_deadline": _dt(r.sla_deadline), "status": r.status,
             "lines": [{"id": line.id, "sku": line.sku, "quantity": line.quantity,
                        "fulfilled_qty": line.fulfilled_qty} for line in r.lines]} for r in rows]


@router.post("/import/json")
def import_json_records(
    payload: dict = Body(..., description="JSON batch with suppliers, warehouses and inventory arrays"),
    actor: dict = Depends(get_actor),
    db: Session = Depends(get_db),
):
    """Basic JSON data import with strict rollback or partial row acceptance."""
    require_role(actor, "operations_analyst")
    mode = str(payload.get("mode", "strict")).lower()
    if mode not in {"strict", "partial"}:
        raise HTTPException(status_code=422, detail="mode must be strict or partial")
    counts = {"suppliers": 0, "warehouses": 0, "inventory": 0}
    errors = []
    new_warehouse_ids = set()

    for row_index, row in enumerate(payload.get("suppliers", []), start=1):
        try:
            name = str(row["name"]).strip()
            lead_time = int(row.get("lead_time_days", 7))
            capacity = int(row.get("capacity_units", 1000))
            if not name or lead_time < 0 or capacity <= 0:
                raise ValueError("name is required; lead_time_days must be non-negative; capacity_units must be positive")
            exists = db.scalar(select(Supplier.id).where(Supplier.name == name))
            if exists:
                raise ValueError(f"supplier '{name}' already exists")
            db.add(Supplier(name=name, lead_time_days=lead_time, capacity_units=capacity, status="active"))
            counts["suppliers"] += 1
        except Exception as exc:
            errors.append({"dataset": "suppliers", "row": row_index, "error": str(exc)})

    for row_index, row in enumerate(payload.get("warehouses", []), start=1):
        try:
            name = str(row["name"]).strip()
            location = str(row.get("location", "Unknown"))
            capacity = int(row.get("capacity_units", 10000))
            if not name or capacity <= 0:
                raise ValueError("name is required and capacity_units must be positive")
            exists = db.scalar(select(Warehouse.id).where(Warehouse.name == name))
            if exists:
                raise ValueError(f"warehouse '{name}' already exists")
            warehouse = Warehouse(name=name, location=location, capacity_units=capacity)
            db.add(warehouse)
            db.flush()
            new_warehouse_ids.add(warehouse.id)
            counts["warehouses"] += 1
        except Exception as exc:
            errors.append({"dataset": "warehouses", "row": row_index, "error": str(exc)})

    for row_index, row in enumerate(payload.get("inventory", []), start=1):
        try:
            sku = str(row["sku"]).strip()
            warehouse_id = int(row["warehouse_id"])
            on_hand = int(row["on_hand"])
            reserved = int(row.get("reserved", 0))
            warehouse_exists = warehouse_id in new_warehouse_ids or db.get(Warehouse, warehouse_id) is not None
            if not sku or not warehouse_exists:
                raise ValueError("sku is required and warehouse_id must reference an existing warehouse")
            if on_hand < 0 or reserved < 0 or reserved > on_hand:
                raise ValueError("inventory quantities must satisfy 0 <= reserved <= on_hand")
            db.add(Inventory(sku=sku, warehouse_id=warehouse_id, on_hand=on_hand, reserved=reserved))
            counts["inventory"] += 1
        except Exception as exc:
            errors.append({"dataset": "inventory", "row": row_index, "error": str(exc)})

    if errors and mode == "strict":
        db.rollback()
        raise HTTPException(status_code=422, detail={"message": "Import rejected; no rows were committed.", "row_errors": errors})
    record_audit(db, actor, "json_data_imported", "import_batch", "json", {"mode": mode, "counts": counts, "errors": len(errors)})
    db.commit()
    return {"mode": mode, "created": counts, "error_count": len(errors), "row_errors": errors}


@router.post("/webhooks/carriers/simulated")
def carrier_webhook(
    payload: CarrierEventIn,
    x_webhook_token: str = Header(default="", alias="X-Webhook-Token"),
    db: Session = Depends(get_db),
):
    expected = os.getenv("WEBHOOK_TOKEN", "dev-webhook-token")
    if x_webhook_token != expected:
        raise HTTPException(status_code=401, detail="Invalid webhook token")
    existing = db.scalar(select(DisruptionEvent).where(
        DisruptionEvent.source == payload.source,
        DisruptionEvent.event_id == payload.event_id,
    ))
    if existing:
        return {"accepted": True, "duplicate": True, "event": _event_dict(existing)}

    shipment = db.get(Shipment, payload.shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    event = DisruptionEvent(
        source=payload.source, event_id=payload.event_id, shipment_id=payload.shipment_id,
        event_type=payload.event_type.upper(), delay_days=payload.delay_days,
        sequence_no=payload.sequence_no, payload_json=payload.model_dump_json(),
        processing_status="received",
    )
    if payload.sequence_no <= shipment.event_sequence:
        event.processing_status = "ignored_out_of_order"
        db.add(event)
        db.commit()
        db.refresh(event)
        return {"accepted": True, "ignored": True, "reason": "out_of_order", "event": _event_dict(event)}

    if payload.event_type.upper() == "DELAY":
        shipment.status = "delayed"
        shipment.delay_days = max(shipment.delay_days, payload.delay_days)
        eta = shipment.eta
        if eta.tzinfo is None:
            eta = eta.replace(tzinfo=timezone.utc)
        shipment.eta = eta + timedelta(days=payload.delay_days)
    elif payload.event_type.upper() == "DELIVERED":
        shipment.status = "delivered"
        shipment.delay_days = 0
    elif payload.event_type.upper() == "DEPARTED":
        shipment.status = "in_transit"
    else:
        raise HTTPException(status_code=422, detail="event_type must be DELAY, DEPARTED or DELIVERED")

    shipment.event_sequence = payload.sequence_no
    event.processing_status = "processed"
    db.add(event)
    system_actor = {"id": f"webhook:{payload.source}", "role": "system"}
    record_audit(db, system_actor, "carrier_event_processed", "shipment", str(shipment.id),
                 {"event_id": payload.event_id, "event_type": payload.event_type, "sequence_no": payload.sequence_no})
    db.commit()
    db.refresh(event)
    return {"accepted": True, "duplicate": False, "event": _event_dict(event), "shipment_status": shipment.status}


@router.post("/analysis/shipments/{shipment_id}")
def run_impact_analysis(shipment_id: int, db: Session = Depends(get_db)):
    result = analyze_shipment(db, shipment_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return result


@router.post("/plans", response_model=RecoveryPlanOut)
def create_plan(payload: RecoveryPlanIn, actor: dict = Depends(get_actor), db: Session = Depends(get_db)):
    require_role(actor, "operations_analyst")
    if not db.get(CustomerOrder, payload.order_id):
        raise HTTPException(status_code=404, detail="Customer order not found")
    plan = RecoveryPlan(
        order_id=payload.order_id, action=payload.action, description=payload.description,
        status="draft", version=1, created_by=actor["id"],
    )
    db.add(plan)
    db.flush()
    record_audit(db, actor, "recovery_plan_created", "recovery_plan", str(plan.id),
                 {"order_id": payload.order_id, "action": payload.action, "version": plan.version})
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/plans", response_model=list[RecoveryPlanOut])
def list_plans(db: Session = Depends(get_db)):
    return db.scalars(select(RecoveryPlan).order_by(RecoveryPlan.id.desc())).all()


@router.post("/plans/{plan_id}/submit", response_model=RecoveryPlanOut)
def submit_plan(plan_id: int, actor: dict = Depends(get_actor), db: Session = Depends(get_db)):
    require_role(actor, "operations_analyst")
    plan = db.get(RecoveryPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Recovery plan not found")
    if plan.created_by != actor["id"]:
        raise HTTPException(status_code=403, detail="Only the plan creator can submit this draft")
    if plan.status != "draft":
        raise HTTPException(status_code=409, detail="Only draft plans can be submitted")
    plan.status = "submitted"
    plan.version += 1
    record_audit(db, actor, "recovery_plan_submitted", "recovery_plan", str(plan.id), {"version": plan.version})
    db.commit()
    db.refresh(plan)
    return plan


@router.post("/plans/{plan_id}/approve", response_model=RecoveryPlanOut)
def approve_plan(plan_id: int, payload: ApprovalIn, actor: dict = Depends(get_actor), db: Session = Depends(get_db)):
    plan = db.get(RecoveryPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Recovery plan not found")
    if plan.action == "alternative_supplier":
        require_role(actor, "procurement_approver")
    else:
        require_role(actor, "supply_chain_manager")
    if plan.created_by == actor["id"]:
        raise HTTPException(status_code=403, detail="Self-approval is prohibited")
    if plan.status != "submitted":
        raise HTTPException(status_code=409, detail="Only submitted plans can be approved")
    if payload.expected_version != plan.version:
        raise HTTPException(status_code=409, detail="Stale plan version; refresh before approving")
    plan.status = "approved"
    plan.approved_by = actor["id"]
    plan.version += 1
    record_audit(db, actor, "recovery_plan_approved", "recovery_plan", str(plan.id),
                 {"approved_version": payload.expected_version, "comment": payload.comment})
    db.commit()
    db.refresh(plan)
    return plan


@router.post("/plans/{plan_id}/reject", response_model=RecoveryPlanOut)
def reject_plan(plan_id: int, payload: ApprovalIn, actor: dict = Depends(get_actor), db: Session = Depends(get_db)):
    plan = db.get(RecoveryPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Recovery plan not found")
    if plan.action == "alternative_supplier":
        require_role(actor, "procurement_approver")
    else:
        require_role(actor, "supply_chain_manager")
    if plan.created_by == actor["id"]:
        raise HTTPException(status_code=403, detail="Creator cannot reject their own plan")
    if plan.status != "submitted" or payload.expected_version != plan.version:
        raise HTTPException(status_code=409, detail="Plan is not submitted or its version is stale")
    plan.status = "rejected"
    plan.version += 1
    record_audit(db, actor, "recovery_plan_rejected", "recovery_plan", str(plan.id), {"comment": payload.comment})
    db.commit()
    db.refresh(plan)
    return plan


@router.post("/plans/{plan_id}/execute", response_model=RecoveryPlanOut)
def execute_plan(plan_id: int, actor: dict = Depends(get_actor), db: Session = Depends(get_db)):
    require_role(actor, "warehouse_operator")
    plan = db.get(RecoveryPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Recovery plan not found")
    if plan.status != "approved":
        raise HTTPException(status_code=409, detail="Only approved plans can be executed")
    plan.status = "executed"
    plan.version += 1
    record_audit(db, actor, "recovery_plan_executed", "recovery_plan", str(plan.id), {"approved_by": plan.approved_by})
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/audit")
def list_audit(db: Session = Depends(get_db)):
    rows = db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(50)).all()
    return [{"id": r.id, "actor_id": r.actor_id, "actor_role": r.actor_role,
             "action": r.action, "entity_type": r.entity_type, "entity_id": r.entity_id,
             "details": json.loads(r.details or "{}"), "previous_hash": r.previous_hash,
             "record_hash": r.record_hash, "created_at": _dt(r.created_at)} for r in rows]


@router.get("/audit/verify")
def verify_audit_chain(db: Session = Depends(get_db)):
    rows = db.scalars(select(AuditLog).order_by(AuditLog.id.asc())).all()
    expected_previous = "0" * 64
    for row in rows:
        created_at = row.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        body = {
            "actor_id": row.actor_id, "actor_role": row.actor_role, "action": row.action,
            "entity_type": row.entity_type, "entity_id": str(row.entity_id),
            "details": json.loads(row.details or "{}"), "previous_hash": row.previous_hash,
            "created_at": created_at.isoformat(),
        }
        calculated = __import__("hashlib").sha256(
            json.dumps(body, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        if row.previous_hash != expected_previous or calculated != row.record_hash:
            return {"valid": False, "checked_records": row.id - 1, "invalid_record_id": row.id}
        expected_previous = row.record_hash
    return {"valid": True, "checked_records": len(rows), "invalid_record_id": None}
