"""Repeatable, clearly labelled demo data (PRD 6.17). IDs match the links already in the app."""
import datetime
import uuid
from typing import Dict
from sqlalchemy.orm import Session
from ..auth import hash_password
from ..models.base import utcnow
from ..models.identity import Organization, Role, User, UserRole
from ..models.inventory import CustomerOrder, FulfilmentAllocation, Inventory, OrderItem
from ..models.supply_chain import Carrier, Product, PurchaseOrder, PurchaseOrderItem, RouteAlternative, Shipment, ShipmentItem, Supplier, SupplierProduct, Warehouse, WarehouseLane
from ..risk import service as risk_service, synthetic, training
from ..risk.models import RiskExposure

ORG_SLUG = "trustchain-demo"
DEMO_PASSWORD = "password123"
USERS = [
    ("analyst@trustchain.com", "Maya Lin", "OPERATIONS_ANALYST"),
    ("anish@company.com", "Anish Sharma", "OPERATIONS_ANALYST"),
    ("manager@trustchain.com", "David Vance", "SUPPLY_CHAIN_MANAGER"),
    ("warehouse@trustchain.com", "Rohit Verma", "WAREHOUSE_OPERATOR"),
    ("procurement@trustchain.com", "Sarah Chen", "PROCUREMENT_APPROVER"),
    ("admin@trustchain.com", "Elena Rostova", "ADMINISTRATOR"),
]
ROLE_NAMES = {
    "OPERATIONS_ANALYST": "Operations Analyst", "SUPPLY_CHAIN_MANAGER": "Supply Chain Manager", "WAREHOUSE_OPERATOR": "Warehouse Operator",
    "PROCUREMENT_APPROVER": "Procurement Approver", "ADMINISTRATOR": "Administrator",
}
SUPPLIERS = [("SUP-003", "TechParts Ltd", "Singapore"), ("SUP-008", "Tech Components Ltd", "China"), ("SUP-011", "EuroTech Sensors GmbH", "Germany"), ("SUP-014", "Nordic Supplier Group", "Sweden")]
CARRIERS = [("CAR-01", "OceanTrans"), ("CAR-02", "FastTrack Logistics"), ("CAR-03", "Lufthansa Cargo")]
WAREHOUSES = [("WH-MUM", "Mumbai Central Hub", 19.07, 72.87), ("WH-BLR", "Bangalore Plant Hub", 12.97, 77.59), ("WH-DEL", "Delhi North Hub", 28.61, 77.21)]
PRODUCTS = [("SKU-MIC-012", "PRD-012 Industrial Microcontrollers"), ("SKU-SEN-034", "PRD-034 Optical Sensors")]
# Order code, customer, units, days to deadline, tier, stock or inbound supply
ORDERS = [
    ("ORD-445", "EduTech Pvt Ltd", 280, 2, 1, "inbound"),
    ("ORD-446", "CampusMart Retail", 190, 3, 2, "inbound"),
    ("ORD-447", "LearnHub Systems", 370, 2, 2, "inbound"),
    ("ORD-448", "SkillForge Labs", 110, 4, 3, "inbound"),
    ("ORD-449", "Northwind Devices", 60, 25, 4, "inbound"),  # far deadline, a delay doesn't reach it
    ("ORD-450", "AeroSpace Telemetry", 120, 2, 1, "stock"),  # covered by stock, must stay unaffected
]


def reset(db: Session) -> None:
    bind = db.get_bind()
    org = db.query(Organization).filter_by(slug=ORG_SLUG).first()
    if org is None:
        return
    if bind.dialect.name == "postgresql":
        # Audit records are protected by triggers, so a demo reset rebuilds the demo tables as table owner.
        tables = ", ".join(t.name for t in reversed(_operational_tables()))
        db.execute(_sql(f"ALTER TABLE audit_events DISABLE TRIGGER USER"))
        db.execute(_sql(f"TRUNCATE {tables} CASCADE"))
        db.execute(_sql(f"ALTER TABLE audit_events ENABLE TRIGGER USER"))
    else:
        db.execute(_sql("DROP TRIGGER IF EXISTS audit_events_no_delete"))
        for table in reversed(_operational_tables()):
            db.execute(table.delete())
        db.execute(_sql("CREATE TRIGGER audit_events_no_delete BEFORE DELETE ON audit_events BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END"))
    db.commit()


def _sql(statement: str):
    from sqlalchemy import text
    return text(statement)


def _operational_tables():
    from ..models import Base
    skip = {"permissions", "user_wallets", "wallet_nonces", "wallet_sessions", "blockchain_transactions", "blockchain_events", "operational_plans"}
    return [t for t in Base.metadata.sorted_tables if t.name not in skip]


def seed(db: Session, train_model: bool = True) -> Dict[str, str]:
    reset(db)
    now = utcnow()
    org = Organization(id=uuid.uuid4(), name="Apex Global Logistics (demo data)", slug=ORG_SLUG, settings={"demo": True, "external_org_id": "ORG-APEX-GLOBAL", "chain_run": uuid.uuid4().hex[:6]})
    db.add(org)
    db.flush()
    oid = org.id
    roles = {code: Role(id=uuid.uuid4(), organization_id=oid, code=code, name=name) for code, name in ROLE_NAMES.items()}
    db.add_all(roles.values())
    db.flush()
    password_hash = hash_password(DEMO_PASSWORD)
    for email, name, role in USERS:
        user = User(id=uuid.uuid4(), organization_id=oid, email=email, full_name=name, password_hash=password_hash, status="ACTIVE")
        db.add(user)
        db.flush()
        db.add(UserRole(user_id=user.id, role_id=roles[role].id))

    suppliers = {c: Supplier(id=uuid.uuid4(), organization_id=oid, code=c, name=n, country=k, category="Electronics") for c, n, k in SUPPLIERS}
    carriers = {c: Carrier(id=uuid.uuid4(), organization_id=oid, code=c, name=n, capacity=5000) for c, n in CARRIERS}
    warehouses = {c: Warehouse(id=uuid.uuid4(), organization_id=oid, code=c, name=n, latitude=la, longitude=lo, receiving_capacity=5000) for c, n, la, lo in WAREHOUSES}
    products = {s: Product(id=uuid.uuid4(), organization_id=oid, sku=s, name=n) for s, n in PRODUCTS}
    db.add_all([*suppliers.values(), *carriers.values(), *warehouses.values(), *products.values()])
    db.flush()

    mic, sen = products["SKU-MIC-012"], products["SKU-SEN-034"]
    db.add_all([
        SupplierProduct(organization_id=oid, supplier_id=suppliers["SUP-003"].id, product_id=mic.id, lead_time_days=10, minimum_order_quantity=100, production_capacity=2000, unit_cost=38, is_preferred=True),
        SupplierProduct(organization_id=oid, supplier_id=suppliers["SUP-008"].id, product_id=mic.id, lead_time_days=1, minimum_order_quantity=200, production_capacity=900, unit_cost=46),
        SupplierProduct(organization_id=oid, supplier_id=suppliers["SUP-014"].id, product_id=mic.id, lead_time_days=30, minimum_order_quantity=50, production_capacity=4000, unit_cost=33),
        SupplierProduct(organization_id=oid, supplier_id=suppliers["SUP-011"].id, product_id=sen.id, lead_time_days=6, minimum_order_quantity=20, production_capacity=800, unit_cost=52, is_preferred=True),
    ])

    def stock(warehouse: str, product: Product, on_hand: float, reserved: float = 0, safety: float = 0) -> Inventory:
        item = Inventory(id=uuid.uuid4(), organization_id=oid, warehouse_id=warehouses[warehouse].id, product_id=product.id, on_hand_quantity=on_hand, reserved_quantity=reserved, safety_stock_quantity=safety)
        db.add(item)
        return item

    mumbai = stock("WH-MUM", mic, 120, reserved=120)
    stock("WH-BLR", mic, 900, reserved=250, safety=150)  # 900 on hand but only 500 can really move
    stock("WH-DEL", mic, 200, reserved=190)
    stock("WH-BLR", sen, 40)
    db.flush()

    def shipment(code: str, po_code: str, supplier: str, carrier: str, destination: str, product: Product, units: float, eta_days: float, origin: str, route: float, weather: float, customs: float, freight: float):
        po = PurchaseOrder(id=uuid.uuid4(), organization_id=oid, code=po_code, supplier_id=suppliers[supplier].id, order_date=now.date(), status="CONFIRMED")
        db.add(po)
        db.flush()
        db.add(PurchaseOrderItem(organization_id=oid, purchase_order_id=po.id, product_id=product.id, quantity=units))
        eta = now + datetime.timedelta(days=eta_days)
        record = Shipment(
            id=uuid.uuid4(), organization_id=oid, code=code, purchase_order_id=po.id, supplier_id=suppliers[supplier].id, carrier_id=carriers[carrier].id,
            destination_warehouse_id=warehouses[destination].id, origin=origin, status="IN_TRANSIT", expected_arrival_at=eta, current_eta=eta, dispatched_at=now,
            route_risk=route, weather_severity=weather, customs_hours=customs, freight_cost=freight,
        )
        db.add(record)
        db.flush()
        item = ShipmentItem(id=uuid.uuid4(), organization_id=oid, shipment_id=record.id, product_id=product.id, quantity=units)
        db.add(item)
        db.flush()
        return item

    main_inbound = shipment("SHP-101", "PO-9001", "SUP-003", "CAR-01", "WH-MUM", mic, 1000, 1.5, "Singapore", 0.8, 0.7, 30.0, 12000.0)
    sensor_inbound = shipment("SHP-125", "PO-9002", "SUP-011", "CAR-03", "WH-BLR", sen, 100, 1.0, "Frankfurt", 0.2, 0.3, 8.0, 1500.0)

    wh = {code: w.id for code, w in warehouses.items()}
    db.add_all([
        WarehouseLane(organization_id=oid, from_warehouse_id=wh["WH-BLR"], to_warehouse_id=wh["WH-MUM"], transit_hours=24, unit_cost=2),
        WarehouseLane(organization_id=oid, from_warehouse_id=wh["WH-DEL"], to_warehouse_id=wh["WH-MUM"], transit_hours=36, unit_cost=3),
        WarehouseLane(organization_id=oid, from_warehouse_id=wh["WH-MUM"], to_warehouse_id=wh["WH-BLR"], transit_hours=24, unit_cost=2),
        WarehouseLane(organization_id=oid, from_warehouse_id=wh["WH-DEL"], to_warehouse_id=wh["WH-BLR"], transit_hours=48, unit_cost=3),
        RouteAlternative(organization_id=oid, name="Northern corridor", origin="Singapore", destination_warehouse_id=wh["WH-MUM"], carrier_id=carriers["CAR-02"].id, added_transit_hours=12, cost_multiplier=0.1, risk_multiplier=0.7),
        RouteAlternative(organization_id=oid, name="Southern corridor", origin="Singapore", destination_warehouse_id=wh["WH-MUM"], carrier_id=carriers["CAR-03"].id, added_transit_hours=30, cost_multiplier=0.25, risk_multiplier=0.5),
    ])
    db.flush()

    for code, customer, units, days, tier, source in ORDERS:
        order = CustomerOrder(
            id=uuid.uuid4(), organization_id=oid, code=code, customer_reference=customer, order_date=now.date(),
            required_delivery_date=now + datetime.timedelta(days=days), priority_tier=tier, delivery_destination="Bangalore",
        )
        db.add(order)
        db.flush()
        line = OrderItem(id=uuid.uuid4(), organization_id=oid, order_id=order.id, product_id=mic.id, required_quantity=units, allocated_quantity=units)
        db.add(line)
        db.flush()
        allocation = dict(inventory_id=mumbai.id) if source == "stock" else dict(shipment_item_id=main_inbound.id)
        db.add(FulfilmentAllocation(organization_id=oid, order_item_id=line.id, quantity=units, **allocation))

    sensor_order = CustomerOrder(
        id=uuid.uuid4(), organization_id=oid, code="ORD-451", customer_reference="Frankfurt Instruments", order_date=now.date(),
        required_delivery_date=now + datetime.timedelta(days=2), priority_tier=2, delivery_destination="Bangalore",
    )
    db.add(sensor_order)
    db.flush()
    sensor_line = OrderItem(id=uuid.uuid4(), organization_id=oid, order_id=sensor_order.id, product_id=sen.id, required_quantity=60, allocated_quantity=60)
    db.add(sensor_line)
    db.flush()
    db.add(FulfilmentAllocation(organization_id=oid, order_item_id=sensor_line.id, quantity=60, shipment_item_id=sensor_inbound.id))
    db.commit()

    if train_model:
        # Supplier and carrier codes overlap with this history, so scores use real track records.
        items = synthetic.generate(rows=6000, days=730, supplier_effect=4.0, start=now - datetime.timedelta(days=760))
        risk_service.ingest_exposures(db, ORG_SLUG, [{k: v for k, v in i.items() if k not in ("missed_deadline", "outcome_at")} for i in items], data_source="synthetic")
        outcomes = {i["exposure_id"]: i for i in items}
        for record in db.query(RiskExposure).filter_by(organization_id=ORG_SLUG).all():
            item = outcomes[record.exposure_id]
            record.missed_deadline = int(item["missed_deadline"])
            record.outcome_at = item["outcome_at"]
        db.commit()
        training.retrain(db, ORG_SLUG)
    return {"organization": ORG_SLUG, "password": DEMO_PASSWORD}
