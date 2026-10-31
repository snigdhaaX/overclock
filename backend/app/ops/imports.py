"""CSV and JSON imports (PRD 6.15, 6.18-6.20): validate, preview, then persist only on confirmation.

Existing records are never overwritten. A code that already exists is reported as a duplicate.
"""
import csv
import datetime
import hashlib
import io
import json
import re
import uuid
from typing import Any, Callable, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from ..models.base import utcnow
from ..models.identity import Organization, User
from ..models.integrations import ImportJob, ImportRowError
from ..models.inventory import CustomerOrder, FulfilmentAllocation, Inventory, OrderItem
from ..models.supply_chain import Carrier, Product, PurchaseOrder, PurchaseOrderItem, Shipment, ShipmentItem, Supplier, Warehouse
from . import engine
from .engine import WorkflowError

MAX_ROWS = 5000
PREVIEW_ROWS = 20


def _text(value: Any) -> str:
    return str(value).strip()


def _number(value: Any) -> float:
    return float(_text(value).replace(",", ""))


def _date(value: Any) -> datetime.datetime:
    parsed = datetime.datetime.fromisoformat(_text(value).replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=datetime.timezone.utc)


def _priority(value: Any) -> int:
    tier = int(_number(value))
    if tier < 1 or tier > 4:
        raise ValueError("must be between 1 and 4")
    return tier


def _not_negative(value: Any) -> float:
    number = _number(value)
    if number < 0:
        raise ValueError("can't be negative")
    return number


def _positive(value: Any) -> float:
    number = _number(value)
    if number <= 0:
        raise ValueError("must be greater than zero")
    return number


# field: (required, parser, other column names people use for it)
ENTITIES: Dict[str, Dict[str, Tuple[bool, Callable[[Any], Any], Tuple[str, ...]]]] = {
    "suppliers": {
        "code": (True, _text, ("supplier_code", "supplier_id", "id")), "name": (True, _text, ("supplier_name",)),
        "country": (False, _text, ("supplier_country",)), "category": (False, _text, ()),
    },
    "products": {
        "sku": (True, _text, ("product_sku", "product_code", "code")), "name": (True, _text, ("product_name",)), "category": (False, _text, ()),
    },
    "warehouses": {
        "code": (True, _text, ("warehouse_code", "warehouse_id", "id")), "name": (True, _text, ("warehouse_name",)),
        "latitude": (False, _number, ("lat",)), "longitude": (False, _number, ("lng", "lon")),
    },
    "carriers": {
        "code": (True, _text, ("carrier_code", "carrier_id", "id")), "name": (True, _text, ("carrier_name",)), "capacity": (False, _not_negative, ()),
    },
    "inventory": {
        "warehouse_code": (True, _text, ("warehouse", "warehouse_id")), "sku": (True, _text, ("product_sku", "product_code")),
        "on_hand": (True, _not_negative, ("on_hand_quantity", "quantity", "qty")), "reserved": (False, _not_negative, ("reserved_quantity",)),
        "safety": (False, _not_negative, ("safety_stock", "safety_stock_quantity")),
    },
    "shipments": {
        "shipment_code": (True, _text, ("shipment_id", "code", "id")), "supplier_code": (True, _text, ("supplier", "supplier_id")),
        "carrier_code": (True, _text, ("carrier", "carrier_id")), "warehouse_code": (True, _text, ("destination", "destination_warehouse", "warehouse")),
        "sku": (True, _text, ("product_sku", "product_code")), "quantity": (True, _positive, ("qty", "units")), "eta": (True, _date, ("expected_arrival", "expected_arrival_at")),
        "origin": (False, _text, ()), "route_risk": (False, _not_negative, ()), "weather_severity": (False, _not_negative, ("weather",)),
        "customs_hours": (False, _not_negative, ("customs",)), "freight_cost": (False, _not_negative, ("freight",)),
    },
    "orders": {
        "order_code": (True, _text, ("order_id", "code", "id")), "customer": (True, _text, ("customer_name", "customer_reference")),
        "sku": (True, _text, ("product_sku", "product_code")), "quantity": (True, _positive, ("qty", "units", "required_quantity")),
        "required_date": (True, _date, ("delivery_date", "required_delivery_date", "due_date")), "priority": (False, _priority, ("priority_tier", "tier")),
        "shipment_code": (False, _text, ("shipment", "shipment_id")), "warehouse_code": (False, _text, ("warehouse", "warehouse_id")),
        "destination": (False, _text, ("delivery_destination",)),
    },
}


def _normalize(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.strip().lower()).strip("_")


def _parse_file(file_format: str, content: str) -> List[Dict[str, Any]]:
    if file_format == "CSV":
        reader = csv.DictReader(io.StringIO(content.lstrip("﻿")))
        if not reader.fieldnames:
            raise WorkflowError(422, "EMPTY_FILE", "This file has no header row.")
        return [{k: v for k, v in row.items() if k is not None} for row in reader]
    try:
        data = json.loads(content)
    except json.JSONDecodeError as exc:
        raise WorkflowError(422, "INVALID_JSON", f"This isn't valid JSON: {exc.msg} on line {exc.lineno}.")
    if isinstance(data, dict):
        lists = [v for v in data.values() if isinstance(v, list)]
        data = lists[0] if len(lists) == 1 else None
    if not isinstance(data, list) or not all(isinstance(r, dict) for r in data):
        raise WorkflowError(422, "INVALID_STRUCTURE", "The JSON must be a list of records, or an object holding one list.")
    return data


def _detect_mapping(entity: str, columns: List[str], override: Optional[Dict[str, str]]) -> Dict[str, str]:
    """Maps each expected field to a column in the file. An explicit mapping wins over detection."""
    normalized = {_normalize(c): c for c in columns}
    mapping: Dict[str, str] = {}
    for field, (_, _, aliases) in ENTITIES[entity].items():
        if override and override.get(field) in columns:
            mapping[field] = override[field]
            continue
        match = next((normalized[n] for n in (field, *aliases) if n in normalized), None)
        if match:
            mapping[field] = match
    return mapping


class _Validator:
    """Checks rows against the database and earlier rows in the same file."""

    def __init__(self, db: Session, org: Organization, entity: str):
        self.db, self.org, self.entity = db, org, entity
        self.seen: set = set()
        self.reserved_in_file: Dict[Any, float] = {}

    def _find(self, model, **filters):
        return self.db.query(model).filter_by(organization_id=self.org.id, **filters).first()

    def check(self, r: Dict[str, Any]) -> List[Tuple[str, str, str]]:
        return getattr(self, f"_check_{self.entity}")(r)

    def _unique(self, field: str, value: str, model, column: str) -> List[Tuple[str, str, str]]:
        if value in self.seen:
            return [(field, "DUPLICATE_IN_FILE", f"{value} appears more than once in this file.")]
        self.seen.add(value)
        if self._find(model, **{column: value}):
            return [(field, "ALREADY_EXISTS", f"{value} already exists and won't be overwritten.")]
        return []

    def _ref(self, field: str, value: str, model, column: str, label: str) -> List[Tuple[str, str, str]]:
        return [] if self._find(model, **{column: value}) else [(field, "UNKNOWN_REFERENCE", f"Unknown {label} {value}.")]

    def _check_suppliers(self, r):
        return self._unique("code", r["code"], Supplier, "code")

    def _check_products(self, r):
        return self._unique("sku", r["sku"], Product, "sku")

    def _check_warehouses(self, r):
        return self._unique("code", r["code"], Warehouse, "code")

    def _check_carriers(self, r):
        return self._unique("code", r["code"], Carrier, "code")

    def _check_inventory(self, r):
        errors = self._ref("warehouse_code", r["warehouse_code"], Warehouse, "code", "warehouse") + self._ref("sku", r["sku"], Product, "sku", "product")
        if r.get("reserved", 0) > r["on_hand"]:
            errors.append(("reserved", "INVALID_QUANTITY", "Reserved stock can't be more than stock on hand."))
        if errors:
            return errors
        key = (r["warehouse_code"], r["sku"])
        if key in self.seen:
            return [("sku", "DUPLICATE_IN_FILE", f"{r['sku']} at {r['warehouse_code']} appears more than once in this file.")]
        self.seen.add(key)
        warehouse, product = self._find(Warehouse, code=r["warehouse_code"]), self._find(Product, sku=r["sku"])
        if self.db.query(Inventory).filter_by(warehouse_id=warehouse.id, product_id=product.id).first():
            return [("sku", "ALREADY_EXISTS", f"Stock for {r['sku']} at {r['warehouse_code']} already exists and won't be overwritten.")]
        return []

    def _check_shipments(self, r):
        return (
            self._unique("shipment_code", r["shipment_code"], Shipment, "code") + self._ref("supplier_code", r["supplier_code"], Supplier, "code", "supplier")
            + self._ref("carrier_code", r["carrier_code"], Carrier, "code", "carrier") + self._ref("warehouse_code", r["warehouse_code"], Warehouse, "code", "warehouse")
            + self._ref("sku", r["sku"], Product, "sku", "product")
        )

    def _check_orders(self, r):
        errors = self._unique("order_code", r["order_code"], CustomerOrder, "code") + self._ref("sku", r["sku"], Product, "sku", "product")
        shipment_code, warehouse_code = r.get("shipment_code"), r.get("warehouse_code")
        if bool(shipment_code) == bool(warehouse_code):
            return errors + [("shipment_code", "INVALID_SOURCE", "Give either a shipment or a warehouse to supply this order, not both or neither.")]
        product = self._find(Product, sku=r["sku"])
        if shipment_code:
            shipment = self._find(Shipment, code=shipment_code)
            if not shipment:
                errors.append(("shipment_code", "UNKNOWN_REFERENCE", f"Unknown shipment {shipment_code}."))
            elif product and not self.db.query(ShipmentItem).filter_by(shipment_id=shipment.id, product_id=product.id).first():
                errors.append(("shipment_code", "INVALID_SOURCE", f"Shipment {shipment_code} doesn't carry {r['sku']}."))
            return errors
        warehouse = self._find(Warehouse, code=warehouse_code)
        if not warehouse:
            return errors + [("warehouse_code", "UNKNOWN_REFERENCE", f"Unknown warehouse {warehouse_code}.")]
        stock = self.db.query(Inventory).filter_by(warehouse_id=warehouse.id, product_id=product.id).first() if product else None
        if product and not stock:
            return errors + [("warehouse_code", "INVALID_SOURCE", f"{warehouse_code} holds no {r['sku']}.")]
        if stock:
            taken = self.reserved_in_file.get(stock.id, 0.0)
            if float(stock.available_quantity or 0) - taken < r["quantity"]:
                return errors + [("quantity", "INSUFFICIENT_STOCK", f"Only {float(stock.available_quantity or 0) - taken:g} free at {warehouse_code}.")]
            if not errors:
                self.reserved_in_file[stock.id] = taken + r["quantity"]
        return errors


def _validate(db: Session, org: Organization, entity: str, raw_rows: List[Dict[str, Any]], mapping: Dict[str, str]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    accepted, rejected = [], []
    validator = _Validator(db, org, entity)
    for number, raw in enumerate(raw_rows, start=1):
        record, errors = {}, []
        for field, (required, parser, _) in ENTITIES[entity].items():
            value = raw.get(mapping[field]) if field in mapping else None
            if value is None or _text(value) == "":
                if required:
                    errors.append((field, "MISSING_REQUIRED", f"{field} is required."))
                continue
            try:
                record[field] = parser(value)
            except (ValueError, TypeError) as exc:
                code = "INVALID_DATE" if parser is _date else "INVALID_VALUE"
                detail = "" if "could not convert" in str(exc) or "Invalid isoformat" in str(exc) else f" ({exc})"
                errors.append((field, code, f"{field} has an invalid value: {_text(value)}{detail}."))
        if not errors:
            errors = validator.check(record)
        if errors:
            rejected.extend({"row": number, "field": f, "code": c, "message": m, "record": _json_safe(raw)} for f, c, m in errors)
        else:
            accepted.append({"row": number, **_json_safe(record)})
    return accepted, rejected


def _json_safe(record: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v.isoformat() if isinstance(v, datetime.datetime) else v for k, v in record.items()}


def create_job(db: Session, org: Organization, user: User, entity: str, file_format: str, file_name: str, content: str, mode: str, override: Optional[Dict[str, str]]) -> ImportJob:
    if entity not in ENTITIES:
        raise WorkflowError(422, "UNKNOWN_ENTITY", f"Choose one of: {', '.join(ENTITIES)}.")
    raw_rows = _parse_file(file_format, content)
    if not raw_rows:
        raise WorkflowError(422, "EMPTY_FILE", "This file has no records.")
    if len(raw_rows) > MAX_ROWS:
        raise WorkflowError(422, "TOO_MANY_ROWS", f"This file has {len(raw_rows)} records. The limit is {MAX_ROWS}.")
    columns = list({key for row in raw_rows for key in row})
    mapping = _detect_mapping(entity, columns, override)
    missing = [f for f, (required, _, _) in ENTITIES[entity].items() if required and f not in mapping]
    if missing:
        raise WorkflowError(422, "MISSING_COLUMNS", f"Couldn't find these columns: {', '.join(missing)}. The file has: {', '.join(sorted(columns))}.")
    accepted, rejected = _validate(db, org, entity, raw_rows, mapping)
    job = ImportJob(
        id=uuid.uuid4(), organization_id=org.id, entity_type=entity, file_format=file_format, file_name=file_name[:255], file_hash=hashlib.sha256(content.encode()).hexdigest(),
        mode=mode, status="VALIDATED", column_mapping={"mapping": mapping, "records": raw_rows}, total_rows=len(raw_rows), accepted_rows=len(accepted),
        rejected_rows=len({e["row"] for e in rejected}), created_by=user.id,
    )
    db.add(job)
    db.flush()
    _store_errors(db, org, job, rejected)
    db.commit()
    return job


def _store_errors(db: Session, org: Organization, job: ImportJob, rejected: List[Dict[str, Any]]) -> None:
    for e in rejected:
        db.add(ImportRowError(organization_id=org.id, import_job_id=job.id, row_number=e["row"], field=e["field"], error_code=e["code"], message=e["message"], raw_record=e["record"]))


def _get_job(db: Session, org: Organization, job_id: str) -> ImportJob:
    try:
        job = db.query(ImportJob).filter_by(organization_id=org.id, id=uuid.UUID(job_id)).first()
    except ValueError:
        job = None
    if job is None:
        raise WorkflowError(404, "IMPORT_NOT_FOUND", "This import doesn't exist.")
    return job


def job_errors(db: Session, org: Organization, job_id: str) -> List[Dict[str, Any]]:
    job = _get_job(db, org, job_id)
    rows = db.query(ImportRowError).filter_by(import_job_id=job.id).order_by(ImportRowError.row_number).all()
    return [{"row": e.row_number, "field": e.field, "code": e.error_code, "message": e.message} for e in rows]


def job_view(db: Session, org: Organization, job_id: str) -> Dict[str, Any]:
    job = _get_job(db, org, job_id)
    stored = job.column_mapping or {}
    preview: List[Dict[str, Any]] = []
    if job.status == "VALIDATED":
        # Validation only reads, so the preview always reflects the database as it is now.
        preview = _validate(db, org, job.entity_type, stored.get("records", []), stored.get("mapping", {}))[0][:PREVIEW_ROWS]
    return {
        "id": str(job.id), "entityType": job.entity_type, "fileName": job.file_name, "format": job.file_format, "mode": job.mode, "status": job.status, "fileHash": job.file_hash,
        "totalRows": job.total_rows, "acceptedRows": job.accepted_rows, "rejectedRows": job.rejected_rows, "mapping": stored.get("mapping", {}), "preview": preview,
        "errors": job_errors(db, org, job_id)[:100], "createdAt": engine.aware(job.created_at).isoformat() if job.created_at else None,
        "confirmedAt": engine.aware(job.confirmed_at).isoformat() if job.confirmed_at else None,
        "canConfirm": job.status == "VALIDATED" and job.accepted_rows > 0 and (job.mode == "PARTIAL" or job.rejected_rows == 0),
    }


def list_jobs(db: Session, org: Organization) -> List[Dict[str, Any]]:
    jobs = db.query(ImportJob).filter_by(organization_id=org.id).order_by(ImportJob.created_at.desc()).limit(20).all()
    return [{"id": str(j.id), "entityType": j.entity_type, "fileName": j.file_name, "status": j.status, "acceptedRows": j.accepted_rows, "rejectedRows": j.rejected_rows, "totalRows": j.total_rows} for j in jobs]


def confirm_job(db: Session, org: Organization, user: User, job_id: str) -> ImportJob:
    job = _get_job(db, org, job_id)
    if job.status != "VALIDATED":
        raise WorkflowError(409, "IMPORT_NOT_READY", f"This import is already {job.status}.")
    stored = job.column_mapping or {}
    # The database may have changed since the preview, so everything is checked again.
    accepted, rejected = _validate(db, org, job.entity_type, stored.get("records", []), stored.get("mapping", {}))
    db.query(ImportRowError).filter_by(import_job_id=job.id).delete()
    _store_errors(db, org, job, rejected)
    job.accepted_rows = len(accepted)
    job.rejected_rows = len({e["row"] for e in rejected})
    if job.mode == "STRICT" and rejected:
        job.status = "REJECTED"
        audit_action = "IMPORT_REJECTED"
    elif not accepted:
        job.status = "REJECTED"
        audit_action = "IMPORT_REJECTED"
    else:
        for record in accepted:
            _PERSIST[job.entity_type](db, org, record)
        job.status = "COMPLETED"
        job.confirmed_at = utcnow()
        audit_action = "IMPORT_COMPLETED"
    job.column_mapping = {"mapping": stored.get("mapping", {})}
    engine.audit(db, org.id, user.id, audit_action, "import", str(job.id), {"entity": job.entity_type, "file": job.file_name, "hash": job.file_hash, "accepted": job.accepted_rows, "rejected": job.rejected_rows})
    db.commit()
    return job


def _lookup(db: Session, org: Organization, model, **filters):
    return db.query(model).filter_by(organization_id=org.id, **filters).one()


def _save_supplier(db, org, r):
    db.add(Supplier(id=uuid.uuid4(), organization_id=org.id, code=r["code"], name=r["name"], country=r.get("country"), category=r.get("category")))


def _save_product(db, org, r):
    db.add(Product(id=uuid.uuid4(), organization_id=org.id, sku=r["sku"], name=r["name"], category=r.get("category")))


def _save_warehouse(db, org, r):
    db.add(Warehouse(id=uuid.uuid4(), organization_id=org.id, code=r["code"], name=r["name"], latitude=r.get("latitude"), longitude=r.get("longitude")))


def _save_carrier(db, org, r):
    db.add(Carrier(id=uuid.uuid4(), organization_id=org.id, code=r["code"], name=r["name"], capacity=r.get("capacity")))


def _save_inventory(db, org, r):
    db.add(Inventory(
        id=uuid.uuid4(), organization_id=org.id, warehouse_id=_lookup(db, org, Warehouse, code=r["warehouse_code"]).id, product_id=_lookup(db, org, Product, sku=r["sku"]).id,
        on_hand_quantity=r["on_hand"], reserved_quantity=r.get("reserved", 0), safety_stock_quantity=r.get("safety", 0),
    ))


def _save_shipment(db, org, r):
    supplier, product = _lookup(db, org, Supplier, code=r["supplier_code"]), _lookup(db, org, Product, sku=r["sku"])
    now = utcnow()
    po = PurchaseOrder(id=uuid.uuid4(), organization_id=org.id, code=f"PO-{r['shipment_code']}"[:64], supplier_id=supplier.id, order_date=now.date(), status="CONFIRMED")
    db.add(po)
    db.flush()
    db.add(PurchaseOrderItem(organization_id=org.id, purchase_order_id=po.id, product_id=product.id, quantity=r["quantity"]))
    eta = _date(r["eta"])
    shipment = Shipment(
        id=uuid.uuid4(), organization_id=org.id, code=r["shipment_code"], purchase_order_id=po.id, supplier_id=supplier.id, carrier_id=_lookup(db, org, Carrier, code=r["carrier_code"]).id,
        destination_warehouse_id=_lookup(db, org, Warehouse, code=r["warehouse_code"]).id, origin=r.get("origin"), status="IN_TRANSIT", expected_arrival_at=eta, current_eta=eta, dispatched_at=now,
        route_risk=r.get("route_risk"), weather_severity=r.get("weather_severity"), customs_hours=r.get("customs_hours"), freight_cost=r.get("freight_cost"),
    )
    db.add(shipment)
    db.flush()
    db.add(ShipmentItem(id=uuid.uuid4(), organization_id=org.id, shipment_id=shipment.id, product_id=product.id, quantity=r["quantity"]))


def _save_order(db, org, r):
    product = _lookup(db, org, Product, sku=r["sku"])
    order = CustomerOrder(
        id=uuid.uuid4(), organization_id=org.id, code=r["order_code"], customer_reference=r["customer"], order_date=utcnow().date(), required_delivery_date=_date(r["required_date"]),
        priority_tier=r.get("priority", 3), delivery_destination=r.get("destination"),
    )
    db.add(order)
    db.flush()
    line = OrderItem(id=uuid.uuid4(), organization_id=org.id, order_id=order.id, product_id=product.id, required_quantity=r["quantity"], allocated_quantity=r["quantity"])
    db.add(line)
    db.flush()
    if r.get("shipment_code"):
        shipment = _lookup(db, org, Shipment, code=r["shipment_code"])
        item = db.query(ShipmentItem).filter_by(shipment_id=shipment.id, product_id=product.id).first()
        db.add(FulfilmentAllocation(organization_id=org.id, order_item_id=line.id, quantity=r["quantity"], shipment_item_id=item.id))
    else:
        stock = db.query(Inventory).filter_by(warehouse_id=_lookup(db, org, Warehouse, code=r["warehouse_code"]).id, product_id=product.id).first()
        stock.reserved_quantity = float(stock.reserved_quantity) + r["quantity"]
        db.add(FulfilmentAllocation(organization_id=org.id, order_item_id=line.id, quantity=r["quantity"], inventory_id=stock.id))


_PERSIST = {"suppliers": _save_supplier, "products": _save_product, "warehouses": _save_warehouse, "carriers": _save_carrier, "inventory": _save_inventory, "shipments": _save_shipment, "orders": _save_order}
