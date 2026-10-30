"""Disruption-to-recovery workflow. ML advises, rules decide what's feasible, people decide what happens."""
import datetime
import hashlib
import json
import uuid
from typing import Any, Dict, List, Optional
import jcs
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..blockchain.hash_service import RecoveryPlanHashService
from ..models.base import utcnow
from ..models.governance import AuditEvent, Notification
from ..models.identity import Organization, Role, User, UserRole
from ..models.intelligence import Disruption, ImpactAssessment, ImpactAssessmentLine, RiskAssessment
from ..models.inventory import CustomerOrder, FulfilmentAllocation, Inventory, InventoryAdjustment, OrderItem
from ..models.recovery import Approval, ExecutionAction, ExecutionRun, RecoveryPlan, RecoveryPlanAction
from ..models.supply_chain import Carrier, CarrierEvent, Product, Shipment, ShipmentItem, Supplier, SupplierProduct, Warehouse
from ..risk import service as risk_service, training
from ..risk.models import RiskExposure
from . import chain


class WorkflowError(Exception):
    def __init__(self, status: int, code: str, message: str):
        self.status, self.code, self.message = status, code, message


def aware(value: Optional[datetime.datetime]) -> Optional[datetime.datetime]:
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=datetime.timezone.utc)


# --- Audit ---

def _canonical_audit(event: AuditEvent) -> bytes:
    return jcs.canonicalize({
        "sequence": event.sequence, "actor": str(event.actor_id) if event.actor_id else None, "action": event.action_type,
        "entity_type": event.entity_type, "entity_id": event.entity_id, "plan_version": event.plan_version,
        "metadata": event.event_metadata, "occurred_at": aware(event.occurred_at).astimezone(datetime.timezone.utc).isoformat(),
    })


def audit(db: Session, org_id, actor_id, action: str, entity_type: str, entity_id: str, metadata: Optional[Dict[str, Any]] = None, plan_version: Optional[int] = None) -> AuditEvent:
    previous = db.query(AuditEvent).filter_by(organization_id=org_id).order_by(AuditEvent.sequence.desc()).first()
    event = AuditEvent(
        id=uuid.uuid4(), organization_id=org_id, sequence=(previous.sequence + 1) if previous else 1, actor_id=actor_id, action_type=action,
        entity_type=entity_type, entity_id=str(entity_id), plan_version=plan_version, event_metadata=metadata or {},
        previous_hash=previous.current_hash if previous else None, occurred_at=utcnow(),
    )
    event.current_hash = hashlib.sha256((event.previous_hash or "").encode() + _canonical_audit(event)).hexdigest()
    db.add(event)
    db.flush()
    return event


def verify_audit_chain(db: Session, org_id) -> Dict[str, Any]:
    previous = None
    events = db.query(AuditEvent).filter_by(organization_id=org_id).order_by(AuditEvent.sequence).all()
    for event in events:
        expected = hashlib.sha256((previous or "").encode() + _canonical_audit(event)).hexdigest()
        if event.previous_hash != previous or event.current_hash != expected:
            return {"valid": False, "events": len(events), "broken_at": event.sequence}
        previous = event.current_hash
    return {"valid": True, "events": len(events), "broken_at": None}


def _notify(db: Session, org_id, role_code: str, kind: str, severity: str, title: str, body: str, entity_id: str, key: str) -> None:
    users = (
        db.query(User).join(UserRole, UserRole.user_id == User.id).join(Role, Role.id == UserRole.role_id)
        .filter(Role.organization_id == org_id, Role.code == role_code, UserRole.revoked_at.is_(None)).all()
    )
    for user in users:
        exists = db.query(Notification.id).filter_by(user_id=user.id, channel="IN_APP", dedupe_key=key).first()
        if not exists:
            db.add(Notification(organization_id=org_id, user_id=user.id, notification_type=kind, severity=severity, title=title, body=body, entity_type="workflow", entity_id=entity_id, dedupe_key=key))


# --- Carrier events ---

SUPPORTED_DELAY_EVENTS = {"SHIPMENT_DELAYED", "ETA_UPDATED"}


def process_carrier_event(db: Session, org: Organization, payload: Dict[str, Any]) -> Dict[str, Any]:
    source, event_id = payload["carrier"], payload["event_id"]
    if db.query(CarrierEvent.id).filter_by(organization_id=org.id, source=source, event_id=event_id).first():
        return {"status": "DUPLICATE", "event_id": event_id}
    shipment = db.query(Shipment).filter_by(organization_id=org.id, code=payload["shipment_id"]).first()
    if shipment is None:
        raise WorkflowError(404, "UNKNOWN_SHIPMENT", f"Shipment {payload['shipment_id']} doesn't exist.")
    when = aware(payload["event_timestamp"])
    event = CarrierEvent(
        organization_id=org.id, source=source, event_id=event_id, event_type=payload["event_type"], event_timestamp=when, shipment_id=shipment.id,
        payload=json.loads(json.dumps(payload, default=str)),
    )
    db.add(event)
    db.flush()
    newest = db.query(func.max(CarrierEvent.event_timestamp)).filter(CarrierEvent.shipment_id == shipment.id, CarrierEvent.id != event.id, CarrierEvent.processing_status == "PROCESSED").scalar()
    if newest is not None and aware(newest) > when:
        # Kept as history, but an older event can't overwrite newer state (PRD 6.44).
        event.processing_status = "OUT_OF_ORDER"
        event.processed_at = utcnow()
        db.commit()
        return {"status": "OUT_OF_ORDER", "event_id": event_id}

    audit(db, org.id, None, "CARRIER_EVENT_RECEIVED", "shipment", shipment.code, {"event_id": event_id, "type": event.event_type})
    disruption = None
    if event.event_type in SUPPORTED_DELAY_EVENTS:
        hours = float(payload.get("estimated_delay_hours") or 0)
        shipment.status = "DELAYED"
        shipment.current_eta = aware(shipment.expected_arrival_at) + datetime.timedelta(hours=hours)
        disruption = assess_shipment_delay(db, org, shipment, hours, payload.get("reason") or "Carrier reported delay")
    elif event.event_type == "SHIPMENT_ARRIVED":
        shipment.status = "AT_DESTINATION"
        shipment.physical_arrival_at = when
        _record_outcomes(db, org, shipment, when)
    elif event.event_type == "SHIPMENT_CANCELLED":
        shipment.status = "CANCELLED"
    elif event.event_type == "SHIPMENT_EXCEPTION":
        shipment.status = "EXCEPTION"
    elif event.event_type in ("SHIPMENT_DISPATCHED", "SHIPMENT_IN_TRANSIT"):
        shipment.status = "IN_TRANSIT"
    event.processing_status = "PROCESSED"
    event.processed_at = utcnow()
    db.commit()
    return {"status": "PROCESSED", "event_id": event_id, "disruption": disruption.code if disruption else None}


def _inbound_lines(db: Session, shipment: Shipment) -> List[Dict[str, Any]]:
    rows = (
        db.query(FulfilmentAllocation, OrderItem, CustomerOrder)
        .join(ShipmentItem, FulfilmentAllocation.shipment_item_id == ShipmentItem.id)
        .join(OrderItem, FulfilmentAllocation.order_item_id == OrderItem.id)
        .join(CustomerOrder, OrderItem.order_id == CustomerOrder.id)
        .filter(ShipmentItem.shipment_id == shipment.id, FulfilmentAllocation.status == "ACTIVE", CustomerOrder.status.notin_(("CANCELLED", "CLOSED", "FULFILLED")))
        .all()
    )
    return [{"allocation": a, "line": l, "order": o} for a, l, o in rows]


def assess_shipment_delay(db: Session, org: Organization, shipment: Shipment, delay_hours: float, reason: str) -> Disruption:
    now = utcnow()
    key = f"shipment:{shipment.id}"
    disruption = db.query(Disruption).filter_by(organization_id=org.id, consolidation_key=key).first()
    if disruption is None:
        disruption = Disruption(
            id=uuid.uuid4(), organization_id=org.id, code=shipment.code, disruption_type="LATE_SHIPMENT", severity="LOW", status="DETECTED",
            affected_entity_type="shipment", affected_entity_id=shipment.id, consolidation_key=key, evidence={},
        )
        db.add(disruption)
        db.flush()
        audit(db, org.id, None, "DISRUPTION_DETECTED", "disruption", disruption.code, {"reason": reason})
    disruption.evidence = {"reason": reason, "delay_hours": delay_hours}
    number = (db.query(func.max(ImpactAssessment.assessment_number)).filter_by(disruption_id=disruption.id).scalar() or 0) + 1
    assessment = ImpactAssessment(id=uuid.uuid4(), organization_id=org.id, disruption_id=disruption.id, assessment_number=number, assessed_at=now, evidence={"delay_hours": delay_hours})
    db.add(assessment)
    db.flush()

    affected = []
    eta = aware(shipment.current_eta)
    for entry in _inbound_lines(db, shipment):
        order, line, allocation = entry["order"], entry["line"], entry["allocation"]
        lateness = (eta - aware(order.required_delivery_date)).total_seconds() / 3600
        # A delay only counts when the new arrival really misses this order's date (PRD 6.55).
        if lateness <= 0:
            continue
        db.add(ImpactAssessmentLine(organization_id=org.id, assessment_id=assessment.id, order_item_id=line.id, shortage_quantity=allocation.quantity, expected_delay_hours=lateness))
        scored = score_line(db, org, line, order, shipment, float(allocation.quantity), lateness, disruption)
        affected.append((order, scored))
    db.flush()
    total = sum(float(i.shortage_quantity) for i in db.query(ImpactAssessmentLine).filter_by(assessment_id=assessment.id))
    assessment.total_shortage_quantity = total
    assessment.expected_delay_hours = delay_hours
    worst = max((s["risk_score"] for _, s in affected), default=0)
    disruption.severity = "CRITICAL" if worst >= 75 else "HIGH" if worst >= 50 else "MODERATE" if worst >= 25 else "LOW"
    disruption.status = "RECOVERY_REQUIRED" if affected else "IMPACT_ASSESSED"
    audit(db, org.id, None, "IMPACT_ASSESSED", "disruption", disruption.code, {"affected_orders": len(affected), "shortage": total})
    _notify(db, org.id, "OPERATIONS_ANALYST", "NEW_DISRUPTION", disruption.severity, f"{shipment.code} delayed {int(delay_hours)}h", f"{len(affected)} customer orders affected: {reason}", disruption.code, f"disruption:{disruption.code}:{number}")
    return disruption


def score_line(db: Session, org: Organization, line: OrderItem, order: CustomerOrder, shipment: Shipment, shortage: float, lateness_hours: float, disruption: Optional[Disruption]) -> Dict[str, Any]:
    now = utcnow()
    item = {
        "supplier_id": db.get(Supplier, shipment.supplier_id).code, "carrier_id": db.get(Carrier, shipment.carrier_id).code, "snapshot_at": now,
        "hours_to_deadline": (aware(order.required_delivery_date) - now).total_seconds() / 3600, "required_qty": float(line.required_quantity),
        "shortage_qty": shortage, "reported_delay_hours": lateness_hours, "priority_tier": order.priority_tier,
        "route_risk": None, "weather_severity": None, "customs_hours": None,
    }
    scored = risk_service.score_exposure(db, org.slug, item)
    db.add(RiskAssessment(
        organization_id=org.id, order_item_id=line.id, disruption_id=disruption.id if disruption else None, method=scored["method"],
        score=min(100.0, scored["risk_score"]), category=scored["risk_category"], miss_probability=scored["miss_probability"], priority_weight=scored["priority_weight"],
        components=scored["formula_breakdown"], factor_effects=scored["factor_effects"], source_records={"data_sources": scored["data_sources"], "shipment": shipment.code},
        policy_version=scored["formula_policy_version"], model_version=scored["model_version"], calculated_at=now,
    ))
    # Keep the moment of decision, so the real outcome can train the next model.
    risk_service.ingest_exposures(db, org.slug, [{**item, "exposure_id": f"{line.id}"}], data_source="operational")
    return scored


def _record_outcomes(db: Session, org: Organization, shipment: Shipment, arrived_at: datetime.datetime) -> None:
    for entry in _inbound_lines(db, shipment):
        record = db.query(RiskExposure).filter_by(organization_id=org.slug, exposure_id=str(entry["line"].id)).first()
        if record is None or record.missed_deadline is not None:
            continue
        missed = arrived_at > aware(entry["order"].required_delivery_date)
        risk_service.record_outcome(db, org.slug, record.exposure_id, missed, max(aware(arrived_at), aware(record.snapshot_at)))
    audit(db, org.id, None, "OUTCOMES_RECORDED", "shipment", shipment.code)


# --- Recovery suggestions ---

TRANSFER_HOURS = 24.0
TRANSFER_UNIT_COST = 2.0
EXPEDITE_DELAY_SAVED = 0.6
EXPEDITE_UNIT_COST = 6.0


def affected_lines(db: Session, disruption: Disruption) -> List[Dict[str, Any]]:
    assessment = db.query(ImpactAssessment).filter_by(disruption_id=disruption.id).order_by(ImpactAssessment.assessment_number.desc()).first()
    if assessment is None:
        return []
    out = []
    for impact in db.query(ImpactAssessmentLine).filter_by(assessment_id=assessment.id).all():
        line = db.get(OrderItem, impact.order_item_id)
        order = db.get(CustomerOrder, line.order_id)
        risk = db.query(RiskAssessment).filter_by(order_item_id=line.id).order_by(RiskAssessment.calculated_at.desc()).first()
        out.append({"impact": impact, "line": line, "order": order, "risk": risk, "product": db.get(Product, line.product_id)})
    # Limited stock goes to the highest risk first: this is where ML shapes the recovery.
    return sorted(out, key=lambda e: (-(e["risk"].score if e["risk"] else 0), aware(e["order"].required_delivery_date), e["order"].code))


def _transfer_plan(db: Session, lines, destination: Warehouse) -> Dict[str, Any]:
    actions, notes = [], []
    used: Dict[Any, float] = {}
    now = utcnow()
    for e in lines:
        need = float(e["impact"].shortage_quantity)
        hours = (aware(e["order"].required_delivery_date) - now).total_seconds() / 3600
        if hours < TRANSFER_HOURS:
            notes.append(f"{e['order'].code}: a transfer takes {int(TRANSFER_HOURS)}h, and its deadline is sooner.")
            continue
        stocks = db.query(Inventory).filter(Inventory.organization_id == e["order"].organization_id, Inventory.product_id == e["line"].product_id, Inventory.warehouse_id != destination.id).all()
        for stock in sorted(stocks, key=lambda s: -float(s.available_quantity or 0)):
            free = float(stock.available_quantity or 0) - used.get(stock.id, 0.0)
            warehouse = db.get(Warehouse, stock.warehouse_id)
            if free <= 0:
                notes.append(f"{warehouse.code}: {float(stock.on_hand_quantity):.0f} on hand, but none is free once reservations and safety stock are excluded.")
                continue
            quantity = min(free, need)
            used[stock.id] = used.get(stock.id, 0.0) + quantity
            need -= quantity
            actions.append({
                "type": "STOCK_TRANSFER", "order": e["order"].code, "quantity": quantity, "cost": round(quantity * TRANSFER_UNIT_COST, 2), "lead": "1 day",
                "title": f"Transfer {quantity:.0f} units for {e['order'].code}", "source": warehouse.code, "destination": destination.code,
                "description": f"Move unreserved {e['product'].name} from {warehouse.name}.", "inventory_id": str(stock.id), "product_id": str(e["line"].product_id), "warehouse_to": str(destination.id),
            })
            if need <= 0:
                break
        if need > 0:
            notes.append(f"{e['order'].code}: {need:.0f} units can't be covered by free stock.")
    return {"actions": actions, "notes": notes}


def _supplier_plan(db: Session, lines, shipment: Shipment, org_slug: str) -> Dict[str, Any]:
    actions, notes = [], []
    booked: Dict[Any, float] = {}
    now = utcnow()
    for e in lines:
        need = float(e["impact"].shortage_quantity)
        hours = (aware(e["order"].required_delivery_date) - now).total_seconds() / 3600
        options = db.query(SupplierProduct).filter(SupplierProduct.product_id == e["line"].product_id, SupplierProduct.supplier_id != shipment.supplier_id).all()
        chosen = None
        for option in sorted(options, key=lambda o: o.lead_time_days):
            supplier = db.get(Supplier, option.supplier_id)
            quantity = max(need, float(option.minimum_order_quantity))
            # Capacity is shared across this plan's orders, so one supplier can't be promised twice.
            remaining = None if option.production_capacity is None else float(option.production_capacity) - booked.get(option.id, 0.0)
            if option.lead_time_days * 24 > hours:
                notes.append(f"{supplier.name}: {option.lead_time_days}-day lead time misses {e['order'].code}.")
            elif remaining is not None and remaining < quantity:
                notes.append(f"{supplier.name}: only {max(remaining, 0):.0f} units of capacity left for {e['order'].code}.")
            else:
                chosen = (option, supplier, quantity)
                break
        if not options:
            notes.append(f"No alternative supplier exists for {e['product'].name}.")
        if chosen is None:
            continue
        option, supplier, quantity = chosen
        booked[option.id] = booked.get(option.id, 0.0) + quantity
        reliability = supplier_reliability(db, org_slug, supplier.code)
        rate = f"{reliability['on_time_rate']:.0%} on time" if reliability["on_time_rate"] is not None else "no track record yet"
        actions.append({
            "type": "ALTERNATIVE_SUPPLIER", "order": e["order"].code, "quantity": quantity, "cost": round(quantity * float(option.unit_cost or 0), 2), "lead": f"{option.lead_time_days} days",
            "title": f"Buy {quantity:.0f} units from {supplier.name}", "source": supplier.name, "destination": e["order"].delivery_destination or "Customer",
            "description": f"{supplier.name} ({rate}) for {e['order'].code}.", "supplier_code": supplier.code,
        })
    return {"actions": actions, "notes": notes}


def _expedite_plan(db: Session, lines, shipment: Shipment) -> Dict[str, Any]:
    actions, notes = [], []
    now = utcnow()
    saved = (aware(shipment.current_eta) - aware(shipment.expected_arrival_at)).total_seconds() / 3600 * EXPEDITE_DELAY_SAVED
    new_eta = aware(shipment.current_eta) - datetime.timedelta(hours=saved)
    carrier = db.query(Carrier).filter(Carrier.organization_id == shipment.organization_id, Carrier.id != shipment.carrier_id).order_by(Carrier.capacity.desc()).first()
    for e in lines:
        quantity = float(e["impact"].shortage_quantity)
        if new_eta > aware(e["order"].required_delivery_date):
            notes.append(f"{e['order'].code}: expediting saves {saved:.0f}h, which still misses its date.")
            continue
        if carrier is None or (carrier.capacity is not None and float(carrier.capacity) < quantity):
            notes.append(f"{e['order'].code}: no other carrier has the capacity.")
            continue
        actions.append({
            "type": "SHIPMENT_REROUTE", "order": e["order"].code, "quantity": quantity, "cost": round(quantity * EXPEDITE_UNIT_COST, 2), "lead": f"saves {saved:.0f}h",
            "title": f"Reroute {quantity:.0f} units for {e['order'].code}", "source": shipment.origin or shipment.code, "destination": carrier.name,
            "description": f"Move onto {carrier.name}, saving about {saved:.0f} hours.",
        })
    return {"actions": actions, "notes": notes}


def build_candidates(db: Session, org: Organization, disruption: Disruption) -> List[Dict[str, Any]]:
    if disruption.affected_entity_type != "shipment":
        return []
    shipment = db.get(Shipment, disruption.affected_entity_id)
    lines = affected_lines(db, disruption)
    if not lines:
        return []
    destination = db.get(Warehouse, shipment.destination_warehouse_id)
    total_units = sum(float(e["impact"].shortage_quantity) for e in lines)
    built = [
        ("transfer", "Reallocate free stock", "Move unreserved stock from other warehouses to the highest-risk orders first.", _transfer_plan(db, lines, destination)),
        ("supplier", "Buy from an alternative supplier", "Use suppliers whose lead time and capacity meet the deadline.", _supplier_plan(db, lines, shipment, org.slug)),
        ("reroute", "Reroute with another carrier", "Move the delayed goods onto a faster carrier where that meets the deadline.", _expedite_plan(db, lines, shipment)),
    ]
    candidates = []
    for name, title, strategy, result in built:
        protected_orders = {a["order"] for a in result["actions"]}
        protected_units = sum(float(e["impact"].shortage_quantity) for e in lines if e["order"].code in protected_orders)
        covered = sum(a["quantity"] for a in result["actions"])
        coverage = min(protected_units, covered) / total_units if total_units else 0
        candidates.append({
            "key": f"RP-{disruption.code}-{name}"[:31], "title": title, "strategy": strategy, "actions": result["actions"], "notes": result["notes"],
            "cost": round(sum(a["cost"] for a in result["actions"]), 2), "coverage": coverage, "feasible": bool(result["actions"]),
            "orders_protected": len(protected_orders), "orders_total": len(lines), "disruption": disruption.code,
        })
    candidates.sort(key=lambda c: (-c["coverage"], c["cost"]))
    for rank, candidate in enumerate(candidates):
        candidate["label"] = "Optimal Recommendation" if rank == 0 and candidate["feasible"] else "Alternative"
    return candidates


def supplier_reliability(db: Session, org_slug: str, code: str) -> Dict[str, Any]:
    """Calculated only from recorded outcomes. No history means no score (PRD 6.23)."""
    resolved, missed = db.query(func.count(RiskExposure.id), func.coalesce(func.sum(RiskExposure.missed_deadline), 0)).filter(
        RiskExposure.organization_id == org_slug, RiskExposure.supplier_id == code, RiskExposure.missed_deadline.isnot(None)
    ).one()
    if not resolved or resolved < 10:
        return {"code": code, "outcomes": int(resolved or 0), "on_time_rate": None}
    return {"code": code, "outcomes": int(resolved), "on_time_rate": 1 - float(missed) / int(resolved)}


# --- Plans ---

def _plan_hash_payload(org: Organization, plan: RecoveryPlan, actions: List[Dict[str, Any]], disruption_code: str) -> Dict[str, Any]:
    return {
        "organization_id": org.slug, "plan_id": plan.plan_key, "version": plan.version, "disruption_id": disruption_code,
        "recovery_actions": [
            {"action_type": a["type"], "source_warehouse": a.get("source"), "destination_warehouse": a.get("destination"), "quantity": a.get("quantity", 0), "estimated_cost": a.get("cost", 0), "currency": "USD"}
            for a in actions
        ],
        "estimated_total_cost": sum(a.get("cost", 0) for a in actions), "currency": "USD",
    }


def compute_plan_hash(db: Session, org: Organization, plan: RecoveryPlan) -> str:
    actions = [a.parameters for a in db.query(RecoveryPlanAction).filter_by(plan_id=plan.id).order_by(RecoveryPlanAction.sequence)]
    disruption = db.get(Disruption, plan.disruption_id)
    return RecoveryPlanHashService.generate_plan_hash(_plan_hash_payload(org, plan, actions, disruption.code))[1]


def _latest_plan(db: Session, org_id, key: str) -> Optional[RecoveryPlan]:
    return db.query(RecoveryPlan).filter_by(organization_id=org_id, plan_key=key).order_by(RecoveryPlan.version.desc()).first()


def _chain_tx(db: Session, org_id, action: str, entity: str, send) -> Dict[str, Any]:
    """Returns the status to store. A failed or disabled chain never blocks the operational record."""
    if not chain.enabled():
        return {"chain_status": "CHAIN_PENDING", "tx_hash": None, "error": "Chain signing isn't configured."}
    try:
        return {"chain_status": "CHAIN_PENDING", "tx_hash": send(), "error": None}
    except Exception as exc:
        audit(db, org_id, None, "CHAIN_SEND_FAILED", "plan", entity, {"action": action, "error": str(exc)[:300]})
        return {"chain_status": "CHAIN_FAILED", "tx_hash": None, "error": str(exc)[:300]}


def submit_plan(db: Session, org: Organization, user: User, key: str) -> RecoveryPlan:
    latest = _latest_plan(db, org.id, key)
    if latest is not None and latest.status not in ("REVISION_REQUIRED",):
        raise WorkflowError(409, "ALREADY_SUBMITTED", f"{key} is already {latest.status}.")
    candidate = None
    for disruption in db.query(Disruption).filter_by(organization_id=org.id).all():
        candidate = next((c for c in build_candidates(db, org, disruption) if c["key"] == key), None)
        if candidate:
            break
    if candidate is None:
        raise WorkflowError(409, "STALE_RECOMMENDATION", "This recommendation no longer applies. Refresh and choose again.")
    if not candidate["feasible"]:
        raise WorkflowError(422, "INFEASIBLE_PLAN", "This plan can't be submitted: " + "; ".join(candidate["notes"][:2]))
    disruption = db.query(Disruption).filter_by(organization_id=org.id, code=candidate["disruption"]).first()
    plan = RecoveryPlan(
        id=uuid.uuid4(), organization_id=org.id, plan_key=key, version=(latest.version + 1) if latest else 1, supersedes_id=latest.id if latest else None,
        disruption_id=disruption.id, creator_id=user.id, status="UNDER_REVIEW", title=candidate["title"], estimated_cost=candidate["cost"],
        feasibility_result={"coverage": candidate["coverage"], "notes": candidate["notes"], "orders_protected": candidate["orders_protected"], "orders_total": candidate["orders_total"], "strategy": candidate["strategy"]},
        approval_requirements={"stages": ["SUPPLY_CHAIN_MANAGER"]}, submitted_at=utcnow(),
    )
    db.add(plan)
    db.flush()
    for index, action in enumerate(candidate["actions"], start=1):
        db.add(RecoveryPlanAction(organization_id=org.id, plan_id=plan.id, sequence=index, action_type=action["type"], parameters=action, estimated_cost=action["cost"]))
    db.flush()
    plan.plan_hash = compute_plan_hash(db, org, plan)
    simulation_hash = "0x" + hashlib.sha256(plan.plan_hash.encode()).hexdigest()
    sent = _chain_tx(db, org.id, "anchor", key, lambda: chain.anchor_plan(key, plan.version, plan.plan_hash, simulation_hash))
    plan.expected_outcome = {"anchor": sent}
    audit(db, org.id, user.id, "PLAN_SUBMITTED", "plan", key, {"hash": plan.plan_hash, "tx": sent["tx_hash"], "chain_status": sent["chain_status"]}, plan.version)
    _notify(db, org.id, "SUPPLY_CHAIN_MANAGER", "APPROVAL_REQUIRED", "HIGH", f"Approval needed: {plan.title}", f"{key} version {plan.version}, estimated ${float(plan.estimated_cost):,.0f}.", key, f"approve:{key}:{plan.version}")
    db.commit()
    return plan


def _plan_for_decision(db: Session, org: Organization, user: User, key: str) -> RecoveryPlan:
    plan = _latest_plan(db, org.id, key)
    if plan is None:
        raise WorkflowError(404, "PLAN_NOT_FOUND", f"{key} doesn't exist.")
    if plan.creator_id == user.id:
        audit(db, org.id, user.id, "SELF_APPROVAL_REJECTED", "plan", key, plan_version=plan.version)
        db.commit()
        raise WorkflowError(403, "CREATOR_CANNOT_DECIDE", "You created this plan, so someone else must decide on it.")
    if plan.status != "UNDER_REVIEW":
        raise WorkflowError(409, "PLAN_NOT_UNDER_REVIEW", f"{key} is {plan.status}, so it can't be decided now.")
    return plan


def decide_plan(db: Session, org: Organization, user: User, key: str, decision: str, comments: Optional[str]) -> RecoveryPlan:
    plan = _plan_for_decision(db, org, user, key)
    sent: Dict[str, Any] = {"chain_status": "NOT_REQUIRED", "tx_hash": None}
    if decision == "APPROVED":
        plan.status = "APPROVED"
        sent = _chain_tx(db, org.id, "approve", key, lambda: chain.approve_plan(key, plan.version))
    elif decision == "REJECTED":
        plan.status = "REJECTED"
        reason_hash = "0x" + hashlib.sha256((comments or "rejected").encode()).hexdigest()
        sent = _chain_tx(db, org.id, "reject", key, lambda: chain.reject_plan(key, plan.version, reason_hash))
    else:
        plan.status = "REVISION_REQUIRED"
    db.add(Approval(
        organization_id=org.id, plan_id=plan.id, plan_creator_id=plan.creator_id, approver_id=user.id, stage=1, action_category="RECOVERY_PLAN", decision=decision,
        comments=comments, chain_status=sent["chain_status"], tx_hash=sent["tx_hash"], idempotency_key=f"{plan.id}:{user.id}:1", decided_at=utcnow(),
    ))
    audit(db, org.id, user.id, f"PLAN_{decision}", "plan", key, {"comments": comments, "tx": sent["tx_hash"], "chain_status": sent["chain_status"]}, plan.version)
    _notify(db, org.id, "OPERATIONS_ANALYST", f"PLAN_{decision}", "MODERATE", f"{key}: {decision.replace('_', ' ').lower()}", comments or "", key, f"decision:{key}:{plan.version}:{decision}")
    db.commit()
    return plan


def confirm_execution(db: Session, org: Organization, user: User, key: str) -> ExecutionRun:
    plan = _latest_plan(db, org.id, key)
    if plan is None:
        raise WorkflowError(404, "PLAN_NOT_FOUND", f"{key} doesn't exist.")
    if plan.status != "APPROVED":
        raise WorkflowError(409, "NOT_APPROVED", "Execution needs a completed approval first.")
    approval = db.query(Approval).filter_by(plan_id=plan.id, decision="APPROVED").first()
    if approval is None:
        raise WorkflowError(409, "NOT_APPROVED", "Execution needs a completed approval first.")
    if chain.enabled():
        reconcile_chain(db, org)
        if approval.chain_status != "CHAIN_CONFIRMED":
            raise WorkflowError(409, "CHAIN_NOT_CONFIRMED", "The approval isn't confirmed on-chain yet. Try again shortly.")
    # Stock may have moved since the plan was made (PRD 14.12).
    for action in db.query(RecoveryPlanAction).filter_by(plan_id=plan.id, action_type="STOCK_TRANSFER"):
        stock = db.get(Inventory, uuid.UUID(action.parameters["inventory_id"]))
        if float(stock.available_quantity or 0) < action.parameters["quantity"]:
            plan.status = "INVALIDATED"
            audit(db, org.id, user.id, "PLAN_INVALIDATED", "plan", key, {"reason": "stock changed"}, plan.version)
            db.commit()
            raise WorkflowError(409, "STALE_PLAN", "Stock has changed since approval, so this plan needs to be redone.")

    request_id = f"{plan.id}:execute"
    run = db.query(ExecutionRun).filter_by(organization_id=org.id, execution_request_id=request_id).first()
    if run is not None:
        return run
    run = ExecutionRun(id=uuid.uuid4(), organization_id=org.id, plan_id=plan.id, execution_request_id=request_id, confirmed_by=user.id, status="EXECUTING", started_at=utcnow())
    db.add(run)
    db.flush()
    audit(db, org.id, user.id, "EXECUTION_CONFIRMED", "plan", key, plan_version=plan.version)
    results = []
    for action in db.query(RecoveryPlanAction).filter_by(plan_id=plan.id).order_by(RecoveryPlanAction.sequence):
        record = ExecutionAction(organization_id=org.id, run_id=run.id, plan_action_id=action.id, status="RUNNING", idempotency_key=f"{run.id}:{action.id}", attempts=1, started_at=utcnow())
        db.add(record)
        db.flush()
        if action.action_type == "STOCK_TRANSFER":
            _simulate_transfer(db, org, user, action.parameters)
        record.status = "SUCCEEDED"
        record.finished_at = utcnow()
        record.result = {"simulated": True, "summary": action.parameters["title"]}
        results.append(record.result)
    run.status = "COMPLETED"
    run.finished_at = utcnow()
    plan.status = "COMPLETED"
    disruption = db.get(Disruption, plan.disruption_id)
    disruption.status = "RESOLVED"
    _mitigate_orders(db, org, disruption, plan)
    evidence = "0x" + hashlib.sha256(jcs.canonicalize({"plan": key, "version": plan.version, "results": results})).hexdigest()
    sent = _chain_tx(db, org.id, "evidence", key, lambda: chain.anchor_execution(key, plan.version, evidence))
    audit(db, org.id, user.id, "EXECUTION_COMPLETED", "plan", key, {"evidence_hash": evidence, "tx": sent["tx_hash"], "chain_status": sent["chain_status"], "simulated": True}, plan.version)
    _notify(db, org.id, "OPERATIONS_ANALYST", "EXECUTION_COMPLETED", "INFO", f"{key}: recovery completed", "Actions were simulated and recorded.", key, f"executed:{key}:{plan.version}")
    db.commit()
    return run


def _simulate_transfer(db: Session, org: Organization, user: User, params: Dict[str, Any]) -> None:
    source = db.get(Inventory, uuid.UUID(params["inventory_id"]))
    quantity = params["quantity"]
    source.on_hand_quantity = float(source.on_hand_quantity) - quantity
    db.add(InventoryAdjustment(organization_id=org.id, inventory_id=source.id, adjustment_type="TRANSFER_OUT", quantity_delta=-quantity, actor_id=user.id, reason=params["title"], reference_type="recovery_plan"))
    destination = db.query(Inventory).filter_by(warehouse_id=uuid.UUID(params["warehouse_to"]), product_id=uuid.UUID(params["product_id"])).first()
    if destination is not None:
        destination.on_hand_quantity = float(destination.on_hand_quantity) + quantity
        destination.reserved_quantity = float(destination.reserved_quantity) + quantity
        db.add(InventoryAdjustment(organization_id=org.id, inventory_id=destination.id, adjustment_type="TRANSFER_IN", quantity_delta=quantity, actor_id=user.id, reason=params["title"], reference_type="recovery_plan"))
    db.flush()


def _mitigate_orders(db: Session, org: Organization, disruption: Disruption, plan: RecoveryPlan) -> None:
    protected = {a.parameters["order"] for a in db.query(RecoveryPlanAction).filter_by(plan_id=plan.id)}
    shipment = db.get(Shipment, disruption.affected_entity_id)
    for e in affected_lines(db, disruption):
        if e["order"].code in protected:
            score_line(db, org, e["line"], e["order"], shipment, 0.0, 0.0, disruption)


def reconcile_chain(db: Session, org: Organization) -> None:
    """Moves pending transactions to confirmed or failed, using receipts only."""
    if not chain.enabled():
        return
    for approval in db.query(Approval).filter_by(organization_id=org.id, chain_status="CHAIN_PENDING").all():
        if not approval.tx_hash:
            continue
        status = chain.receipt_status(approval.tx_hash)
        if status == 1:
            approval.chain_status = "CHAIN_CONFIRMED"
        elif status == 0:
            approval.chain_status = "CHAIN_FAILED"
    db.commit()


def verify_plan(db: Session, org: Organization, key: str) -> Dict[str, Any]:
    plan = _latest_plan(db, org.id, key)
    if plan is None:
        raise WorkflowError(404, "PLAN_NOT_FOUND", f"{key} doesn't exist.")
    current = compute_plan_hash(db, org, plan)
    local_match = current == plan.plan_hash
    chain_match = chain.on_chain_hash_matches(key, plan.version, current) if chain.enabled() else None
    if not local_match or chain_match is False:
        result = "HASH_MISMATCH"
    elif chain_match:
        result = "VERIFIED"
    else:
        result = "NOT_ANCHORED"
    return {"plan_id": key, "version": plan.version, "result": result, "computed_hash": current, "stored_hash": plan.plan_hash, "on_chain_match": chain_match}
