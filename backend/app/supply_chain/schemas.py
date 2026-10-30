import datetime
from typing import List, Optional, Generic, TypeVar, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

T = TypeVar("T")


# --- Pagination Base ---

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- 1. Supplier Schemas ---

class SupplierBase(BaseModel):
    supplier_code: str = Field(..., description="Unique supplier code within organization")
    name: str
    country: str
    city: str
    tier: str = Field("Tier 1", description="Tier 1, Tier 2, or Tier 3")
    reliability_score: float = Field(0.95, ge=0.0, le=1.0)
    risk_score: float = Field(0.05, ge=0.0, le=1.0)
    average_lead_time_days: int = Field(7, ge=1)
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    status: str = Field("ACTIVE", description="ACTIVE, INACTIVE, SUSPENDED")


class SupplierCreate(SupplierBase):
    pass


class SupplierRead(SupplierBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime


# --- 2. Order Item & Purchase Order Schemas ---

class OrderItemBase(BaseModel):
    sku: str
    product_name: str
    quantity_ordered: int = Field(..., ge=1)
    quantity_received: int = Field(0, ge=0)
    unit_price: float = Field(..., ge=0.0)
    total_price: float = Field(..., ge=0.0)


class OrderItemCreate(OrderItemBase):
    pass


class OrderItemRead(OrderItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    purchase_order_id: int
    created_at: datetime.datetime


class PurchaseOrderBase(BaseModel):
    po_number: str
    supplier_id: int
    order_date: datetime.datetime
    expected_delivery_date: datetime.datetime
    total_value: float = Field(0.0, ge=0.0)
    currency: str = "USD"
    status: str = Field("ISSUED", description="ISSUED, IN_TRANSIT, DELAYED, FULFILLED, CANCELLED")
    priority: str = Field("MEDIUM", description="LOW, MEDIUM, HIGH, CRITICAL")


class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[OrderItemCreate] = []


class PurchaseOrderRead(PurchaseOrderBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    supplier: Optional[SupplierRead] = None
    items: List[OrderItemRead] = []


# --- 3. Shipment & Checkpoint Schemas ---

class ShipmentCheckpointRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    shipment_id: int
    checkpoint_name: str
    location: str
    status: str
    timestamp: datetime.datetime
    notes: Optional[str] = None
    is_simulated: bool = True
    created_at: datetime.datetime


class ShipmentBase(BaseModel):
    tracking_number: str
    purchase_order_id: int
    carrier: str
    vessel_name: Optional[str] = None
    transport_mode: str = "SEA_FREIGHT"
    origin: str
    destination: str
    current_location: str
    status: str = "IN_TRANSIT"
    departure_date: datetime.datetime
    estimated_arrival: datetime.datetime
    actual_arrival: Optional[datetime.datetime] = None
    delay_hours: int = 0
    route_info: Optional[str] = None
    is_simulated: bool = True


class ShipmentRead(ShipmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime


class ShipmentDetailRead(ShipmentRead):
    purchase_order: Optional[PurchaseOrderRead] = None
    checkpoints: List[ShipmentCheckpointRead] = []


# --- 4. Warehouse & Inventory Schemas ---

class WarehouseBase(BaseModel):
    warehouse_code: str
    warehouse_name: str
    location: str
    country: str
    storage_capacity: int = Field(..., ge=1)
    current_utilisation: int = Field(0, ge=0)
    operational_status: str = "OPERATIONAL"


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseRead(WarehouseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime


class InventoryItemBase(BaseModel):
    warehouse_id: int
    sku: str
    product_name: str
    category: str = "ELECTRONICS"
    is_critical: bool = False
    available_quantity: int = Field(0, ge=0)
    reserved_quantity: int = Field(0, ge=0)
    safety_stock: int = Field(0, ge=0)
    reorder_threshold: int = Field(0, ge=0)
    unit_cost: float = Field(0.0, ge=0.0)
    currency: str = "USD"


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemRead(InventoryItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: str
    usable_quantity: int
    last_updated: datetime.datetime
    warehouse: Optional[WarehouseRead] = None


# --- 5. Disruption Schemas ---

class DisruptionShipmentSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    shipment_id: int
    tracking_number: str
    carrier: str
    origin: str
    destination: str
    delay_hours: int
    status: str
    impact_summary: Optional[str] = None


class DisruptionBase(BaseModel):
    incident_code: str
    category: str
    severity: str
    geographic_region: str
    description: str
    start_time: datetime.datetime
    estimated_end_time: Optional[datetime.datetime] = None
    estimated_delay_hours: int = 0
    financial_exposure: float = 0.0
    status: str = "ACTIVE"
    detection_source: str = "AI_SATELLITE_AIS_MONITORING"
    confidence_score: float = Field(0.92, ge=0.0, le=1.0)
    sla_penalty_per_day: float = 0.0
    sla_threshold_hours: int = 24
    proposed_recovery_action: Optional[str] = None
    estimated_recovery_hours: Optional[int] = None
    estimated_recovery_cost: Optional[float] = None
    is_simulated: bool = True


class DisruptionRead(DisruptionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    affected_shipments_count: int = 0


class DisruptionDetailRead(DisruptionRead):
    affected_shipments: List[DisruptionShipmentSummary] = []


# --- 6. AI Disruption Risk Schemas ---

class RiskFactorContribution(BaseModel):
    raw_score: float
    weight: float
    weighted_score: float
    metric: str


class DisruptionRiskRead(BaseModel):
    incident_code: str
    overall_risk_score: float
    risk_category: str
    weights: Dict[str, float]
    contributing_factors: Dict[str, RiskFactorContribution]
    explanation: str


# --- 7. Impact Dependency Analysis Schemas ---

class DisruptionImpactRead(BaseModel):
    disruption_id: int
    incident_code: str
    category: str
    severity: str
    geographic_region: str
    total_affected_shipments: int
    total_affected_purchase_orders: int
    total_affected_suppliers: int
    total_affected_customer_orders: int
    total_po_value_usd: float
    total_financial_exposure_usd: float
    affected_shipments: List[Dict[str, Any]]
    affected_purchase_orders: List[Dict[str, Any]]
    supplier_concentration: List[Dict[str, Any]]
    inventory_shortages: List[Dict[str, Any]]
    customer_order_impacts: List[Dict[str, Any]]
    chain_trace: List[str]


# --- 8. Recovery Recommendation Schemas ---

class RecoveryRecommendationRead(BaseModel):
    recommendation_id: str
    incident_id: int
    incident_code: str
    action_type: str
    action_mask: int
    affected_shipments: List[str]
    affected_orders: List[str]
    proposed_action: str
    origin: Optional[str] = None
    destination: Optional[str] = None
    required_quantities: Dict[str, int] = {}
    estimated_recovery_time_hours: int
    estimated_cost_usd: float
    expected_delay_reduction_hours: int
    sla_penalty_saved_usd: float
    net_financial_benefit_usd: float
    operational_risk: str
    assumptions: List[str]
    explanation: str
    feasibility_status: str
    feasibility_reason: str


# --- 9. Recovery Simulation & Optimisation Schemas ---

class SimulationCandidatePlanRead(BaseModel):
    recommendation_id: str
    action_type: str
    action_mask: int
    proposed_action: str
    feasibility_status: str
    feasibility_reason: str
    baseline_delay_hours: int
    proposed_recovery_time_hours: int
    time_saved_hours: int
    recovery_cost_usd: float
    baseline_sla_penalty_usd: float
    sla_penalty_after_recovery_usd: float
    sla_penalty_avoided_usd: float
    net_financial_benefit_usd: float
    total_recovery_impact_usd: float
    operational_risk: str
    optimization_score: float
    assumptions: List[str]
    rank: int


class SimulationEvaluationRead(BaseModel):
    simulation_id: str
    organization_id: str
    incident_code: str
    baseline_scenario: Dict[str, Any]
    candidate_plans: List[SimulationCandidatePlanRead]
    recommended_best_plan: Optional[SimulationCandidatePlanRead] = None
    timestamp: str
    simulation_hash: str


# --- 10. Recovery Plan Data Contract Schemas ---

class RecoveryPlanGenerateRequest(BaseModel):
    incident_id: int
    recommendation_id: str
    plan_id: Optional[str] = None
    event_id: Optional[str] = None
    custom_parameters: Optional[Dict[str, Any]] = None


class RecoveryPlanDataContractRead(BaseModel):
    plan_id: str
    version: int
    organization_id: str
    incident_id: str
    action_mask: int
    proposed_actions: List[str]
    affected_shipments: List[str]
    affected_purchase_orders: List[str]
    affected_customer_orders: List[str]
    estimated_recovery_time: int
    recovery_cost: float
    simulation_results: Dict[str, Any]
    risk_score: float
    assumptions: List[str]
    status: str = "DRAFT"
    canonical_plan_hash: str
    schema_version: Optional[str] = "trustchain-recovery-plan-v2"
    evidence_manifest_id: Optional[str] = None
    evidence_manifest_hash: Optional[str] = None



# ==============================================================================
# 11. External Disruption Intelligence Schemas (Phase 5)
# ==============================================================================

class IntelligenceSourceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_id: str
    source_name: str
    source_type: str
    provider_name: str
    endpoint_url: Optional[str] = None
    mode: str
    connection_status: str = "DEMO"
    is_active: bool
    requires_auth: bool
    env_key_name: Optional[str] = None
    reliability_tier: str
    default_confidence_weight: float
    rate_limit_rpm: int
    last_ingestion_at: Optional[datetime.datetime] = None
    last_attempted_at: Optional[datetime.datetime] = None
    last_successful_at: Optional[datetime.datetime] = None
    consecutive_failures: int = 0
    last_event_timestamp: Optional[datetime.datetime] = None
    events_processed_count: int = 0
    duplicates_count: int = 0
    rejected_count: int = 0
    last_error_message: Optional[str] = None


class EventEvidenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    evidence_type: str
    evidence_uri: Optional[str] = None
    summary: str
    hash_sha256: Optional[str] = None
    integrity_status: str = "VERIFIED"
    source_id: Optional[str] = None
    captured_at: datetime.datetime


class EventEvidenceManifestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    manifest_id: str
    event_id: str
    organization_id: str
    schema_version: str
    evidence_count: int
    manifest_root_hash: str
    status: str
    sealed_at: datetime.datetime
    created_at: datetime.datetime


class EventIntegrityVerificationRead(BaseModel):
    is_valid: bool
    status: str  # VALID, CONTENT_TAMPERED, EVIDENCE_MISSING, ASSOCIATION_MISMATCH, MANIFEST_MISMATCH, INSUFFICIENT_INTEGRITY_PROOF
    event_id: str
    evidence_count: int
    expected_evidence_count: Optional[int] = None
    manifest_id: Optional[str] = None
    manifest_root_hash: Optional[str] = None
    proves: Optional[str] = None
    cannot_prove: Optional[str] = None
    details: Optional[str] = None
    error: Optional[str] = None
    evidence_results: List[Dict[str, Any]] = []


class SupplierWebhookPayload(BaseModel):
    supplier_code: str
    incident_type: str
    severity: str
    affected_facility: str
    downtime_hours: int
    description: str
    geographic_region: Optional[str] = None
    affected_components: List[str] = []


class EventCorrelationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entity_type: str
    entity_id: str
    match_criteria: str
    distance_km: Optional[float] = None
    relevance_score: float
    reason_for_match: str


class EventReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reviewer_user_id: str
    reviewer_wallet: Optional[str] = None
    action_taken: str
    notes: str
    created_incident_code: Optional[str] = None
    created_at: datetime.datetime


class ExternalDisruptionEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: str
    external_event_id: str
    source_id: str
    source_type: str
    mode: str
    title: str
    description: str
    category: str
    severity: str
    geographic_region: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    affected_corridor: Optional[str] = None
    event_timestamp: datetime.datetime
    ingestion_timestamp: datetime.datetime
    source_url: Optional[str] = None
    source_reliability_score: float
    confidence_score: float
    validation_status: str
    duplicate_of_event_id: Optional[str] = None
    linked_disruption_id: Optional[int] = None
    raw_payload_preview: Optional[str] = None
    manifest_id: Optional[str] = None
    manifest_root_hash: Optional[str] = None
    evidences: List[EventEvidenceRead] = []
    correlations: List[EventCorrelationRead] = []
    reviews: List[EventReviewRead] = []


class IngestionRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_id: str
    source_id: str
    mode: str
    status: str
    events_ingested: int
    events_validated: int
    duplicates_filtered: int
    execution_duration_ms: int
    error_summary: Optional[str] = None
    started_at: datetime.datetime
    completed_at: Optional[datetime.datetime] = None


class ManualEventIngestRequest(BaseModel):
    title: str
    description: str
    category: str
    severity: str
    geographic_region: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    affected_corridor: Optional[str] = None
    source_url: Optional[str] = None
    evidence_summary: Optional[str] = None


class ReviewEventActionRequest(BaseModel):
    action: str  # CONFIRM, REJECT, LINK_DISRUPTION
    notes: str
    target_disruption_id: Optional[int] = None


