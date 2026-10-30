"""Supplier switch, reroute and stock reallocation, ported from the notebook onto real tables.

Fixes from the notebook version:
- Inputs come from the database, not generated dates, warehouses, distances or routes.
- A switch compares late rates with late rates, and checks lead time, capacity and budget.
- Supplier history only counts recorded outcomes, and too little history gives no score.
- One risk score ranks everything, and P1 to P3 come from it.
"""
import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..models.base import utcnow
from ..models.identity import Organization
from ..models.intelligence import Disruption
from ..models.inventory import Inventory
from ..models.supply_chain import Carrier, RouteAlternative, Shipment, Supplier, SupplierProduct, Warehouse, WarehouseLane
from ..risk.models import RiskExposure
from .policy import DEFAULT_POLICY, RecoveryPolicy, plan_budget_limit


def _aware(value: Optional[datetime.datetime]) -> Optional[datetime.datetime]:
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=datetime.timezone.utc)


def recovery_tier(score: float, policy: RecoveryPolicy = DEFAULT_POLICY) -> str:
    return "P1" if score >= policy.p1_score else "P2" if score >= policy.p2_score else "P3"


def supplier_reliability(db: Session, org_slug: str, code: str, policy: RecoveryPolicy = DEFAULT_POLICY) -> Dict[str, Any]:
    """Calculated only from recorded outcomes. No history means no score (PRD 6.23)."""
    resolved, missed = db.query(func.count(RiskExposure.id), func.coalesce(func.sum(RiskExposure.missed_deadline), 0)).filter(
        RiskExposure.organization_id == org_slug, RiskExposure.supplier_id == code, RiskExposure.missed_deadline.isnot(None)
    ).one()
    resolved = int(resolved or 0)
    if resolved < policy.min_supplier_outcomes:
        return {"code": code, "outcomes": resolved, "on_time_rate": None, "late_rate": None}
    late_rate = float(missed) / resolved
    return {"code": code, "outcomes": resolved, "on_time_rate": 1 - late_rate, "late_rate": late_rate}


def route_risk_score(shipment: Shipment, policy: RecoveryPolicy = DEFAULT_POLICY) -> Optional[float]:
    """Mean of route, weather and customs risk on a 0 to 1 scale. None when a reading is missing."""
    if shipment.route_risk is None or shipment.weather_severity is None or shipment.customs_hours is None:
        return None
    customs = min(float(shipment.customs_hours) / policy.customs_hours_full_risk, 1.0)
    return (float(shipment.route_risk) + float(shipment.weather_severity) + customs) / 3


def _hours_left(entry: Dict[str, Any]) -> float:
    return (_aware(entry["order"].required_delivery_date) - utcnow()).total_seconds() / 3600


def _units(entry: Dict[str, Any]) -> float:
    return float(entry["impact"].shortage_quantity)


def reallocation(db: Session, lines: List[Dict[str, Any]], destination: Warehouse, policy: RecoveryPolicy) -> Dict[str, Any]:
    """Nearest warehouse with genuinely free stock. Reserved and safety stock never move."""
    actions, notes = [], []
    protected: Dict[str, float] = {}
    used: Dict[Any, float] = {}
    for entry in lines:
        order = entry["order"]
        need = _units(entry)
        lanes = (
            db.query(WarehouseLane, Inventory)
            .join(Inventory, Inventory.warehouse_id == WarehouseLane.from_warehouse_id)
            .filter(WarehouseLane.to_warehouse_id == destination.id, Inventory.product_id == entry["line"].product_id)
            .order_by(WarehouseLane.transit_hours)
            .all()
        )
        if not lanes:
            notes.append(f"{order.code}: no warehouse with this product has a transfer lane to {destination.code}.")
        for lane, stock in lanes:
            if need <= 0:
                break
            donor = db.get(Warehouse, stock.warehouse_id)
            free = float(stock.available_quantity or 0) - used.get(stock.id, 0.0)
            hours = float(lane.transit_hours)
            if hours > policy.max_transfer_hours:
                notes.append(f"{donor.code}: {hours:.0f}h transfer is over the {policy.max_transfer_hours:.0f}h limit.")
            elif hours > _hours_left(entry):
                notes.append(f"{donor.code}: {hours:.0f}h transfer would miss {order.code}.")
            elif free < policy.min_donor_free_units:
                notes.append(f"{donor.code}: {float(stock.on_hand_quantity):.0f} on hand, but only {max(free, 0):.0f} free after reservations and safety stock.")
            else:
                quantity = min(free, need)
                used[stock.id] = used.get(stock.id, 0.0) + quantity
                need -= quantity
                protected[order.code] = protected.get(order.code, 0.0) + quantity
                actions.append({
                    "type": "STOCK_TRANSFER", "orders": [order.code], "quantity": quantity, "cost": round(quantity * float(lane.unit_cost), 2), "lead": f"{hours:.0f} hours",
                    "title": f"Transfer {quantity:.0f} units for {order.code}", "source": donor.code, "destination": destination.code,
                    "description": f"Move free {entry['product'].name} from {donor.name}.",
                    "inventory_id": str(stock.id), "product_id": str(entry["line"].product_id), "warehouse_to": str(destination.id),
                })
        if need > 0:
            notes.append(f"{order.code}: {need:.0f} units can't be covered by free stock.")
    return {"actions": actions, "notes": notes, "protected": protected}


def supplier_switch(db: Session, lines: List[Dict[str, Any]], shipment: Shipment, org_slug: str, policy: RecoveryPolicy) -> Dict[str, Any]:
    """Switches only to a supplier with a proven better record that can really deliver in time."""
    actions, notes = [], []
    protected: Dict[str, float] = {}
    booked: Dict[Any, float] = {}
    current = db.get(Supplier, shipment.supplier_id)
    current_record = supplier_reliability(db, org_slug, current.code, policy)
    for entry in lines:
        order = entry["order"]
        need = _units(entry)
        options = db.query(SupplierProduct).filter(SupplierProduct.product_id == entry["line"].product_id, SupplierProduct.supplier_id != shipment.supplier_id).all()
        if not options:
            notes.append(f"{order.code}: no alternative supplier exists for {entry['product'].name}.")
        chosen = None
        for option in sorted(options, key=lambda o: o.lead_time_days):
            supplier = db.get(Supplier, option.supplier_id)
            record = supplier_reliability(db, org_slug, supplier.code, policy)
            quantity = max(need, float(option.minimum_order_quantity))
            # Capacity is shared across this plan's orders, so one supplier can't be promised twice.
            remaining = None if option.production_capacity is None else float(option.production_capacity) - booked.get(option.id, 0.0)
            if option.lead_time_days * 24 > _hours_left(entry):
                notes.append(f"{supplier.name}: {option.lead_time_days}-day lead time misses {order.code}.")
            elif remaining is not None and remaining < quantity:
                notes.append(f"{supplier.name}: only {max(remaining, 0):.0f} units of capacity left for {order.code}.")
            elif record["late_rate"] is None:
                notes.append(f"{supplier.name}: not enough delivery history to recommend for {order.code}.")
            elif current_record["late_rate"] is not None and record["late_rate"] > current_record["late_rate"] - policy.switch_margin:
                notes.append(f"{supplier.name}: late {record['late_rate']:.0%} of the time, not enough better than {current.name} at {current_record['late_rate']:.0%}.")
            else:
                chosen = (option, supplier, quantity, record)
                break
        if chosen is None:
            continue
        option, supplier, quantity, record = chosen
        booked[option.id] = booked.get(option.id, 0.0) + quantity
        protected[order.code] = need
        actions.append({
            "type": "ALTERNATIVE_SUPPLIER", "orders": [order.code], "quantity": quantity, "cost": round(quantity * float(option.unit_cost or 0), 2), "lead": f"{option.lead_time_days} days",
            "title": f"Buy {quantity:.0f} units from {supplier.name}", "source": supplier.name, "destination": order.delivery_destination or "Customer",
            "description": f"{supplier.name} is on time {record['on_time_rate']:.0%} of the time, for {order.code}.", "supplier_code": supplier.code,
        })
    return {"actions": actions, "notes": notes, "protected": protected}


def reroute(db: Session, lines: List[Dict[str, Any]], shipment: Shipment, policy: RecoveryPolicy) -> Dict[str, Any]:
    """Uses the first route that leaves acceptable risk. One reroute moves the whole shipment."""
    notes: List[str] = []
    risk = route_risk_score(shipment, policy)
    if risk is None:
        return {"actions": [], "notes": [f"{shipment.code}: route, weather or customs readings are missing, so reroute wasn't assessed."], "protected": {}}
    if risk < policy.reroute_risk_threshold:
        return {"actions": [], "notes": [f"{shipment.code}: route risk {risk:.2f} is under the {policy.reroute_risk_threshold:.2f} reroute threshold."], "protected": {}}
    routes = (
        db.query(RouteAlternative)
        .filter(RouteAlternative.organization_id == shipment.organization_id, RouteAlternative.origin == shipment.origin, RouteAlternative.destination_warehouse_id == shipment.destination_warehouse_id)
        .order_by(RouteAlternative.added_transit_hours)
        .all()
    )
    if not routes:
        return {"actions": [], "notes": [f"{shipment.code}: no alternative route is on file."], "protected": {}}
    chosen = next((r for r in routes if risk * float(r.risk_multiplier) < policy.residual_risk_limit), None)
    if chosen is None:
        return {"actions": [], "notes": [f"{shipment.code}: every route leaves risk over {policy.residual_risk_limit:.2f}."], "protected": {}}
    carrier = db.get(Carrier, chosen.carrier_id)
    total = sum(_units(e) for e in lines)
    if carrier.capacity is not None and float(carrier.capacity) < total:
        return {"actions": [], "notes": [f"{carrier.name}: capacity is below {total:.0f} units."], "protected": {}}
    new_eta = _aware(shipment.expected_arrival_at) + datetime.timedelta(hours=float(chosen.added_transit_hours))
    if new_eta >= _aware(shipment.current_eta):
        return {"actions": [], "notes": [f"{chosen.name}: wouldn't arrive sooner than the delayed route."], "protected": {}}
    protected: Dict[str, float] = {}
    for entry in lines:
        if new_eta <= _aware(entry["order"].required_delivery_date):
            protected[entry["order"].code] = _units(entry)
        else:
            notes.append(f"{entry['order'].code}: {chosen.name} still misses its date.")
    if not protected:
        return {"actions": [], "notes": notes, "protected": {}}
    cost = round(float(shipment.freight_cost or 0) * float(chosen.cost_multiplier), 2)
    action = {
        "type": "SHIPMENT_REROUTE", "orders": sorted(protected), "quantity": sum(protected.values()), "cost": cost, "lead": f"+{float(chosen.added_transit_hours):.0f}h on the original plan",
        "title": f"Reroute {shipment.code} via {chosen.name}", "source": shipment.origin or shipment.code, "destination": carrier.name,
        "description": f"Lowers route risk from {risk:.2f} to {risk * float(chosen.risk_multiplier):.2f}.", "route_id": str(chosen.id),
    }
    return {"actions": [action], "notes": notes, "protected": protected}


def generate(db: Session, org: Organization, disruption: Disruption, lines: List[Dict[str, Any]], policy: RecoveryPolicy = DEFAULT_POLICY) -> List[Dict[str, Any]]:
    """Returns every option with its rule results. Infeasible options stay visible, with their reasons."""
    shipment = db.get(Shipment, disruption.affected_entity_id)
    destination = db.get(Warehouse, shipment.destination_warehouse_id)
    below: List[str] = []
    flagged = []
    for entry in lines:
        probability = entry["risk"].miss_probability if entry["risk"] else None
        if probability is not None and probability < policy.action_threshold:
            below.append(f"{entry['order'].code}: {probability:.0%} chance of missing its date is under the {policy.action_threshold:.0%} action threshold, so monitor it.")
        else:
            flagged.append(entry)
    if not flagged:
        return []
    total_units = sum(_units(e) for e in flagged)
    budget = plan_budget_limit()
    built = [
        ("transfer", "Reallocate free stock", "Move free stock from the nearest warehouses, highest-risk orders first.", reallocation(db, flagged, destination, policy)),
        ("supplier", "Switch to a better supplier", "Buy from suppliers with a better delivery record, where lead time and capacity meet the deadline.", supplier_switch(db, flagged, shipment, org.slug, policy)),
        ("reroute", "Reroute the shipment", "Use a lower-risk route where it still meets the deadline.", reroute(db, flagged, shipment, policy)),
    ]
    candidates = []
    for name, title, strategy, result in built:
        cost = round(sum(a["cost"] for a in result["actions"]), 2)
        notes = list(result["notes"])
        within_budget = cost <= budget
        if not within_budget:
            notes.insert(0, f"Estimated ${cost:,.0f} is over the ${budget:,.0f} plan budget.")
        covered = sum(result["protected"].values())
        candidates.append({
            "key": f"RP-{disruption.code}-{name}"[:31], "title": title, "strategy": strategy, "actions": result["actions"], "notes": (notes + below),
            "cost": cost, "coverage": min(covered / total_units, 1.0) if total_units else 0.0, "feasible": bool(result["actions"]) and within_budget,
            # A partly covered order is still at risk, so only full coverage counts as protected.
            "orders_protected": sum(1 for e in flagged if result["protected"].get(e["order"].code, 0) >= _units(e)), "orders_total": len(flagged), "disruption": disruption.code,
        })
    candidates.sort(key=lambda c: (not c["feasible"], -c["coverage"], c["cost"]))
    for rank, candidate in enumerate(candidates):
        candidate["label"] = "Best Available" if rank == 0 and candidate["feasible"] else "Alternative"
    return candidates
