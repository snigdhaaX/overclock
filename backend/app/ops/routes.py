import datetime
import hmac
import os
from typing import Literal, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from ..auth import Principal, get_principal
from ..blockchain.database import get_db
from ..models.identity import Organization
from ..models.supply_chain import CARRIER_EVENT_TYPES, Supplier
from . import chain, engine, serializers
from .seed import ORG_SLUG

router = APIRouter(prefix="/api/v1", tags=["Operations"])
MANAGERS = ("SUPPLY_CHAIN_MANAGER",)
AUTHORS = ("OPERATIONS_ANALYST", "SUPPLY_CHAIN_MANAGER")


def run(action):
    try:
        return action()
    except engine.WorkflowError as exc:
        raise HTTPException(exc.status, detail={"code": exc.code, "message": exc.message})


class CarrierEventIn(BaseModel):
    event_id: str = Field(..., min_length=1, max_length=128)
    carrier: str = Field(..., min_length=1, max_length=120)
    shipment_id: str = Field(..., min_length=1, max_length=64)
    event_type: Literal[CARRIER_EVENT_TYPES]  # type: ignore[valid-type]
    event_timestamp: datetime.datetime
    estimated_delay_hours: Optional[float] = Field(None, ge=0)
    reason: Optional[str] = Field(None, max_length=500)
    source_sequence: Optional[int] = None


@router.post("/webhooks/carriers/simulated")
def carrier_webhook(event: CarrierEventIn, x_webhook_secret: Optional[str] = Header(None), db: Session = Depends(get_db)):
    expected = os.getenv("TRUSTCHAIN_WEBHOOK_SECRET")
    if not expected:
        raise HTTPException(503, detail={"code": "WEBHOOK_NOT_CONFIGURED", "message": "Set TRUSTCHAIN_WEBHOOK_SECRET on the server."})
    if not x_webhook_secret or not hmac.compare_digest(x_webhook_secret, expected):
        raise HTTPException(401, detail={"code": "UNAUTHENTICATED", "message": "Carrier source couldn't be verified."})
    org = db.query(Organization).filter_by(slug=os.getenv("TRUSTCHAIN_WEBHOOK_ORG", ORG_SLUG)).first()
    if org is None:
        raise HTTPException(503, detail={"code": "NOT_SEEDED", "message": "Load the demo data first."})
    return run(lambda: engine.process_carrier_event(db, org, event.model_dump()))


@router.get("/app/bootstrap")
def app_bootstrap(principal: Principal = Depends(get_principal), db: Session = Depends(get_db)):
    """Everything the app's screens read, in the shapes they already use."""
    return serializers.bootstrap(db, principal.organization, principal.user)


class Decision(BaseModel):
    comments: Optional[str] = Field(None, max_length=2000)


@router.post("/recovery/plans/{plan_id}/submit")
def submit_plan(plan_id: str, principal: Principal = Depends(get_principal), db: Session = Depends(get_db)):
    principal.require(*AUTHORS)
    plan = run(lambda: engine.submit_plan(db, principal.organization, principal.user, plan_id))
    return {"plan_id": plan.plan_key, "version": plan.version, "status": plan.status, "plan_hash": plan.plan_hash, "anchor": (plan.expected_outcome or {}).get("anchor")}


def _decide(plan_id: str, decision: str, body: Decision, principal: Principal, db: Session):
    # The creator check comes first, so a self-approval gets the true reason.
    def action():
        engine._plan_for_decision(db, principal.organization, principal.user, plan_id)
        principal.require(*MANAGERS)
        return engine.decide_plan(db, principal.organization, principal.user, plan_id, decision, body.comments)
    plan = run(action)
    return {"plan_id": plan.plan_key, "version": plan.version, "status": plan.status}


@router.post("/approvals/{plan_id}/approve")
def approve(plan_id: str, body: Decision, principal: Principal = Depends(get_principal), db: Session = Depends(get_db)):
    return _decide(plan_id, "APPROVED", body, principal, db)


@router.post("/approvals/{plan_id}/reject")
def reject(plan_id: str, body: Decision, principal: Principal = Depends(get_principal), db: Session = Depends(get_db)):
    if not (body.comments or "").strip():
        raise HTTPException(422, detail={"code": "REASON_REQUIRED", "message": "Please give a reason for rejecting this plan."})
    return _decide(plan_id, "REJECTED", body, principal, db)


@router.post("/approvals/{plan_id}/request-revision")
def request_revision(plan_id: str, body: Decision, principal: Principal = Depends(get_principal), db: Session = Depends(get_db)):
    if not (body.comments or "").strip():
        raise HTTPException(422, detail={"code": "REASON_REQUIRED", "message": "Please say what needs to change."})
    return _decide(plan_id, "REVISION_REQUIRED", body, principal, db)


@router.post("/ai/disruptions/{disruption_id}/recommendations")
def ai_recommendations(disruption_id: str, principal: Principal = Depends(get_principal), db: Session = Depends(get_db)):
    """Advisory only. status is UNAVAILABLE on any AI failure, and the rest of the workflow is unaffected."""
    principal.require(*AUTHORS)
    return run(lambda: engine.explain_recovery(db, principal.organization, disruption_id))


@router.post("/execution/{plan_id}/confirm")
def confirm_execution(plan_id: str, principal: Principal = Depends(get_principal), db: Session = Depends(get_db)):
    principal.require(*MANAGERS)
    execution = run(lambda: engine.confirm_execution(db, principal.organization, principal.user, plan_id))
    return {"plan_id": plan_id, "status": execution.status}


@router.get("/blockchain/verify/plan/{plan_id}")
def verify_plan(plan_id: str, principal: Principal = Depends(get_principal), db: Session = Depends(get_db)):
    return run(lambda: engine.verify_plan(db, principal.organization, plan_id))


@router.get("/audit/verify")
def verify_audit(principal: Principal = Depends(get_principal), db: Session = Depends(get_db)):
    return engine.verify_audit_chain(db, principal.organization.id)


@router.get("/suppliers")
def suppliers(principal: Principal = Depends(get_principal), db: Session = Depends(get_db)):
    rows = db.query(Supplier).filter_by(organization_id=principal.organization.id).all()
    return [{"code": s.code, "name": s.name, "country": s.country, **engine.supplier_reliability(db, principal.organization.slug, s.code)} for s in rows]


@router.get("/chain/status")
def chain_status(principal: Principal = Depends(get_principal)):
    return {"signing_enabled": chain.enabled()}
