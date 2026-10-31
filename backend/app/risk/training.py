"""Train, compare against the formula on the same outcome, and promote only on evidence."""
import hashlib
import io
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score
from sqlalchemy import func
from sqlalchemy.orm import Session
from . import formula
from .features import FEATURES, build_features
from .models import RiskExposure, RiskModelVersion

SEED = 42
EVAL_FRACTION = 0.30
BOOTSTRAP_ROUNDS = 300
TOP_FRACTION = 0.20


@dataclass(frozen=True)
class TrainingPolicy:
    min_train_rows: int = 500
    min_eval_rows: int = 200
    min_eval_positives: int = 20
    first_training_after_outcomes: int = 1000
    retrain_after_new_outcomes: int = 500


DEFAULT_TRAINING_POLICY = TrainingPolicy()


def model_dir() -> Path:
    return Path(os.getenv("TRUSTCHAIN_RISK_MODEL_DIR", str(Path(__file__).resolve().parents[2] / "models" / "risk")))


def _artifact_path(organization_id: str, version: int) -> Path:
    # Organization ids can contain characters that are invalid in file names.
    org = hashlib.sha256(organization_id.encode("utf-8")).hexdigest()[:16]
    return model_dir() / org / f"v{version}.joblib"


def load_frame(db: Session, organization_id: str, *criteria) -> pd.DataFrame:
    rows = db.query(RiskExposure).filter(RiskExposure.organization_id == organization_id, *criteria).all()
    columns = [c.name for c in RiskExposure.__table__.columns]
    df = pd.DataFrame([{c: getattr(r, c) for c in columns} for r in rows], columns=columns)
    for col in ("snapshot_at", "outcome_at"):
        df[col] = pd.to_datetime(df[col])
    return df


def get_active(db: Session, organization_id: str) -> Optional[RiskModelVersion]:
    return (
        db.query(RiskModelVersion)
        .filter(RiskModelVersion.organization_id == organization_id, RiskModelVersion.status == "ACTIVE")
        .first()
    )


def load_artifact(record: RiskModelVersion) -> Dict[str, Any]:
    """Returns the fitted model and the typical feature values used to explain its scores."""
    if record.artifact_path and Path(record.artifact_path).exists():
        return joblib.load(record.artifact_path)
    return joblib.load(io.BytesIO(record.artifact_blob))


def fit_model(x: pd.DataFrame, y: np.ndarray) -> HistGradientBoostingClassifier:
    model = HistGradientBoostingClassifier(random_state=SEED, max_depth=4, learning_rate=0.06, max_iter=200, min_samples_leaf=30)
    # A source may lack a whole field, such as weather. The trainer cannot bin an all-empty column.
    matrix = x[FEATURES].copy()
    empty = matrix.columns[matrix.isna().all()]
    matrix[empty] = 0.0
    return model.fit(matrix, y)


def _top_capture(y: np.ndarray, scores: np.ndarray) -> float:
    """Share of all real misses found by reviewing only the highest-ranked 20% of orders."""
    k = max(1, int(round(len(y) * TOP_FRACTION)))
    top = np.argsort(-scores, kind="stable")[:k]
    return float(y[top].sum() / max(y.sum(), 1))


def _metrics(y: np.ndarray, scores: np.ndarray, probabilities: np.ndarray) -> Dict[str, float]:
    return {
        "roc_auc": round(float(roc_auc_score(y, scores)), 4),
        "pr_auc": round(float(average_precision_score(y, scores)), 4),
        "top20_capture": round(_top_capture(y, scores), 4),
        "brier": round(float(brier_score_loss(y, probabilities)), 4),
        **_classification_metrics(y, probabilities),
    }


def _classification_metrics(y: np.ndarray, probabilities: np.ndarray) -> Dict[str, float]:
    """At a 50% cut-off. Misses are rare, so accuracy must be read against always guessing "on time"."""
    predicted = (probabilities >= 0.5).astype(int)
    true_positive = int(((predicted == 1) & (y == 1)).sum())
    precision = true_positive / max(int(predicted.sum()), 1)
    recall = true_positive / max(int(y.sum()), 1)
    return {
        "accuracy": round(float((predicted == y).mean()), 4),
        "baseline_accuracy": round(float(max(y.mean(), 1 - y.mean())), 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(2 * precision * recall / max(precision + recall, 1e-9), 4),
    }


def _weighted_top_capture(y: np.ndarray, scores: np.ndarray, weights: np.ndarray) -> float:
    """Like top-20% capture, but a missed top-priority order counts for more than a routine one."""
    k = max(1, int(round(len(y) * TOP_FRACTION)))
    top = np.argsort(-scores, kind="stable")[:k]
    return round(float((y[top] * weights[top]).sum() / max((y * weights).sum(), 1e-9)), 4)


def _bootstrap_pr_gain(y: np.ndarray, a: np.ndarray, b: np.ndarray) -> Dict[str, float]:
    """Paired bootstrap of PR-AUC(a) - PR-AUC(b) on identical resampled orders."""
    rng = np.random.default_rng(SEED)
    gains = []
    for _ in range(BOOTSTRAP_ROUNDS):
        i = rng.integers(0, len(y), len(y))
        if y[i].min() == y[i].max():
            continue
        gains.append(average_precision_score(y[i], a[i]) - average_precision_score(y[i], b[i]))
    low, high = np.percentile(gains, [2.5, 97.5])
    return {
        "mean": round(float(np.mean(gains)), 4),
        "ci_low": round(float(low), 4),
        "ci_high": round(float(high), 4),
    }


def new_outcomes_since_active(db: Session, organization_id: str) -> int:
    query = db.query(func.count(RiskExposure.id)).filter(
        RiskExposure.organization_id == organization_id, RiskExposure.missed_deadline.isnot(None)
    )
    active = get_active(db, organization_id)
    if active is not None:
        query = query.filter(RiskExposure.snapshot_at > active.trained_through)
    return int(query.scalar() or 0)


def _resolved_count(db: Session, organization_id: str) -> int:
    return int(db.query(func.count(RiskExposure.id)).filter(
        RiskExposure.organization_id == organization_id, RiskExposure.missed_deadline.isnot(None)
    ).scalar() or 0)


def should_retrain(db: Session, organization_id: str, policy: TrainingPolicy = DEFAULT_TRAINING_POLICY) -> bool:
    """Counts from the last run of any result, so a rejected run does not retrigger on every new outcome."""
    latest = (
        db.query(RiskModelVersion)
        .filter(RiskModelVersion.organization_id == organization_id)
        .order_by(RiskModelVersion.version.desc())
        .first()
    )
    total = _resolved_count(db, organization_id)
    if latest is None:
        return total >= policy.first_training_after_outcomes
    return total - latest.resolved_rows >= policy.retrain_after_new_outcomes


def _next_version(db: Session, organization_id: str) -> int:
    current = db.query(func.max(RiskModelVersion.version)).filter(RiskModelVersion.organization_id == organization_id).scalar()
    return int(current or 0) + 1


def retrain(db: Session, organization_id: str, policy: TrainingPolicy = DEFAULT_TRAINING_POLICY) -> Dict[str, Any]:
    """Run one training cycle. A challenger only goes live if it beats the formula on unseen, later orders."""
    frame = load_frame(db, organization_id)
    resolved = frame[frame["missed_deadline"].notna()].sort_values(["snapshot_at", "exposure_id"]).reset_index(drop=True)
    active = get_active(db, organization_id)

    if active is not None:
        # Split what the live model has never seen: the challenger learns from the earlier part,
        # then both are judged on the later part. Otherwise they would train on identical rows.
        unseen = resolved[resolved["snapshot_at"] > active.trained_through]
        eval_df = unseen.iloc[len(unseen) // 2:]
    else:
        eval_df = resolved.iloc[int(len(resolved) * (1 - EVAL_FRACTION)):]

    if eval_df.empty:
        return {"status": "SKIPPED", "reason": "No resolved orders are available to evaluate on.", "resolved_rows": len(resolved)}
    eval_start = eval_df["snapshot_at"].min()
    # Rows still unresolved when evaluation starts would leak later knowledge into training.
    train_df = resolved[resolved["outcome_at"] < eval_start]
    y_eval = eval_df["missed_deadline"].to_numpy(dtype=int)

    if len(train_df) < policy.min_train_rows or len(eval_df) < policy.min_eval_rows:
        return {
            "status": "SKIPPED",
            "reason": f"Needs {policy.min_train_rows} training and {policy.min_eval_rows} evaluation rows; has {len(train_df)} and {len(eval_df)}.",
            "resolved_rows": len(resolved),
        }
    positives = int(y_eval.sum())
    if positives < policy.min_eval_positives or positives == len(y_eval):
        return {"status": "SKIPPED", "reason": f"Evaluation window has {positives} misses out of {len(y_eval)} orders, too unbalanced to compare.", "resolved_rows": len(resolved)}
    y_train = train_df["missed_deadline"].to_numpy(dtype=int)
    if y_train.min() == y_train.max():
        return {"status": "SKIPPED", "reason": "Training data contains only one outcome.", "resolved_rows": len(resolved)}

    x_train = build_features(train_df, resolved[resolved["outcome_at"] < eval_start])
    x_eval = build_features(eval_df, resolved)
    challenger = fit_model(x_train, y_train)
    challenger_p = challenger.predict_proba(x_eval[FEATURES])[:, 1]

    # The formula gets a probability calibrated on training data only, so Brier scores are comparable.
    formula_train = formula.score(train_df)
    formula_eval = formula.score(eval_df)
    calibrator = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0).fit(formula_train, y_train)

    metrics: Dict[str, Any] = {
        "target": "order line missed its required delivery date",
        "eval_window": {"start": eval_start.isoformat(), "end": eval_df["snapshot_at"].max().isoformat(), "rows": len(eval_df), "misses": positives},
        "data_sources": sorted(frame["data_source"].dropna().unique().tolist()),
        "formula": _metrics(y_eval, formula_eval, calibrator.predict(formula_eval)),
        "challenger": _metrics(y_eval, challenger_p, challenger_p),
        "gain_vs_formula": _bootstrap_pr_gain(y_eval, challenger_p, formula_eval),
    }
    # The rankings users actually see: formula as is, ML multiplied by priority weight.
    weights = eval_df["priority_tier"].map(formula.PRIORITY_WEIGHT).fillna(0.7).to_numpy(dtype=float)
    metrics["priority_weighted_top20"] = {
        "formula": _weighted_top_capture(y_eval, formula_eval, weights),
        "challenger": _weighted_top_capture(y_eval, challenger_p * weights, weights),
    }

    beats_formula = metrics["gain_vs_formula"]["ci_low"] > 0
    beats_active = True
    active_beats_formula = False
    if active is not None:
        active_p = load_artifact(active)["model"].predict_proba(x_eval[FEATURES])[:, 1]
        metrics["active"] = {"version": active.version, **_metrics(y_eval, active_p, active_p)}
        metrics["gain_vs_active"] = _bootstrap_pr_gain(y_eval, challenger_p, active_p)
        metrics["active_gain_vs_formula"] = _bootstrap_pr_gain(y_eval, active_p, formula_eval)
        # The challenger has seen newer data, so it wins unless it is reliably worse.
        beats_active = metrics["gain_vs_active"]["ci_high"] >= 0
        active_beats_formula = metrics["active_gain_vs_formula"]["ci_low"] > 0

    version = _next_version(db, organization_id)
    promoted = beats_formula and beats_active
    artifact = None
    if promoted:
        status, reason = "ACTIVE", "Beat the formula on later unseen orders, with a 95% interval above zero, and was not reliably worse than the live model."
        x_all = build_features(resolved, resolved)
        production = fit_model(x_all, resolved["missed_deadline"].to_numpy(dtype=int))
        path = _artifact_path(organization_id, version)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump({"model": production, "background": x_all.median(numeric_only=True)}, path)
        artifact = str(path)
        if active is not None:
            active.status = "RETIRED"
    else:
        status = "REJECTED"
        reason = "No reliable gain over the formula on later unseen orders." if not beats_formula else "Reliably worse than the live model on later unseen orders."
        if active is not None and not active_beats_formula:
            active.status = "RETIRED"
            reason += f" Live model v{active.version} also no longer beats the formula, so scoring falls back to the formula."

    db.add(RiskModelVersion(
        organization_id=organization_id,
        version=version,
        status=status,
        decision_reason=reason,
        trained_through=resolved["outcome_at"].max().to_pydatetime() if promoted else train_df["outcome_at"].max().to_pydatetime(),
        train_rows=len(resolved) if promoted else len(train_df),
        resolved_rows=len(resolved),
        eval_rows=len(eval_df),
        metrics_json=json.dumps(metrics),
        artifact_path=artifact,
        artifact_blob=Path(artifact).read_bytes() if artifact else None,
    ))
    db.commit()
    return {"status": status, "version": version, "reason": reason, "metrics": metrics}
