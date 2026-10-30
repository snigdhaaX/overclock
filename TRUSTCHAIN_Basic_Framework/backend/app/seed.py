from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import Supplier, Warehouse, Inventory, PurchaseOrder, Shipment, CustomerOrder, OrderLine, DisruptionEvent


def seed_demo_data(db: Session) -> None:
    if db.scalar(select(Supplier.id).limit(1)):
        return

    suppliers = [
        Supplier(name="Atlantic Components", lead_time_days=12, capacity_units=500, status="active"),
        Supplier(name="Pacific Modules", lead_time_days=6, capacity_units=900, status="active"),
    ]
    warehouses = [
        Warehouse(name="Central Distribution Centre", location="Chennai", capacity_units=12000),
        Warehouse(name="West Regional Hub", location="Mumbai", capacity_units=8000),
    ]
    db.add_all(suppliers + warehouses)
    db.flush()

    inventory = [
        Inventory(sku="AX-400", warehouse_id=warehouses[0].id, on_hand=80, reserved=50),
        Inventory(sku="AX-400", warehouse_id=warehouses[1].id, on_hand=40, reserved=10),
        Inventory(sku="BX-210", warehouse_id=warehouses[0].id, on_hand=35, reserved=15),
    ]
    db.add_all(inventory)

    pos = [
        PurchaseOrder(supplier_id=suppliers[0].id, sku="AX-400", quantity=150, status="open"),
        PurchaseOrder(supplier_id=suppliers[1].id, sku="BX-210", quantity=100, status="open"),
    ]
    db.add_all(pos)
    db.flush()

    now = datetime.now(timezone.utc)
    shipments = [
        Shipment(purchase_order_id=pos[0].id, carrier="OceanBridge Logistics", status="delayed",
                 eta=now + timedelta(days=7), event_sequence=1, delay_days=5),
        Shipment(purchase_order_id=pos[1].id, carrier="SwiftFreight", status="in_transit",
                 eta=now + timedelta(days=3), event_sequence=0, delay_days=0),
    ]
    db.add_all(shipments)

    orders = [
        CustomerOrder(customer_name="Aurelia Motors", priority="tier_1", sla_deadline=now + timedelta(hours=30)),
        CustomerOrder(customer_name="Northstar Mobility", priority="tier_2", sla_deadline=now + timedelta(days=3)),
        CustomerOrder(customer_name="City Transit Systems", priority="tier_3", sla_deadline=now + timedelta(days=5)),
        CustomerOrder(customer_name="Meridian Robotics", priority="tier_2", sla_deadline=now + timedelta(days=4)),
    ]
    db.add_all(orders)
    db.flush()
    db.add_all([
        OrderLine(order_id=orders[0].id, sku="AX-400", quantity=70, fulfilled_qty=0),
        OrderLine(order_id=orders[1].id, sku="AX-400", quantity=50, fulfilled_qty=0),
        OrderLine(order_id=orders[2].id, sku="AX-400", quantity=40, fulfilled_qty=0),
        OrderLine(order_id=orders[3].id, sku="BX-210", quantity=60, fulfilled_qty=10),
    ])
    db.add(DisruptionEvent(
        source="demo-carrier", event_id="demo-delay-001", shipment_id=shipments[0].id,
        event_type="DELAY", delay_days=5, sequence_no=1, processing_status="processed",
        payload_json='{"demo": true}',
    ))
    db.commit()
