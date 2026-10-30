"""SQLAlchemy models. The initial prototype uses SQLite; PostgreSQL can be used via DATABASE_URL."""
from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Supplier(Base):
    __tablename__ = "suppliers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    lead_time_days: Mapped[int] = mapped_column(Integer, default=7)
    capacity_units: Mapped[int] = mapped_column(Integer, default=1000)
    status: Mapped[str] = mapped_column(String(30), default="active")


class Warehouse(Base):
    __tablename__ = "warehouses"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    location: Mapped[str] = mapped_column(String(160), default="Unknown")
    capacity_units: Mapped[int] = mapped_column(Integer, default=10000)


class Inventory(Base):
    __tablename__ = "inventory"
    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    warehouse_id: Mapped[int] = mapped_column(ForeignKey("warehouses.id"), nullable=False)
    on_hand: Mapped[int] = mapped_column(Integer, default=0)
    reserved: Mapped[int] = mapped_column(Integer, default=0)
    warehouse: Mapped[Warehouse] = relationship()

    @property
    def usable(self) -> int:
        return max(0, self.on_hand - self.reserved)


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"), nullable=False)
    sku: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="open")
    supplier: Mapped[Supplier] = relationship()


class Shipment(Base):
    __tablename__ = "shipments"
    id: Mapped[int] = mapped_column(primary_key=True)
    purchase_order_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id"), nullable=False)
    carrier: Mapped[str] = mapped_column(String(100), default="Unknown carrier")
    status: Mapped[str] = mapped_column(String(30), default="in_transit")
    eta: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    event_sequence: Mapped[int] = mapped_column(Integer, default=0)
    delay_days: Mapped[int] = mapped_column(Integer, default=0)
    purchase_order: Mapped[PurchaseOrder] = relationship()


class CustomerOrder(Base):
    __tablename__ = "customer_orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    customer_name: Mapped[str] = mapped_column(String(160), nullable=False)
    priority: Mapped[str] = mapped_column(String(30), default="tier_3")
    sla_deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="open")
    lines: Mapped[list["OrderLine"]] = relationship(back_populates="order", cascade="all, delete-orphan")


class OrderLine(Base):
    __tablename__ = "order_lines"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("customer_orders.id"), nullable=False)
    sku: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    fulfilled_qty: Mapped[int] = mapped_column(Integer, default=0)
    order: Mapped[CustomerOrder] = relationship(back_populates="lines")


class DisruptionEvent(Base):
    __tablename__ = "disruption_events"
    __table_args__ = (UniqueConstraint("source", "event_id", name="uq_event_source_event_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    event_id: Mapped[str] = mapped_column(String(160), nullable=False)
    shipment_id: Mapped[int] = mapped_column(ForeignKey("shipments.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(40), nullable=False)
    delay_days: Mapped[int] = mapped_column(Integer, default=0)
    sequence_no: Mapped[int] = mapped_column(Integer, default=0)
    processing_status: Mapped[str] = mapped_column(String(30), default="received")
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class RecoveryPlan(Base):
    __tablename__ = "recovery_plans"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("customer_orders.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(60), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_by: Mapped[str] = mapped_column(String(100), nullable=False)
    approved_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[str] = mapped_column(String(100), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(60), nullable=False)
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(80), nullable=False)
    details: Mapped[str] = mapped_column(Text, default="{}")
    previous_hash: Mapped[str] = mapped_column(String(64), default="0" * 64)
    record_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
