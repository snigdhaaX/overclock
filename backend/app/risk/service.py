"""Ingest exposures and outcomes, and score orders with the live model or the formula fallback."""
import datetime
import json
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
from sqlalchemy import or_
from sqlalchemy.orm import Session
from . import formula, training
from .features import FEATURES, build_features
from .models import RiskExposure, RiskModelVersion

INPUT_FIELDS = (
    "supplier_id", "carrier_id", "snapshot_at", "hours_to_deadline", "required_qty", "shortage_qty",
    "reported_delay_hours", "priority_tier", "route_risk", "weather_severity", "customs_hours",
)


class OutcomeConflict(Exception):
    pass


class ExposureNotFound(Exception):
    pass


def to_utc_naive(value: datetime.datetime) -> datetime.datetime:
    """All stored times are UTC, so history comparisons cannot shift by a time zone."""
    if value.tzinfo is not None:
        value = value.astimezone(datetime.timezone.utc).replace(tzinfo=None)
    return value


def ingest_exposures(db: Session, organization_id: str, items: List[Dict[str, Any]], data_source: str = "operational") -> Dict[str, Any]:
    """Idempotent: a resent identical record is a duplicate, and a different one is reported, never overwritten."""
    ids = [i["exposure_id"] for i in items]
    existing = {
        r.exposure_id: r
        for r in db.query(RiskExposure).filter(RiskExposure.organization_id == organization_id, RiskExposure.exposure_id.in_(ids)).all()
    } if ids else {}
    created, duplicates, conflicts = 0, 0, []
    for item in items:
        fields = {**item, "snapshot_at": to_utc_naive(item["snapshot_at"])}
        match = existing.get(item["exposure_id"])
        if match is not None:
            if all(getattr(match, f) == fields.get(f) for f in INPUT_FIELDS):
                duplicates += 1
            else:
                conflicts.append(item["exposure_id"])
            continue
        record = RiskExposure(organization_id=organization_id, data_source=data_source, **fields)
        db.add(record)
        existing[item["exposure_id"]] = record
        created += 1
    db.commit()
    return {"created": created, "duplicates": duplicates, "conflicts": conflicts}


def record_outcome(db: Session, organization_id: str, exposure_id: str, missed_deadline: bool, outcome_at: datetime.datetime) -> Dict[str, Any]:
    record = db.query(RiskExposure).filter(RiskExposure.organization_id == organization_id, RiskExposure.exposure_id == exposure_id).first()
    if record is None:
        raise ExposureNotFound(exposure_id)
    value = int(missed_deadline)
    outcome_at = to_utc_naive(outcome_at)
    if record.missed_deadline is not None:
        if record.missed_deadline != value:
            raise OutcomeConflict(f"Exposure {exposure_id} already has a different recorded outcome.")
        return {"exposure_id": exposure_id, "status": "DUPLICATE"}
    if outcome_at < record.snapshot_at:
        raise OutcomeConflict(f"Outcome time for {exposure_id} is earlier than its snapshot.")
    record.missed_deadline = value
    record.outcome_at = outcome_at
    db.commit()
    return {"exposure_id": exposure_id, "status": "RECORDED"}


def _explain(model, row: pd.DataFrame, background: pd.Series, base: float) -> Dict[str, float]:
    """Change in miss probability if each factor were typical. Same input and model give the same answer."""
    swapped = pd.concat([row] * len(FEATURES), ignore_index=True)
    for i, feature in enumerate(FEATURES):
        swapped.loc[i, feature] = background[feature]
    probabilities = model.predict_proba(swapped[FEATURES])[:, 1]
    # A factor with no value, such as a carrier with no history, cannot be a reason for the score.
    known = row.iloc[0].notna()
    effects = {feature: round(float(base - p), 4) for feature, p in zip(FEATURES, probabilities) if known[feature]}
    return dict(sorted(effects.items(), key=lambda kv: -abs(kv[1])))


def score_exposure(db: Session, organization_id: str, item: Dict[str, Any]) -> Dict[str, Any]:
    query = pd.DataFrame([{**item, "snapshot_at": to_utc_naive(item["snapshot_at"])}])
    query["snapshot_at"] = pd.to_datetime(query["snapshot_at"])
    formula_value = float(formula.score(query)[0])
    result: Dict[str, Any] = {
        "formula_score": round(formula_value, 2),
        "formula_policy_version": formula.DEFAULT_POLICY.version,
        "formula_breakdown": formula.explain_row(query),
        "priority_tier": item["priority_tier"],
        "priority_weight": formula.PRIORITY_WEIGHT[item["priority_tier"]],
    }
    active = training.get_active(db, organization_id)
    sources = db.query(RiskExposure.data_source).filter(RiskExposure.organization_id == organization_id).distinct().all()
    result["data_sources"] = sorted(s[0] for s in sources)
    if active is None:
        result.update({
            "method": "formula",
            "fallback_reason": "No model has yet beaten the formula for this organization.",
            "model_version": None,
            "miss_probability": None,
            "risk_score": round(formula_value, 2),
            "risk_category": formula.category(formula_value),
            "factor_effects": None,
        })
        return result
    artifact = training.load_artifact(active)
    model = artifact["model"]
    # Only this supplier's and carrier's history is needed, so scoring stays fast as data grows.
    history = training.load_frame(db, organization_id, or_(
        RiskExposure.supplier_id == item["supplier_id"], RiskExposure.carrier_id == item["carrier_id"]
    ))
    x = build_features(query, history)
    probability = float(model.predict_proba(x[FEATURES])[0, 1])
    value = probability * result["priority_weight"] * 100.0
    result.update({
        "method": "ml",
        "fallback_reason": None,
        "model_version": active.version,
        "miss_probability": round(probability, 4),
        "risk_score": round(value, 2),
        "risk_category": formula.category(value),
        "factor_effects": _explain(model, x, artifact["background"], probability),
    })
    return result


def describe_version(record: RiskModelVersion) -> Dict[str, Any]:
    return {
        "version": record.version,
        "status": record.status,
        "decision_reason": record.decision_reason,
        "trained_through": record.trained_through.isoformat() if record.trained_through else None,
        "train_rows": record.train_rows,
        "eval_rows": record.eval_rows,
        "metrics": json.loads(record.metrics_json),
        "created_at": record.created_at.isoformat(),
    }


def list_versions(db: Session, organization_id: str) -> List[Dict[str, Any]]:
    rows = (
        db.query(RiskModelVersion)
        .filter(RiskModelVersion.organization_id == organization_id)
        .order_by(RiskModelVersion.version.desc())
        .all()
    )
    return [describe_version(r) for r in rows]


def status(db: Session, organization_id: str, policy: training.TrainingPolicy = training.DEFAULT_TRAINING_POLICY) -> Dict[str, Any]:
    active = training.get_active(db, organization_id)
    versions = list_versions(db, organization_id)
    return {
        "scoring_method": "ml" if active is not None else "formula",
        "active_version": active.version if active is not None else None,
        "new_outcomes_since_active": training.new_outcomes_since_active(db, organization_id),
        "retrain_after_new_outcomes": policy.retrain_after_new_outcomes,
        "retrain_due": training.should_retrain(db, organization_id, policy),
        "latest_run": versions[0] if versions else None,
    }
