"""Disruption-to-recovery workflow. ML advises, rules decide what's feasible, people decide what happens."""
import datetime
import hashlib
import json
import uuid
from typing import Any, Dict, List, Optional
import logging
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
from ..recommendations import ai
from ..recommendations import engine as recommendations
from ..recommendations.engine import supplier_reliability  # noqa: F401  (used by routes)
from ..risk.models import RiskExposure
from . import chain


logger = logging.getLogger(__name__)


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
    # Saved on its own first, so a failure below can't lose the event (PRD 6.46).
    db.commit()
    event_pk = event.id
    try:
        return _apply_carrier_event(db, org, shipment, event, payload, event_id, when)
    except Exception as exc:
        db.rollback()
        failed = db.get(CarrierEvent, event_pk)
        failed.processing_status = "FAILED"
        failed.processing_error = f"{type(exc).__name__}: {str(exc)[:300]}"
        failed.retry_count += 1
        db.commit()
        logger.exception("Carrier event %s failed", event_id)
        return {"status": "FAILED", "event_id": event_id, "retryable": True}


def _apply_carrier_event(db: Session, org: Organization, shipment: Shipment, event: CarrierEvent, payload: Dict[str, Any], event_id: str, when: datetime.datetime) -> Dict[str, Any]:
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
        "route_risk": shipment.route_risk, "weather_severity": shipment.weather_severity, "customs_hours": shipment.customs_hours,
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


def build_candidates(db: Session, org: Organization, disruption: Disruption) -> List[Dict[str, Any]]:
    if disruption.affected_entity_type != "shipment":
        return []
    lines = affected_lines(db, disruption)
    return recommendations.generate(db, org, disruption, lines) if lines else []


def explain_recovery(db: Session, org: Organization, disruption_code: str) -> Dict[str, Any]:
    """AI advice about the checked options. Any AI failure returns "unavailable" and changes nothing else."""
    disruption = db.query(Disruption).filter_by(organization_id=org.id, code=disruption_code).first()
    if disruption is None:
        raise WorkflowError(404, "DISRUPTION_NOT_FOUND", f"Disruption {disruption_code} doesn't exist.")
    lines = affected_lines(db, disruption) if disruption.affected_entity_type == "shipment" else []
    return ai.explain_options(db, org, disruption, lines, build_candidates(db, org, disruption), audit=audit)


# --- Plans ---

def _plan_hash_payload(org: Organization, plan: RecoveryPlan, actions: List[Dict[str, Any]], disruption_code: str) -> Dict[str, Any]:
    return {
        "organization_id": org.slug, "plan_id": plan.plan_key, "version": plan.version, "disruption_id": disruption_code,
        "recovery_actions": [
            {"action_type": a["type"], "source_warehouse": a.get("source"), "destination_warehouse": a.get("destination"), "quantity": a.get("quantity", 0), "estimated_cost": a.get("cost", 0), "currency": "USD"}
            for a in actions
        ],
        "estimated_total_cost": sum(a.get("cost", 0) for a in actions), "currency": "USD",
        # The contract rejects a reused hash, so a reseeded demo must not reproduce an earlier one.
        "policy_snapshot": {"chain_run": str((org.settings or {}).get("chain_run", ""))},
    }


def _chain_plan_id(org: Organization, key: str) -> str:
    """The chain outlives a demo reset, so each seeded run needs its own on-chain plan ids."""
    run = (org.settings or {}).get("chain_run", "")
    return f"{key[:24]}-{run}" if run else key


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
    sent = _chain_tx(db, org.id, "anchor", key, lambda: chain.anchor_plan(_chain_plan_id(org, key), plan.version, plan.plan_hash, simulation_hash))
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
        sent = _chain_tx(db, org.id, "approve", key, lambda: chain.approve_plan(_chain_plan_id(org, key), plan.version))
    elif decision == "REJECTED":
        plan.status = "REJECTED"
        reason_hash = "0x" + hashlib.sha256((comments or "rejected").encode()).hexdigest()
        sent = _chain_tx(db, org.id, "reject", key, lambda: chain.reject_plan(_chain_plan_id(org, key), plan.version, reason_hash))
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
    # What runs must be exactly what was approved.
    if compute_plan_hash(db, org, plan) != plan.plan_hash:
        audit(db, org.id, user.id, "PLAN_TAMPER_DETECTED", "plan", key, plan_version=plan.version)
        db.commit()
        raise WorkflowError(409, "PLAN_CHANGED", "This plan changed after approval, so it can't run.")
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
    evidence = "0x" + hashlib.sha256(jcs.canonicalize({"plan": _chain_plan_id(org, key), "version": plan.version, "results": results})).hexdigest()
    sent = _chain_tx(db, org.id, "evidence", key, lambda: chain.anchor_execution(_chain_plan_id(org, key), plan.version, evidence))
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
    covered: Dict[str, float] = {}
    fully_covered = set()
    for action in db.query(RecoveryPlanAction).filter_by(plan_id=plan.id):
        for code in action.parameters["orders"]:
            if action.action_type == "SHIPMENT_REROUTE":
                fully_covered.add(code)
            else:
                covered[code] = covered.get(code, 0.0) + action.parameters["quantity"]
    shipment = db.get(Shipment, disruption.affected_entity_id)
    remaining_shortage = False
    for e in affected_lines(db, disruption):
        code = e["order"].code
        short = float(e["impact"].shortage_quantity)
        left = 0.0 if code in fully_covered else max(short - covered.get(code, 0.0), 0.0)
        if code in fully_covered or code in covered:
            # A partly covered order keeps its remaining shortage and delay, so it stays at risk.
            score_line(db, org, e["line"], e["order"], shipment, left, float(e["impact"].expected_delay_hours) if left > 0 else 0.0, disruption)
        if left > 0 and code in covered:
            remaining_shortage = True
    disruption.status = "RESOLVING" if remaining_shortage else "RESOLVED"


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
    chain_match = chain.on_chain_hash_matches(_chain_plan_id(org, key), plan.version, current) if chain.enabled() else None
    if not local_match or chain_match is False:
        result = "HASH_MISMATCH"
    elif chain_match:
        result = "VERIFIED"
    else:
        result = "NOT_ANCHORED"
    return {"plan_id": key, "version": plan.version, "result": result, "computed_hash": current, "stored_hash": plan.plan_hash, "on_chain_match": chain_match}
