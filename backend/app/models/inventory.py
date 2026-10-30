"""Stock, reservations and customer demand (PRD modules 7, 8)."""
from sqlalchemy import CheckConstraint, Column, Computed, Date, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from .base import Base, IdMixin, JSONType, OrgMixin, Quantity, TimestampMixin, TZDateTime, VersionedMixin, in_values, non_negative, utcnow

ORDER_STATUSES = ("OPEN", "PARTIALLY_FULFILLED", "FULFILLED", "DELAYED", "CANCELLED", "CLOSED", "REINSTATED")


class Inventory(IdMixin, OrgMixin, TimestampMixin, VersionedMixin, Base):
    __tablename__ = "inventory"

    warehouse_id = Column(Uuid, ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False, index=True)
    product_id = Column(Uuid, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    on_hand_quantity = Column(Quantity, nullable=False, default=0)
    reserved_quantity = Column(Quantity, nullable=False, default=0)
    safety_stock_quantity = Column(Quantity, nullable=False, default=0)
    damaged_quantity = Column(Quantity, nullable=False, default=0)
    quarantined_quantity = Column(Quantity, nullable=False, default=0)
    # PRD 6.30, calculated by the database so no code path can store a different number.
    # It can go negative when stock falls below safety level, which is a real shortage signal.
    available_quantity = Column(
        Quantity,
        Computed("on_hand_quantity - reserved_quantity - safety_stock_quantity - damaged_quantity - quarantined_quantity", persisted=True),
    )

    __table_args__ = (
        UniqueConstraint("warehouse_id", "product_id", name="uq_inventory_position"),
        non_negative("on_hand_quantity", "reserved_quantity", "safety_stock_quantity", "damaged_quantity", "quarantined_quantity"),
        # Physical stock must cover every claim on it, or reservations were double-booked (PRD 6.32).
        CheckConstraint("on_hand_quantity >= reserved_quantity + damaged_quantity + quarantined_quantity", name="stock_covers_claims"),
    )


class InventoryLot(IdMixin, OrgMixin, TimestampMixin, Base):
    __tablename__ = "inventory_lots"

    inventory_id = Column(Uuid, ForeignKey("inventory.id", ondelete="CASCADE"), nullable=False, index=True)
    shipment_id = Column(Uuid, ForeignKey("shipments.id", ondelete="SET NULL"), index=True)
    lot_number = Column(String(64), nullable=False)
    quantity = Column(Quantity, nullable=False)
    status = Column(String(16), nullable=False, default="AVAILABLE")
    received_at = Column(TZDateTime)
    expires_at = Column(TZDateTime)

    __table_args__ = (
        UniqueConstraint("inventory_id", "lot_number", name="uq_inventory_lots_number"),
        non_negative("quantity"),
        in_values("status", ("AVAILABLE", "QUARANTINED", "DAMAGED", "DEPLETED")),
    )


class InventoryAdjustment(IdMixin, OrgMixin, Base):
    """Ledger of every stock change, for inventory history and audit (PRD 6.31, 6.32)."""
    __tablename__ = "inventory_adjustments"

    inventory_id = Column(Uuid, ForeignKey("inventory.id", ondelete="RESTRICT"), nullable=False, index=True)
    adjustment_type = Column(String(20), nullable=False)
    quantity_delta = Column(Quantity, nullable=False)
    reason = Column(Text)
    actor_id = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    reference_type = Column(String(40))
    reference_id = Column(String(64))
    occurred_at = Column(TZDateTime, nullable=False, default=utcnow, index=True)

    __table_args__ = (
        in_values("adjustment_type", ("RECEIVE", "ADJUST", "RESERVE", "RELEASE", "DAMAGE", "QUARANTINE", "TRANSFER_IN", "TRANSFER_OUT", "FULFIL")),
    )


class CustomerOrder(IdMixin, OrgMixin, TimestampMixin, VersionedMixin, Base):
    __tablename__ = "customer_orders"

    code = Column(String(64), nullable=False)
    customer_reference = Column(String(200), nullable=False)
    order_date = Column(Date, nullable=False)
    required_delivery_date = Column(TZDateTime, nullable=False, index=True)
    priority_tier = Column(Integer, nullable=False, default=3)
    status = Column(String(24), nullable=False, default="OPEN", index=True)
    delivery_destination = Column(Text)
    sla_terms = Column(JSONType)

    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_customer_orders_org_code"),
        in_values("status", ORDER_STATUSES),
        CheckConstraint("priority_tier BETWEEN 1 AND 4", name="priority_tier_range"),
    )


class OrderItem(IdMixin, OrgMixin, TimestampMixin, VersionedMixin, Base):
    """Impact is calculated per order line, so this is the unit risk attaches to (PRD 6.36)."""
    __tablename__ = "order_items"

    order_id = Column(Uuid, ForeignKey("customer_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Uuid, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    required_quantity = Column(Quantity, nullable=False)
    allocated_quantity = Column(Quantity, nullable=False, default=0)
    fulfilled_quantity = Column(Quantity, nullable=False, default=0)
    remaining_quantity = Column(Quantity, Computed("required_quantity - fulfilled_quantity", persisted=True))

    __table_args__ = (
        UniqueConstraint("order_id", "product_id", name="uq_order_items_line"),
        CheckConstraint("required_quantity > 0", name="required_quantity_positive"),
        non_negative("allocated_quantity", "fulfilled_quantity"),
        CheckConstraint("fulfilled_quantity <= required_quantity", name="not_over_fulfilled"),
    )


class Reservation(IdMixin, OrgMixin, TimestampMixin, Base):
    __tablename__ = "reservations"

    inventory_id = Column(Uuid, ForeignKey("inventory.id", ondelete="RESTRICT"), nullable=False, index=True)
    order_item_id = Column(Uuid, ForeignKey("order_items.id", ondelete="CASCADE"), index=True)
    recovery_plan_id = Column(Uuid, ForeignKey("recovery_plans.id", ondelete="SET NULL"), index=True)
    quantity = Column(Quantity, nullable=False)
    status = Column(String(16), nullable=False, default="ACTIVE", index=True)
    expires_at = Column(TZDateTime)

    __table_args__ = (
        CheckConstraint("quantity > 0", name="quantity_positive"),
        in_values("status", ("ACTIVE", "RELEASED", "CONSUMED", "EXPIRED")),
    )


class StockTransfer(IdMixin, OrgMixin, TimestampMixin, VersionedMixin, Base):
    __tablename__ = "stock_transfers"

    product_id = Column(Uuid, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    from_warehouse_id = Column(Uuid, ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False, index=True)
    to_warehouse_id = Column(Uuid, ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False, index=True)
    recovery_action_id = Column(Uuid, ForeignKey("recovery_plan_actions.id", ondelete="SET NULL"), index=True)
    quantity = Column(Quantity, nullable=False)
    status = Column(String(16), nullable=False, default="REQUESTED", index=True)
    requested_by = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    confirmed_by = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    confirmed_at = Column(TZDateTime)

    __table_args__ = (
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("from_warehouse_id <> to_warehouse_id", name="different_warehouses"),
        in_values("status", ("REQUESTED", "AUTHORIZED", "IN_TRANSIT", "COMPLETED", "CANCELLED")),
    )


class FulfilmentAllocation(IdMixin, OrgMixin, TimestampMixin, Base):
    """Points an order line at real stock or inbound supply, which is how impact gets traced (PRD 6.16)."""
    __tablename__ = "fulfilment_allocations"

    order_item_id = Column(Uuid, ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False, index=True)
    inventory_id = Column(Uuid, ForeignKey("inventory.id", ondelete="RESTRICT"), index=True)
    shipment_item_id = Column(Uuid, ForeignKey("shipment_items.id", ondelete="RESTRICT"), index=True)
    quantity = Column(Quantity, nullable=False)
    status = Column(String(16), nullable=False, default="ACTIVE", index=True)

    __table_args__ = (
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint(
            "(inventory_id IS NOT NULL AND shipment_item_id IS NULL) OR (inventory_id IS NULL AND shipment_item_id IS NOT NULL)",
            name="exactly_one_source",
        ),
        in_values("status", ("ACTIVE", "FULFILLED", "CANCELLED")),
    )
