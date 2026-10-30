"""Shapes API data to match the app's existing TypeScript types, so screens keep working unchanged."""
import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from ..models.base import utcnow
from ..models.governance import AuditEvent, Notification
from ..models.identity import Organization, User
from ..models.intelligence import Disruption, ImpactAssessment, ImpactAssessmentLine, RiskAssessment
from ..models.inventory import CustomerOrder, OrderItem
from ..models.recovery import Approval, ExecutionAction, ExecutionRun, RecoveryPlan, RecoveryPlanAction
from ..models.supply_chain import Carrier, Product, Shipment, Supplier
from ..risk import service as risk_service, training
from . import engine
from .engine import aware

SEVERITY = {"CRITICAL": "Critical", "HIGH": "High", "MODERATE": "Medium", "LOW": "Low"}
PLAN_STATUS = {
    "DRAFT": "Draft", "REVISION_REQUIRED": "Draft", "UNDER_REVIEW": "Pending Approval", "APPROVED": "Approved", "REJECTED": "Rejected",
    "EXECUTION_PENDING": "Approved", "EXECUTING": "In Progress", "COMPLETED": "Completed", "INVALIDATED": "Rejected",
}
DISRUPTION_STATUS = {"RESOLVED": "Mitigated", "CLOSED": "Mitigated", "IMPACT_ASSESSED": "Investigating", "RECOVERY_REQUIRED": "Action Required"}
ACTION_TYPE = {"STOCK_TRANSFER": "transfer_stock", "ALTERNATIVE_SUPPLIER": "alternative_supplier", "SHIPMENT_REROUTE": "expedite_shipment"}
AUDIT_TYPE = {
    "DISRUPTION_DETECTED": "disruption_detected", "PLAN_SUBMITTED": "plan_submitted", "PLAN_APPROVED": "plan_approved", "PLAN_REJECTED": "plan_rejected",
    "PLAN_REVISION_REQUIRED": "changes_requested", "EXECUTION_CONFIRMED": "action_started", "EXECUTION_COMPLETED": "milestone_completed",
}
FACTOR_LABELS = {
    "slack_hours": "Too little time left after the delay", "hours_to_deadline": "Deadline is close", "reported_delay_hours": "Length of the reported delay",
    "shortage_ratio": "Share of the order that is short", "priority_tier": "Order priority", "supplier_hist_miss_rate": "Supplier track record",
    "supplier_recent_miss_rate": "Supplier recent misses", "carrier_hist_miss_rate": "Carrier track record", "carrier_recent_miss_rate": "Carrier recent misses",
}


def _date(value: Optional[datetime.datetime]) -> str:
    return aware(value).strftime("%d %b %Y") if value else ""


def _stamp(value: Optional[datetime.datetime]) -> str:
    return aware(value).strftime("%b %d, %Y, %H:%M UTC") if value else ""


def _ago(value: datetime.datetime) -> str:
    minutes = int((utcnow() - aware(value)).total_seconds() // 60)
    if minutes < 1:
        return "Just now"
    if minutes < 60:
        return f"{minutes} min ago"
    return f"{minutes // 60} hours ago" if minutes < 1440 else f"{minutes // 1440} days ago"


def _top_factors(effects: Optional[Dict[str, float]]) -> List[str]:
    if not effects:
        return []
    ranked = sorted(((k, v) for k, v in effects.items() if v > 0), key=lambda kv: -kv[1])
    return [FACTOR_LABELS.get(k, k) for k, _ in ranked[:2]]


def order_view(db: Session, e: Dict[str, Any], disruption: Disruption) -> Dict[str, Any]:
    order, line, risk = e["order"], e["line"], e["risk"]
    mitigated = risk is not None and float(risk.source_records.get("shortage", 1) or 0) == 0 if risk else False
    product = e["product"]
    score = int(round(risk.score)) if risk else 0
    return {
        "id": order.code, "customer": order.customer_reference, "product": product.name, "sku": product.sku, "units": float(line.required_quantity),
        "deliveryCommitment": _date(order.required_delivery_date), "riskScore": score, "severity": SEVERITY[risk.category] if risk else "Low",
        "associatedDisruptionId": disruption.code, "destination": order.delivery_destination or "", "status": "Mitigated" if disruption.status == "RESOLVED" and score < 25 else "At Risk",
        "revenue": float(line.required_quantity) * 240,
        "riskSource": {
            "kind": risk.method if risk else "sample", "modelVersion": risk.model_version if risk else None, "missProbability": risk.miss_probability if risk else None,
            "topFactors": _top_factors(risk.factor_effects) if risk else [], "dataSources": (risk.source_records or {}).get("data_sources", []) if risk else [],
        },
    }


def disruption_view(db: Session, org: Organization, d: Disruption, orders: List[Dict[str, Any]], events: List[AuditEvent]) -> Dict[str, Any]:
    shipment = db.get(Shipment, d.affected_entity_id) if d.affected_entity_type == "shipment" else None
    supplier = db.get(Supplier, shipment.supplier_id) if shipment else None
    carrier = db.get(Carrier, shipment.carrier_id) if shipment else None
    delay = float((d.evidence or {}).get("delay_hours", 0))
    timeline = [
        {"id": str(ev.id), "title": ev.action_type.replace("_", " ").title(), "timestamp": _stamp(ev.occurred_at), "description": str((ev.event_metadata or {}).get("reason") or (ev.event_metadata or {}).get("affected_orders") or ""), "status": "completed"}
        for ev in events if ev.entity_id == d.code
    ]
    return {
        "id": d.code, "type": "shipment_delay", "title": f"Shipment {d.code} delayed", "reference": d.code, "location": f"{shipment.origin} to warehouse" if shipment else "",
        "carrier": carrier.name if carrier else "", "supplier": f"{supplier.name} ({supplier.code})" if supplier else "", "product": orders[0]["product"] if orders else "",
        "reportedTime": _ago(d.detected_at), "estimatedDelay": f"{delay / 24:g} days" if delay >= 24 else f"{delay:g} hours", "affectedOrdersCount": len(orders),
        "severity": SEVERITY[d.severity], "status": DISRUPTION_STATUS.get(d.status, "Investigating"), "originalEta": _stamp(shipment.expected_arrival_at) if shipment else "",
        "revisedEta": _stamp(shipment.current_eta) if shipment else "", "reason": (d.evidence or {}).get("reason", ""), "timeline": timeline, "affectedOrderIds": [o["id"] for o in orders],
    }


def _action_view(index: int, params: Dict[str, Any], status: str) -> Dict[str, Any]:
    return {
        "id": f"act-{index}", "type": ACTION_TYPE.get(params["type"], "transfer_stock"), "title": params["title"], "description": params["description"],
        "sourceOrCarrier": params.get("source", ""), "destination": params.get("destination", ""), "unitsOrScope": f"{params['quantity']:.0f} units",
        "estimatedCost": params["cost"], "leadTime": params["lead"], "status": status,
    }


def _risk_label(coverage: float) -> str:
    return "Low" if coverage >= 0.8 else "Medium" if coverage >= 0.4 else "High"


def candidate_view(c: Dict[str, Any], severity: str) -> Dict[str, Any]:
    return {
        "id": c["key"], "planName": c["title"], "recommendationLabel": c["label"], "strategy": c["strategy"], "relatedDisruptionId": c["disruption"], "estimatedCost": c["cost"],
        "deliveryImpact": f"Protects {c['orders_protected']} of {c['orders_total']} orders", "feasibilityScore": round(c["coverage"] * 100), "risk": _risk_label(c["coverage"]),
        "benefits": [f"Covers {round(c['coverage'] * 100)}% of the short units"], "constraints": c["notes"][:4] or ["All checks passed"], "status": "Simulation Complete",
        "priority": "Critical" if severity == "Critical" else "High", "targetCompletionDate": "", "description": c["strategy"],
        "actions": [_action_view(i, a, "Configured") for i, a in enumerate(c["actions"])],
    }


def plan_view(db: Session, plan: RecoveryPlan, disruption: Disruption, users: Dict[Any, User]) -> Dict[str, Any]:
    actions = db.query(RecoveryPlanAction).filter_by(plan_id=plan.id).order_by(RecoveryPlanAction.sequence).all()
    feasibility = plan.feasibility_result or {}
    approval = db.query(Approval).filter_by(plan_id=plan.id).order_by(Approval.created_at.desc()).first()
    creator = users.get(plan.creator_id)
    approver = users.get(approval.approver_id) if approval else None
    coverage = float(feasibility.get("coverage", 0))
    view = {
        "id": plan.plan_key, "planName": plan.title, "recommendationLabel": "Submitted plan", "strategy": feasibility.get("strategy", ""), "relatedDisruptionId": disruption.code,
        "estimatedCost": float(plan.estimated_cost or 0), "deliveryImpact": f"Protects {feasibility.get('orders_protected', 0)} of {feasibility.get('orders_total', 0)} orders",
        "feasibilityScore": round(coverage * 100), "risk": _risk_label(coverage), "benefits": [f"Covers {round(coverage * 100)}% of the short units"],
        "constraints": feasibility.get("notes", [])[:4] or ["All checks passed"], "status": PLAN_STATUS.get(plan.status, "Draft"), "priority": "High",
        "targetCompletionDate": "", "description": feasibility.get("strategy", ""),
        "actions": [_action_view(i, a.parameters, "Completed" if plan.status == "COMPLETED" else "Configured") for i, a in enumerate(actions)],
        "submittedAt": _stamp(plan.submitted_at), "submittedBy": creator.full_name if creator else "", "assignedApprover": "Supply Chain Manager",
        "version": plan.version, "planHash": plan.plan_hash, "chainStatus": approval.chain_status if approval else (plan.expected_outcome or {}).get("anchor", {}).get("chain_status"),
        "txHash": approval.tx_hash if approval else (plan.expected_outcome or {}).get("anchor", {}).get("tx_hash"),
    }
    if approval and approval.decision == "APPROVED":
        view.update(approvedAt=_stamp(approval.decided_at), approvedBy=approver.full_name if approver else "", approvalNotes=approval.comments or "")
    elif approval and approval.decision == "REJECTED":
        view.update(rejectedAt=_stamp(approval.decided_at), rejectedBy=approver.full_name if approver else "", rejectionReason=approval.comments or "")
    elif approval:
        view.update(changeRequestNotes=approval.comments or "", approvalNotes=approval.comments or "")
    return view


def audit_view(event: AuditEvent, users: Dict[Any, User]) -> Dict[str, Any]:
    meta = event.event_metadata or {}
    actor = users.get(event.actor_id)
    chain_status = meta.get("chain_status")
    return {
        "id": f"EVT-{event.sequence}", "type": AUDIT_TYPE.get(event.action_type, "investigation_started"), "actor": actor.full_name if actor else "System", "role": "User" if actor else "Automated",
        "timestamp": _stamp(event.occurred_at), "relatedEntityId": event.entity_id, "relatedEntityType": "plan" if event.entity_type == "plan" else "disruption" if event.entity_type == "disruption" else "shipment",
        "description": event.action_type.replace("_", " ").capitalize() + (f": {meta['comments']}" if meta.get("comments") else ""),
        # "verified" is only ever set from a confirmed receipt.
        "verificationStatus": "verified" if chain_status == "CHAIN_CONFIRMED" else "pending" if meta.get("tx") or chain_status == "CHAIN_PENDING" else "unverified",
        "txHash": meta.get("tx"),
    }


def bootstrap(db: Session, org: Organization, user: User) -> Dict[str, Any]:
    engine.reconcile_chain(db, org)
    users = {u.id: u for u in db.query(User).filter_by(organization_id=org.id)}
    events = db.query(AuditEvent).filter_by(organization_id=org.id).order_by(AuditEvent.sequence.desc()).limit(100).all()
    orders, disruptions, plans = [], [], []
    for d in db.query(Disruption).filter_by(organization_id=org.id).order_by(Disruption.detected_at.desc()).all():
        views = [order_view(db, e, d) for e in engine.affected_lines(db, d)]
        orders.extend(views)
        disruptions.append(disruption_view(db, org, d, views, events))
        saved = {}
        for p in db.query(RecoveryPlan).filter_by(organization_id=org.id, disruption_id=d.id).order_by(RecoveryPlan.version).all():
            saved[p.plan_key] = p
        plans.extend(plan_view(db, p, d, users) for p in saved.values())
        if d.status != "RESOLVED":
            plans.extend(candidate_view(c, SEVERITY[d.severity]) for c in engine.build_candidates(db, org, d) if c["key"] not in saved or saved[c["key"]].status == "REVISION_REQUIRED")
    notifications = db.query(Notification).filter_by(user_id=user.id).order_by(Notification.created_at.desc()).limit(50).all()
    run = db.query(ExecutionRun).filter_by(organization_id=org.id).order_by(ExecutionRun.created_at.desc()).first()
    execution = None
    if run:
        plan = db.get(RecoveryPlan, run.plan_id)
        steps = db.query(ExecutionAction).filter_by(run_id=run.id).all()
        approval = db.query(Approval).filter_by(plan_id=plan.id, decision="APPROVED").first()
        disruption = db.get(Disruption, plan.disruption_id)
        execution = {
            "planId": plan.plan_key, "planName": plan.title, "disruptionId": disruption.code, "overallProgress": 100 if run.status == "COMPLETED" else 50,
            "status": "Completed" if run.status == "COMPLETED" else "In Progress", "approvedBy": users[approval.approver_id].full_name if approval else "", "approvedAt": _stamp(approval.decided_at) if approval else "",
            "stages": [
                {"id": str(s.id), "title": (s.result or {}).get("summary", "Action"), "status": "Completed" if s.status == "SUCCEEDED" else "In Progress", "timestamp": _stamp(s.finished_at), "responsibleRole": "Simulated execution", "responsibleParty": "TRUSTCHAIN", "details": "Simulated action, recorded in the audit trail.", "progressPercent": 100 if s.status == "SUCCEEDED" else 50}
                for s in steps
            ],
        }
    active = [d for d in disruptions if d["status"] != "Mitigated"]
    at_risk = [o for o in orders if o["status"] != "Mitigated"]
    pending = [p for p in plans if p["status"] == "Pending Approval"]
    return {
        "disruptions": disruptions, "orders": orders, "recoveryPlans": plans, "auditEvents": [audit_view(e, users) for e in events],
        "notifications": [
            {"id": str(n.id), "title": n.title, "description": n.body or "", "timestamp": _ago(n.created_at), "severity": SEVERITY.get(n.severity, "Low"), "isRead": n.is_read, "type": "disruption" if "DISRUPTION" in n.notification_type else "approval", "relatedEntityId": n.entity_id, "relatedEntityType": "plan" if (n.entity_id or "").startswith("RP-") else "disruption"}
            for n in notifications
        ],
        "execution": execution,
        "health": {
            "activeDisruptions": len(active), "criticalShipments": sum(1 for d in active if d["severity"] == "Critical"), "ordersAtRisk": len(at_risk), "pendingApprovals": len(pending),
            "activeRecoveryPlans": sum(1 for p in plans if p["status"] in ("Approved", "In Progress")), "completedRecoveryPlans": sum(1 for p in plans if p["status"] == "Completed"), "lastUpdated": _stamp(utcnow()),
        },
        "risk": risk_service.status(db, org.slug),
    }
