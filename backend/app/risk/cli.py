"""Run from the repo root: python -m backend.app.risk.cli {demo,retrain,status}"""
import argparse
import json
from typing import Any, Dict, List
from ..blockchain.database import SessionLocal, init_db
from . import models as _models  # noqa: F401  (registers tables before init_db)
from . import importers, service, synthetic, training

DEMO_ORG = "org:synthetic-demo"


def _load(db, organization_id: str, items: List[Dict[str, Any]]) -> None:
    features = [{k: v for k, v in i.items() if k not in ("missed_deadline", "outcome_at")} for i in items]
    service.ingest_exposures(db, organization_id, features, data_source="synthetic")
    for item in items:
        service.record_outcome(db, organization_id, item["exposure_id"], bool(item["missed_deadline"]), item["outcome_at"])


def _summary(result: Dict[str, Any]) -> None:
    print(f"  status: {result['status']}" + (f" (v{result['version']})" if "version" in result else ""))
    print(f"  reason: {result['reason']}")
    m = result.get("metrics")
    if not m:
        return
    w = m["eval_window"]
    print(f"  later unseen orders: {w['rows']} ({w['misses']} missed)")
    print(f"  {'':12}{'ROC-AUC':>9}{'PR-AUC':>9}{'Top-20%':>9}{'Brier':>8}")
    for name in ("formula", "active", "challenger"):
        if name in m:
            r = m[name]
            print(f"  {name:12}{r['roc_auc']:>9}{r['pr_auc']:>9}{r['top20_capture']:>9}{r['brier']:>8}")
    w = m["priority_weighted_top20"]
    print(f"  priority-weighted top-20% capture: formula {w['formula']}, ML x priority {w['challenger']}")
    g = m["gain_vs_formula"]
    print(f"  PR-AUC gain vs formula: {g['mean']} (95% interval {g['ci_low']} to {g['ci_high']})")


def demo() -> None:
    """Walks through the lifecycle on clearly labelled synthetic data."""
    init_db()
    db = SessionLocal()
    try:
        db.query(_models.RiskModelVersion).filter_by(organization_id=DEMO_ORG).delete()
        db.query(_models.RiskExposure).filter_by(organization_id=DEMO_ORG).delete()
        db.commit()

        print("SYNTHETIC DATA: this shows the pipeline works, not real-world accuracy.\n")
        print("1. Initial training on 2 years of history")
        history = synthetic.generate(rows=6000, days=730)
        _load(db, DEMO_ORG, history)
        _summary(training.retrain(db, DEMO_ORG))

        print("\n2. Business as usual: 1,500 new outcomes arrive")
        last = max(i["outcome_at"] for i in history)
        normal = synthetic.generate(rows=1500, days=180, seed=8, start=last, id_prefix="NEW")
        _load(db, DEMO_ORG, normal)
        _summary(training.retrain(db, DEMO_ORG))

        print("\n3. The world changes: a quarter of suppliers suddenly get worse")
        last = max(i["outcome_at"] for i in normal)
        changed = synthetic.generate(rows=1500, days=180, seed=9, start=last, id_prefix="SHIFT", degrade_suppliers=0.25)
        _load(db, DEMO_ORG, changed)
        _summary(training.retrain(db, DEMO_ORG))
        print(f"\nScoring now uses: {json.dumps({k: v for k, v in service.status(db, DEMO_ORG).items() if k in ('scoring_method', 'active_version')})}")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["demo", "retrain", "status", "import-logistics", "import-dataco"])
    parser.add_argument("--org", default=DEMO_ORG)
    parser.add_argument("--file")
    args = parser.parse_args()
    if args.command.startswith("import-"):
        init_db()
        db = SessionLocal()
        try:
            load_file = importers.import_dataco if args.command == "import-dataco" else importers.import_logistics_csv
            print(load_file(db, args.org, args.file))
            _summary(training.retrain(db, args.org))
        finally:
            db.close()
        return
    if args.command == "demo":
        demo()
        return
    init_db()
    db = SessionLocal()
    try:
        if args.command == "retrain":
            _summary(training.retrain(db, args.org))
        else:
            print(json.dumps(service.status(db, args.org), indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    main()
