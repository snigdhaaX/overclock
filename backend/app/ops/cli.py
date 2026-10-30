"""From the repo root: python -m backend.app.ops.cli {seed,reset,event,arrive}"""
import argparse
import datetime
import uuid
from ..blockchain.database import SessionLocal, init_db
from .. import models as _all_tables  # noqa: F401
from ..models.identity import Organization
from . import engine, seed


def _event(event_type: str, shipment: str, hours: float, reason: str) -> dict:
    return {
        "event_id": f"EVT-{uuid.uuid4().hex[:10]}", "carrier": "FastTrack Logistics", "shipment_id": shipment, "event_type": event_type,
        "event_timestamp": datetime.datetime.now(datetime.timezone.utc), "estimated_delay_hours": hours, "reason": reason,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["seed", "reset", "event", "arrive"])
    parser.add_argument("--shipment", default="SHP-101")
    parser.add_argument("--hours", type=float, default=96)
    parser.add_argument("--reason", default="Port congestion at Singapore")
    args = parser.parse_args()
    init_db()
    db = SessionLocal()
    try:
        if args.command == "seed":
            print(seed.seed(db))
            org = db.query(Organization).filter_by(slug=seed.ORG_SLUG).one()
            # A smaller live issue, so the app never opens empty before the demo event.
            print(engine.process_carrier_event(db, org, _event("SHIPMENT_DELAYED", "SHP-125", 48, "Customs document hold at Frankfurt")))
        elif args.command == "reset":
            seed.reset(db)
            print("Demo data removed.")
        else:
            org = db.query(Organization).filter_by(slug=seed.ORG_SLUG).one()
            kind = "SHIPMENT_DELAYED" if args.command == "event" else "SHIPMENT_ARRIVED"
            print(engine.process_carrier_event(db, org, _event(kind, args.shipment, args.hours, args.reason)))
    finally:
        db.close()


if __name__ == "__main__":
    main()
