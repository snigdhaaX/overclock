"""Suppliers, products, shipments and their event history (PRD modules 3, 5, 6, 9)."""
from sqlalchemy import BigInteger, Boolean, CheckConstraint, Column, Date, Float, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from .base import Base, IdMixin, JSONType, Money, OrgMixin, Quantity, TimestampMixin, TZDateTime, VersionedMixin, in_values, non_negative, utcnow

SHIPMENT_STATUSES = (
    "CREATED", "CONFIRMED", "READY_FOR_DISPATCH", "IN_TRANSIT", "DELAYED", "AT_DESTINATION",
    "RECEIVING", "RECEIVED", "PARTIALLY_RECEIVED", "CANCELLED", "EXCEPTION",
)
CARRIER_EVENT_TYPES = (
    "SHIPMENT_DISPATCHED", "SHIPMENT_IN_TRANSIT", "SHIPMENT_DELAYED", "ETA_UPDATED",
    "SHIPMENT_ARRIVED", "SHIPMENT_EXCEPTION", "SHIPMENT_CANCELLED",
)
EVENT_PROCESSING_STATUSES = ("RECEIVED", "PROCESSED", "DUPLICATE", "OUT_OF_ORDER", "CONFLICT", "FAILED")
ENTITY_STATUSES = ("ACTIVE", "INACTIVE")


class Supplier(IdMixin, OrgMixin, TimestampMixin, VersionedMixin, Base):
    __tablename__ = "suppliers"

    code = Column(String(64), nullable=False)
    name = Column(String(200), nullable=False)
    category = Column(String(120))
    contact = Column(JSONType)
    address = Column(Text)
    country = Column(String(120))
    contract_info = Column(JSONType)
    status = Column(String(16), nullable=False, default="ACTIVE")

    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_suppliers_org_code"),
        in_values("status", ENTITY_STATUSES),
    )


class Product(IdMixin, OrgMixin, TimestampMixin, Base):
    __tablename__ = "products"

    sku = Column(String(64), nullable=False)
    name = Column(String(200), nullable=False)
    category = Column(String(120))
    unit_of_measure = Column(String(16), nullable=False, default="EA")
    status = Column(String(16), nullable=False, default="ACTIVE")

    __table_args__ = (
        UniqueConstraint("organization_id", "sku", name="uq_products_org_sku"),
        in_values("status", ENTITY_STATUSES),
    )


class SupplierProduct(IdMixin, OrgMixin, Base):
    """A product can have several suppliers, each with its own terms (PRD 6.14, 6.21)."""
    __tablename__ = "supplier_products"

    supplier_id = Column(Uuid, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Uuid, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_time_days = Column(Integer, nullable=False)
    minimum_order_quantity = Column(Quantity, nullable=False, default=0)
    production_capacity = Column(Quantity)
    unit_cost = Column(Money)
    is_preferred = Column(Boolean, nullable=False, default=False)

    __table_args__ = (
        UniqueConstraint("supplier_id", "product_id", name="uq_supplier_products_pair"),
        non_negative("lead_time_days", "minimum_order_quantity"),
    )


class Warehouse(IdMixin, OrgMixin, TimestampMixin, Base):
    __tablename__ = "warehouses"

    code = Column(String(64), nullable=False)
    name = Column(String(200), nullable=False)
    address = Column(Text)
    latitude = Column(Float)
    longitude = Column(Float)
    operating_calendar = Column(JSONType)
    receiving_capacity = Column(Quantity)
    dispatch_capacity = Column(Quantity)
    status = Column(String(16), nullable=False, default="ACTIVE")

    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_warehouses_org_code"),
        in_values("status", ("ACTIVE", "INACTIVE", "CLOSED")),
    )


class Carrier(IdMixin, OrgMixin, TimestampMixin, Base):
    __tablename__ = "carriers"

    code = Column(String(64), nullable=False)
    name = Column(String(200), nullable=False)
    capacity = Column(Quantity)
    status = Column(String(16), nullable=False, default="ACTIVE")

    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_carriers_org_code"),
        in_values("status", ENTITY_STATUSES),
    )


class PurchaseOrder(IdMixin, OrgMixin, TimestampMixin, VersionedMixin, Base):
    __tablename__ = "purchase_orders"

    code = Column(String(64), nullable=False)
    supplier_id = Column(Uuid, ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="OPEN")
    order_date = Column(Date, nullable=False)
    committed_date = Column(Date)
    expected_date = Column(Date)
    total_cost = Column(Money)
    currency = Column(String(3), nullable=False, default="USD")

    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_purchase_orders_org_code"),
        in_values("status", ("OPEN", "CONFIRMED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED")),
    )


class PurchaseOrderItem(IdMixin, OrgMixin, Base):
    __tablename__ = "purchase_order_items"

    purchase_order_id = Column(Uuid, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Uuid, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity = Column(Quantity, nullable=False)
    unit_cost = Column(Money)

    __table_args__ = (
        UniqueConstraint("purchase_order_id", "product_id", name="uq_purchase_order_items_line"),
        CheckConstraint("quantity > 0", name="quantity_positive"),
    )


class Shipment(IdMixin, OrgMixin, TimestampMixin, VersionedMixin, Base):
    __tablename__ = "shipments"

    code = Column(String(64), nullable=False)
    purchase_order_id = Column(Uuid, ForeignKey("purchase_orders.id", ondelete="RESTRICT"), nullable=False, index=True)
    supplier_id = Column(Uuid, ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False, index=True)
    carrier_id = Column(Uuid, ForeignKey("carriers.id", ondelete="RESTRICT"), nullable=False, index=True)
    destination_warehouse_id = Column(Uuid, ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False, index=True)
    origin = Column(String(200))
    status = Column(String(24), nullable=False, default="CREATED", index=True)
    tracking_reference = Column(String(120))
    route_risk = Column(Float)
    weather_severity = Column(Float)
    customs_hours = Column(Float)
    freight_cost = Column(Money)
    dispatched_at = Column(TZDateTime)
    expected_arrival_at = Column(TZDateTime)
    current_eta = Column(TZDateTime)
    # Arrival is not availability: goods only become usable after each step below (PRD 6.27).
    physical_arrival_at = Column(TZDateTime)
    receiving_completed_at = Column(TZDateTime)
    quality_completed_at = Column(TZDateTime)
    usable_at = Column(TZDateTime)
    fulfilment_available_at = Column(TZDateTime)

    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_shipments_org_code"),
        in_values("status", SHIPMENT_STATUSES),
    )


class ShipmentItem(IdMixin, OrgMixin, Base):
    __tablename__ = "shipment_items"

    shipment_id = Column(Uuid, ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Uuid, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity = Column(Quantity, nullable=False)
    received_quantity = Column(Quantity, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("shipment_id", "product_id", name="uq_shipment_items_line"),
        CheckConstraint("quantity > 0", name="quantity_positive"),
        non_negative("received_quantity"),
    )


class RouteAlternative(IdMixin, OrgMixin, TimestampMixin, Base):
    """A known way to move goods, compared with the original plan. Replaces the notebook's generated routes."""
    __tablename__ = "route_alternatives"

    name = Column(String(120), nullable=False)
    origin = Column(String(200), nullable=False)
    destination_warehouse_id = Column(Uuid, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    carrier_id = Column(Uuid, ForeignKey("carriers.id", ondelete="RESTRICT"), nullable=False, index=True)
    added_transit_hours = Column(Float, nullable=False)
    cost_multiplier = Column(Float, nullable=False)
    risk_multiplier = Column(Float, nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "name", "origin", "destination_warehouse_id", name="uq_route_alternatives_route"),
        non_negative("added_transit_hours", "cost_multiplier", "risk_multiplier"),
    )


class WarehouseLane(IdMixin, OrgMixin, TimestampMixin, Base):
    """Time and cost between two warehouses. Replaces the notebook's generated distances."""
    __tablename__ = "warehouse_lanes"

    from_warehouse_id = Column(Uuid, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    to_warehouse_id = Column(Uuid, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    transit_hours = Column(Float, nullable=False)
    unit_cost = Column(Money, nullable=False)

    __table_args__ = (
        UniqueConstraint("from_warehouse_id", "to_warehouse_id", name="uq_warehouse_lanes_pair"),
        CheckConstraint("from_warehouse_id <> to_warehouse_id", name="different_warehouses"),
        non_negative("transit_hours", "unit_cost"),
    )


class _OperationalEvent(IdMixin, OrgMixin):
    """Durable event record. It is stored before processing, so a failure can be retried (PRD 6.42, 6.46)."""

    source = Column(String(120), nullable=False)
    event_id = Column(String(128), nullable=False)
    event_type = Column(String(40), nullable=False, index=True)
    source_sequence = Column(BigInteger)
    event_timestamp = Column(TZDateTime, nullable=False)
    received_at = Column(TZDateTime, nullable=False, default=utcnow)
    payload = Column(JSONType, nullable=False)
    processing_status = Column(String(16), nullable=False, default="RECEIVED", index=True)
    processed_at = Column(TZDateTime)
    processing_error = Column(Text)
    retry_count = Column(Integer, nullable=False, default=0)


class CarrierEvent(_OperationalEvent, Base):
    __tablename__ = "carrier_events"

    shipment_id = Column(Uuid, ForeignKey("shipments.id", ondelete="RESTRICT"), index=True)

    __table_args__ = (
        # Duplicate protection (PRD 6.43), scoped by organization so tenants cannot block each other.
        UniqueConstraint("organization_id", "source", "event_id", name="uq_carrier_events_source_event"),
        in_values("event_type", CARRIER_EVENT_TYPES),
        in_values("processing_status", EVENT_PROCESSING_STATUSES),
    )


class SupplierEvent(_OperationalEvent, Base):
    __tablename__ = "supplier_events"

    supplier_id = Column(Uuid, ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False, index=True)
    purchase_order_id = Column(Uuid, ForeignKey("purchase_orders.id", ondelete="RESTRICT"), index=True)

    __table_args__ = (
        UniqueConstraint("organization_id", "source", "event_id", name="uq_supplier_events_source_event"),
        in_values("processing_status", EVENT_PROCESSING_STATUSES),
    )
