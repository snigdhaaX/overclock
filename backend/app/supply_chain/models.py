import datetime
from typing import List, Optional
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from backend.app.blockchain.database import Base


def utcnow() -> datetime.datetime:
    return datetime.datetime.utcnow()


# --- 1. Supplier Model ---

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(String(128), nullable=False, index=True)
    supplier_code = Column(String(64), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    country = Column(String(100), nullable=False)
    city = Column(String(100), nullable=False)
    tier = Column(String(32), default="Tier 1", nullable=False)  # Tier 1, Tier 2, Tier 3
    reliability_score = Column(Float, default=0.95, nullable=False)  # 0.0 - 1.0
    risk_score = Column(Float, default=0.05, nullable=False)         # 0.0 - 1.0
    average_lead_time_days = Column(Integer, default=7, nullable=False)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(64), nullable=True)
    status = Column(String(32), default="ACTIVE", nullable=False)    # ACTIVE, INACTIVE, SUSPENDED
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "supplier_code", name="uq_org_supplier_code"),
    )

    purchase_orders = relationship("PurchaseOrder", back_populates="supplier", cascade="all, delete-orphan")


# --- 2. Purchase Order & Order Item Models ---

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(String(128), nullable=False, index=True)
    po_number = Column(String(64), nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    order_date = Column(DateTime, default=utcnow, nullable=False)
    expected_delivery_date = Column(DateTime, nullable=False)
    total_value = Column(Float, default=0.0, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    status = Column(String(32), default="ISSUED", nullable=False)  # ISSUED, IN_TRANSIT, DELAYED, FULFILLED, CANCELLED
    priority = Column(String(32), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "po_number", name="uq_org_po_number"),
    )

    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship("OrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    shipments = relationship("Shipment", back_populates="purchase_order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False, index=True)
    sku = Column(String(80), nullable=False, index=True)
    product_name = Column(String(255), nullable=False)
    quantity_ordered = Column(Integer, nullable=False)
    quantity_received = Column(Integer, default=0, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    purchase_order = relationship("PurchaseOrder", back_populates="items")


# --- 3. Shipment & Checkpoint Models ---

class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(String(128), nullable=False, index=True)
    tracking_number = Column(String(64), nullable=False, unique=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False, index=True)
    carrier = Column(String(128), nullable=False)
    vessel_name = Column(String(128), nullable=True)
    transport_mode = Column(String(32), default="SEA_FREIGHT", nullable=False)  # SEA_FREIGHT, AIR_FREIGHT, ROAD_FREIGHT
    origin = Column(String(160), nullable=False)
    destination = Column(String(160), nullable=False)
    current_location = Column(String(160), nullable=False)
    status = Column(String(32), default="IN_TRANSIT", nullable=False)  # CREATED, IN_TRANSIT, DELAYED, REROUTED, DELIVERED
    departure_date = Column(DateTime, nullable=False)
    estimated_arrival = Column(DateTime, nullable=False)
    actual_arrival = Column(DateTime, nullable=True)
    delay_hours = Column(Integer, default=0, nullable=False)
    route_info = Column(Text, nullable=True)
    is_simulated = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    purchase_order = relationship("PurchaseOrder", back_populates="shipments")
    checkpoints = relationship("ShipmentCheckpoint", back_populates="shipment", cascade="all, delete-orphan", order_by="ShipmentCheckpoint.timestamp")
    disruption_associations = relationship("DisruptionShipment", back_populates="shipment", cascade="all, delete-orphan")
    customer_orders = relationship("CustomerOrder", back_populates="affected_shipment")


class ShipmentCheckpoint(Base):
    __tablename__ = "shipment_checkpoints"

    id = Column(Integer, primary_key=True, autoincrement=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=False, index=True)
    checkpoint_name = Column(String(160), nullable=False)
    location = Column(String(160), nullable=False)
    status = Column(String(32), nullable=False)  # DEPARTED, IN_TRANSIT, CONGESTED_HOLD, PASSED, ARRIVED
    timestamp = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)
    is_simulated = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    shipment = relationship("Shipment", back_populates="checkpoints")


# --- 4. Warehouse & Inventory Models ---

class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(String(128), nullable=False, index=True)
    warehouse_code = Column(String(64), nullable=False, index=True)
    warehouse_name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    country = Column(String(100), nullable=False)
    storage_capacity = Column(Integer, nullable=False)
    current_utilisation = Column(Integer, default=0, nullable=False)
    operational_status = Column(String(32), default="OPERATIONAL", nullable=False)  # OPERATIONAL, CONGESTED, MAINTENANCE
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "warehouse_code", name="uq_org_warehouse_code"),
    )

    inventory_items = relationship("InventoryItem", back_populates="warehouse", cascade="all, delete-orphan")


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(String(128), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True)
    sku = Column(String(80), nullable=False, index=True)
    product_name = Column(String(255), nullable=False)
    category = Column(String(64), default="ELECTRONICS", nullable=False)  # CRITICAL_COMPONENT, STANDARD_ASSEMBLY, RAW_MATERIAL
    is_critical = Column(Boolean, default=False, nullable=False)
    available_quantity = Column(Integer, default=0, nullable=False)
    reserved_quantity = Column(Integer, default=0, nullable=False)
    safety_stock = Column(Integer, default=0, nullable=False)
    reorder_threshold = Column(Integer, default=0, nullable=False)
    unit_cost = Column(Float, default=0.0, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    last_updated = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    warehouse = relationship("Warehouse", back_populates="inventory_items")

    @property
    def usable_quantity(self) -> int:
        return max(0, self.available_quantity - self.reserved_quantity)


# --- 5. Disruption Management & Affected Shipments ---

class Disruption(Base):
    __tablename__ = "disruptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(String(128), nullable=False, index=True)
    incident_code = Column(String(64), nullable=False, index=True)
    category = Column(String(64), nullable=False)  # PORT_CONGESTION, GEOPOLITICAL, WEATHER, LABOR_STRIKE, SUPPLIER_INSOLVENCY
    severity = Column(String(32), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    geographic_region = Column(String(128), nullable=False)
    description = Column(Text, nullable=False)
    start_time = Column(DateTime, nullable=False)
    estimated_end_time = Column(DateTime, nullable=True)
    estimated_delay_hours = Column(Integer, default=0, nullable=False)
    financial_exposure = Column(Float, default=0.0, nullable=False)
    status = Column(String(32), default="ACTIVE", nullable=False)  # ACTIVE, INVESTIGATING, MITIGATING, RESOLVED
    detection_source = Column(String(100), default="AI_SATELLITE_AIS_MONITORING", nullable=False)
    confidence_score = Column(Float, default=0.92, nullable=False)
    sla_penalty_per_day = Column(Float, default=0.0, nullable=False)
    sla_threshold_hours = Column(Integer, default=24, nullable=False)
    proposed_recovery_action = Column(String(64), nullable=True)
    estimated_recovery_hours = Column(Integer, nullable=True)
    estimated_recovery_cost = Column(Float, nullable=True)
    is_simulated = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "incident_code", name="uq_org_incident_code"),
    )

    shipment_associations = relationship("DisruptionShipment", back_populates="disruption", cascade="all, delete-orphan")


class DisruptionShipment(Base):
    __tablename__ = "disruption_shipments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    disruption_id = Column(Integer, ForeignKey("disruptions.id"), nullable=False, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=False, index=True)
    impact_summary = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("disruption_id", "shipment_id", name="uq_disruption_shipment"),
    )

    disruption = relationship("Disruption", back_populates="shipment_associations")
    shipment = relationship("Shipment", back_populates="disruption_associations")


# --- 6. Customer Order Model (For end-to-end SLA exposure mapping) ---

class CustomerOrder(Base):
    __tablename__ = "customer_orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(String(128), nullable=False, index=True)
    order_number = Column(String(64), nullable=False, index=True)
    customer_name = Column(String(160), nullable=False)
    priority = Column(String(32), default="CRITICAL", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    sla_deadline = Column(DateTime, nullable=False)
    status = Column(String(32), default="PENDING_COMPONENTS", nullable=False)
    sla_penalty_per_day = Column(Float, default=45000.0, nullable=False)
    affected_shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "order_number", name="uq_org_order_number"),
    )

    affected_shipment = relationship("Shipment", back_populates="customer_orders")
    lines = relationship("CustomerOrderLine", back_populates="order", cascade="all, delete-orphan")


class CustomerOrderLine(Base):
    __tablename__ = "customer_order_lines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_order_id = Column(Integer, ForeignKey("customer_orders.id"), nullable=False, index=True)
    sku = Column(String(80), nullable=False, index=True)
    product_name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False)
    fulfilled_qty = Column(Integer, default=0, nullable=False)
    unit_price = Column(Float, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    order = relationship("CustomerOrder", back_populates="lines")


# --- 7. Recovery Simulation Record (Persisted evaluations) ---

class RecoverySimulationRecord(Base):
    __tablename__ = "recovery_simulations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    simulation_id = Column(String(64), nullable=False, unique=True, index=True)
    organization_id = Column(String(128), nullable=False, index=True)
    incident_code = Column(String(64), nullable=False, index=True)
    candidate_plans_count = Column(Integer, default=0, nullable=False)
    baseline_delay_hours = Column(Integer, default=0, nullable=False)
    baseline_sla_penalty = Column(Float, default=0.0, nullable=False)
    simulation_hash = Column(String(66), nullable=False)
    simulation_results_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)


# ==============================================================================
# 8. EXTERNAL DISRUPTION INTELLIGENCE & INGESTION MODELS (Phase 5)
# ==============================================================================

class IntelligenceSource(Base):
    __tablename__ = "intelligence_sources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_id = Column(String(64), nullable=False, unique=True, index=True)
    source_name = Column(String(160), nullable=False)
    source_type = Column(String(64), nullable=False)  # MARITIME_AIS, PORT_STATUS, WEATHER_ALERTS, GEOPOLITICAL_NEWS, SUPPLIER_TELEMETRY, MANUAL_REPORT
    provider_name = Column(String(100), nullable=False)
    endpoint_url = Column(String(255), nullable=True)
    mode = Column(String(32), default="DEMO", nullable=False)  # LIVE, DEMO, MANUAL
    connection_status = Column(String(32), default="DEMO", nullable=False)  # HEALTHY, DEGRADED, UNAVAILABLE, NOT_CONFIGURED, DEMO
    is_active = Column(Boolean, default=True, nullable=False)
    requires_auth = Column(Boolean, default=False, nullable=False)
    env_key_name = Column(String(100), nullable=True)
    reliability_tier = Column(String(32), default="TIER_1_AUTHORITATIVE", nullable=False)  # TIER_1_AUTHORITATIVE, TIER_2_VERIFIED_FEED, TIER_3_UNVERIFIED_CROWDSOURCED
    default_confidence_weight = Column(Float, default=0.90, nullable=False)
    rate_limit_rpm = Column(Integer, default=60, nullable=False)
    last_ingestion_at = Column(DateTime, nullable=True)
    last_attempted_at = Column(DateTime, nullable=True)
    last_successful_at = Column(DateTime, nullable=True)
    consecutive_failures = Column(Integer, default=0, nullable=False)
    last_event_timestamp = Column(DateTime, nullable=True)
    events_processed_count = Column(Integer, default=0, nullable=False)
    duplicates_count = Column(Integer, default=0, nullable=False)
    rejected_count = Column(Integer, default=0, nullable=False)
    last_error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    events = relationship("ExternalDisruptionEvent", back_populates="source")


class ExternalDisruptionEvent(Base):
    __tablename__ = "external_disruption_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(64), nullable=False, unique=True, index=True)
    external_event_id = Column(String(128), nullable=False, index=True)
    source_id = Column(String(64), ForeignKey("intelligence_sources.source_id"), nullable=False, index=True)
    source_type = Column(String(64), nullable=False)
    mode = Column(String(32), default="DEMO", nullable=False)  # LIVE, DEMO, MANUAL
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(64), nullable=False)  # PORT_CONGESTION, GEOPOLITICAL, WEATHER, LABOR_STRIKE, SUPPLIER_INSOLVENCY, MARITIME_INCIDENT
    severity = Column(String(32), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    geographic_region = Column(String(160), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    affected_corridor = Column(String(160), nullable=True)
    event_timestamp = Column(DateTime, nullable=False)
    ingestion_timestamp = Column(DateTime, default=utcnow, nullable=False)
    source_url = Column(String(512), nullable=True)
    source_reliability_score = Column(Float, default=0.90, nullable=False)
    confidence_score = Column(Float, default=0.85, nullable=False)
    validation_status = Column(String(32), default="PENDING_REVIEW", nullable=False)  # VALIDATED, PENDING_REVIEW, REJECTED, DUPLICATE, MERGED, CONFIRMED_AS_DISRUPTION
    duplicate_of_event_id = Column(String(64), nullable=True, index=True)
    linked_disruption_id = Column(Integer, ForeignKey("disruptions.id"), nullable=True, index=True)
    raw_payload_preview = Column(Text, nullable=True)
    manifest_id = Column(String(64), nullable=True, index=True)
    manifest_root_hash = Column(String(66), nullable=True, index=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    source = relationship("IntelligenceSource", back_populates="events")
    linked_disruption = relationship("Disruption")
    evidences = relationship("EventEvidence", back_populates="event", cascade="all, delete-orphan")
    correlations = relationship("EventCorrelation", back_populates="event", cascade="all, delete-orphan")
    reviews = relationship("EventReview", back_populates="event", cascade="all, delete-orphan")
    manifest = relationship("EventEvidenceManifest", back_populates="event", uselist=False, cascade="all, delete-orphan")


class EventEvidenceManifest(Base):
    __tablename__ = "event_evidence_manifests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    manifest_id = Column(String(64), nullable=False, unique=True, index=True)
    event_id = Column(String(64), ForeignKey("external_disruption_events.event_id"), nullable=False, index=True)
    organization_id = Column(String(128), nullable=False, index=True)
    schema_version = Column(String(64), default="trustchain-evidence-manifest-v1", nullable=False)
    evidence_count = Column(Integer, nullable=False)
    manifest_canonical_json = Column(Text, nullable=False)
    manifest_root_hash = Column(String(66), nullable=False, index=True)
    status = Column(String(32), default="SEALED", nullable=False)  # SEALED, SUPERSEDED, REVOKED
    sealed_at = Column(DateTime, default=utcnow, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    event = relationship("ExternalDisruptionEvent", back_populates="manifest")


class EventEvidence(Base):
    __tablename__ = "event_evidences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(64), ForeignKey("external_disruption_events.event_id"), nullable=False, index=True)
    evidence_type = Column(String(64), nullable=False)  # AIS_TRACK, NOTAM_BULLETIN, METAR_WEATHER, SATELLITE_IMAGERY, NEWS_ARTICLE, SUPPLIER_NOTICE
    evidence_uri = Column(String(512), nullable=True)
    hash_sha256 = Column(String(66), nullable=True)
    summary = Column(Text, nullable=False)
    canonical_payload_json = Column(Text, nullable=True)
    source_id = Column(String(64), nullable=True)
    source_event_timestamp = Column(DateTime, nullable=True)
    ingestion_timestamp = Column(DateTime, default=utcnow, nullable=False)
    integrity_status = Column(String(32), default="VERIFIED", nullable=False)  # VERIFIED, TAMPERED
    captured_at = Column(DateTime, default=utcnow, nullable=False)

    event = relationship("ExternalDisruptionEvent", back_populates="evidences")


class EventCorrelation(Base):
    __tablename__ = "event_correlations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(64), ForeignKey("external_disruption_events.event_id"), nullable=False, index=True)
    organization_id = Column(String(128), nullable=False, index=True)
    entity_type = Column(String(64), nullable=False)  # SHIPMENT, SUPPLIER, PURCHASE_ORDER, WAREHOUSE, CUSTOMER_ORDER
    entity_id = Column(String(64), nullable=False, index=True)
    match_criteria = Column(String(64), nullable=False)  # CORRIDOR_MATCH, GEOGRAPHIC_PROXIMITY, ORIGIN_PORT, DESTINATION_PORT, SUPPLIER_LOCATION
    distance_km = Column(Float, nullable=True)
    relevance_score = Column(Float, nullable=False)  # 0.0 - 1.0
    reason_for_match = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    event = relationship("ExternalDisruptionEvent", back_populates="correlations")


class EventReview(Base):
    __tablename__ = "event_reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(64), ForeignKey("external_disruption_events.event_id"), nullable=False, index=True)
    organization_id = Column(String(128), nullable=False, index=True)
    reviewer_user_id = Column(String(128), nullable=False)
    reviewer_wallet = Column(String(42), nullable=True)
    action_taken = Column(String(64), nullable=False)  # CONFIRM_AS_DISRUPTION, REJECT_FALSE_ALARM, MERGE_DUPLICATE, LINK_EXISTING_DISRUPTION, REQUEST_FURTHER_INTEL
    notes = Column(Text, nullable=False)
    created_incident_code = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    event = relationship("ExternalDisruptionEvent", back_populates="reviews")


class IngestionRun(Base):
    __tablename__ = "ingestion_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(64), nullable=False, unique=True, index=True)
    source_id = Column(String(64), ForeignKey("intelligence_sources.source_id"), nullable=False, index=True)
    mode = Column(String(32), default="DEMO", nullable=False)
    status = Column(String(32), default="SUCCESS", nullable=False)  # SUCCESS, PARTIAL, FAILED, TIMEOUT, RATE_LIMITED
    events_ingested = Column(Integer, default=0, nullable=False)
    events_validated = Column(Integer, default=0, nullable=False)
    duplicates_filtered = Column(Integer, default=0, nullable=False)
    execution_duration_ms = Column(Integer, default=0, nullable=False)
    error_summary = Column(Text, nullable=True)
    started_at = Column(DateTime, default=utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)


