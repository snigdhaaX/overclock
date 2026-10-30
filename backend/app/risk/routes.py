import datetime
import threading
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status as http_status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, sessionmaker
from ..blockchain.database import get_db
from fastapi import Header
from ..blockchain.routes import AuthenticatedUser
from ..identity import bearer_token, header_auth_allowed, identity_from_jwt
from . import service, training

router = APIRouter(prefix="/api/v1/risk", tags=["Risk Intelligence"])

MODEL_ADMIN_ROLES = {"operations_analyst", "administrator"}
_retrain_locks: Dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()


def get_current_user(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_org_id: Optional[str] = Header(None, alias="X-Organization-Id"),
    x_roles: Optional[str] = Header(None, alias="X-User-Roles"),
    db: Session = Depends(get_db),
) -> AuthenticatedUser:
    """Risk data is keyed by organization slug, so this resolves the slug from the verified token."""
    token = bearer_token(authorization)
    if token:
        identity = identity_from_jwt(db, token)
        if identity is None:
            raise HTTPException(status_code=http_status.HTTP_401_UNAUTHORIZED, detail="Please sign in again.")
        return AuthenticatedUser(user_id=identity.user_id, organization_id=identity.organization_slug, roles=identity.roles)
    if not header_auth_allowed():
        raise HTTPException(status_code=http_status.HTTP_401_UNAUTHORIZED, detail="Please sign in.")
    roles = [r.strip() for r in x_roles.split(",")] if x_roles else ["operations_analyst"]
    return AuthenticatedUser(user_id=x_user_id or "user:test", organization_id=x_org_id or "org:test", roles=roles)


class ExposureFeatures(BaseModel):
    supplier_id: str = Field(..., min_length=1, max_length=128)
    carrier_id: str = Field(..., min_length=1, max_length=128)
    snapshot_at: datetime.datetime
    hours_to_deadline: float
    required_qty: float = Field(..., gt=0)
    shortage_qty: float = Field(..., ge=0)
    reported_delay_hours: float = Field(..., ge=0)
    priority_tier: int = Field(..., ge=1, le=4)
    route_risk: Optional[float] = None
    weather_severity: Optional[float] = None
    customs_hours: Optional[float] = Field(None, ge=0)


class ExposureCreate(ExposureFeatures):
    exposure_id: str = Field(..., min_length=1, max_length=128)


class ExposureBatch(BaseModel):
    exposures: List[ExposureCreate] = Field(..., min_length=1, max_length=5000)


class ScoreBatchItem(ExposureFeatures):
    order_id: str = Field(..., min_length=1, max_length=128)


class ScoreBatch(BaseModel):
    orders: List[ScoreBatchItem] = Field(..., min_length=1, max_length=100)


class OutcomeReport(BaseModel):
    missed_deadline: bool
    outcome_at: datetime.datetime


def _org_lock(organization_id: str) -> threading.Lock:
    with _locks_guard:
        return _retrain_locks.setdefault(organization_id, threading.Lock())


def _run_retrain(session_factory, organization_id: str) -> Optional[Dict[str, Any]]:
    """Runs at most one training cycle per organization at a time."""
    lock = _org_lock(organization_id)
    if not lock.acquire(blocking=False):
        return None
    db = session_factory()
    try:
        return training.retrain(db, organization_id)
    finally:
        db.close()
        lock.release()


def _maybe_schedule_retrain(db: Session, organization_id: str, tasks: BackgroundTasks) -> bool:
    if not training.should_retrain(db, organization_id):
        return False
    tasks.add_task(_run_retrain, sessionmaker(bind=db.get_bind()), organization_id)
    return True


@router.post("/exposures")
def ingest_exposures(batch: ExposureBatch, user: AuthenticatedUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.ingest_exposures(db, user.organization_id, [e.model_dump() for e in batch.exposures])


@router.post("/exposures/{exposure_id}/outcome")
def report_outcome(
    exposure_id: str,
    report: OutcomeReport,
    tasks: BackgroundTasks,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reporting what really happened is what makes the model adapt: enough new outcomes trigger retraining."""
    try:
        result = service.record_outcome(db, user.organization_id, exposure_id, report.missed_deadline, report.outcome_at)
    except service.ExposureNotFound:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Exposure not found.")
    except service.OutcomeConflict as exc:
        raise HTTPException(status_code=http_status.HTTP_409_CONFLICT, detail=str(exc))
    result["retrain_scheduled"] = _maybe_schedule_retrain(db, user.organization_id, tasks)
    return result


@router.post("/score")
def score(features: ExposureFeatures, user: AuthenticatedUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.score_exposure(db, user.organization_id, features.model_dump())


@router.post("/score/batch")
def score_batch(batch: ScoreBatch, user: AuthenticatedUser = Depends(get_current_user), db: Session = Depends(get_db)):
    """One request per screen rather than one per order, which matters on mobile networks."""
    results = []
    for order in batch.orders:
        features = order.model_dump(exclude={"order_id"})
        results.append({"order_id": order.order_id, **service.score_exposure(db, user.organization_id, features)})
    return {"results": results}


@router.post("/models/retrain")
def retrain(user: AuthenticatedUser = Depends(get_current_user), db: Session = Depends(get_db)):
    if not MODEL_ADMIN_ROLES.intersection(user.roles):
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Not allowed to retrain risk models.")
    result = _run_retrain(sessionmaker(bind=db.get_bind()), user.organization_id)
    if result is None:
        raise HTTPException(status_code=http_status.HTTP_409_CONFLICT, detail="Retraining is already running.")
    return result


@router.get("/models")
def list_models(user: AuthenticatedUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.list_versions(db, user.organization_id)


@router.get("/status")
def risk_status(user: AuthenticatedUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.status(db, user.organization_id)
