export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Supplier {
  id: number;
  supplier_code: string;
  name: string;
  category: string;
  country: string;
  city: string;
  tier: string;
  status: string;
  reliability_score: number;
  quality_rating: number;
  average_lead_time_days: number;
  risk_score: number;
  created_at: string;
}

export interface OrderItem {
  id: number;
  sku: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier_name: string;
  supplier_code: string;
  status: string;
  order_date: string;
  expected_delivery: string;
  total_amount: number;
  currency: string;
  items: OrderItem[];
}

export interface ShipmentCheckpoint {
  id: number;
  checkpoint_time: string;
  location: string;
  status: string;
  notes?: string;
}

export interface Shipment {
  id: number;
  tracking_number: string;
  carrier_code: string;
  carrier_name: string;
  transport_mode: "SEA_FREIGHT" | "AIR_FREIGHT" | "ROAD_FREIGHT" | "RAIL_FREIGHT";
  origin: string;
  destination: string;
  current_location: string;
  status: string;
  departure_time: string;
  estimated_arrival: string;
  actual_arrival?: string;
  delay_hours: number;
  purchase_order_id: number;
  po_number: string;
  supplier_name: string;
  checkpoints?: ShipmentCheckpoint[];
}

export interface Warehouse {
  id: number;
  warehouse_code: string;
  warehouse_name: string;
  warehouse_type: string;
  location: string;
  city: string;
  country: string;
  total_capacity: number;
  current_utilisation: number;
}

export interface InventoryItem {
  id: number;
  warehouse_id: number;
  warehouse_code: string;
  warehouse_name: string;
  sku: string;
  item_name: string;
  on_hand_quantity: number;
  reserved_quantity: number;
  safety_stock: number;
  available_quantity: number;
  unit_of_measure: string;
  unit_value: number;
  status: string;
}

export interface DisruptionShipmentSummary {
  shipment_id: number;
  tracking_number: string;
  transport_mode: string;
  current_location: string;
  destination: string;
  delay_hours: number;
  carrier_name: string;
}

export interface Disruption {
  id: number;
  incident_code: string;
  organization_id: string;
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  geographic_region: string;
  description: string;
  status: string;
  confidence_score: number;
  detection_source: string;
  start_time: string;
  estimated_recovery_hours: number;
  estimated_delay_hours: number;
  estimated_recovery_cost: number;
  affected_transport_routes: string[];
  potentially_affected_suppliers: string[];
  shipments?: DisruptionShipmentSummary[];
}

export interface DisruptionRiskFactor {
  score: number;
  weight: number;
  weighted_score: number;
}

export interface DisruptionRisk {
  incident_id: string;
  disruption_id: number;
  overall_risk_score: number;
  risk_category: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  contributing_factors: Record<string, number>;
  contributing_factor_weights: Record<string, number>;
  explanation: string;
  calculated_at: string;
}

export interface InventoryShortage {
  sku: string;
  affected_warehouse: string;
  transit_demand: number;
  on_hand: number;
  reserved: number;
  safety_stock: number;
  deficit: number;
}

export interface CustomerOrderImpact {
  customer_order_id: number;
  order_number: string;
  customer_name: string;
  order_date: string;
  sla_deadline: string;
  effective_delivery: string;
  delay_days: number;
  daily_penalty_rate_usd: number;
  penalty_exposure_usd: number;
  breach_sla: boolean;
  priority: string;
}

export interface DisruptionImpact {
  incident_id: string;
  disruption_id: number;
  total_affected_shipments: number;
  total_affected_purchase_orders: number;
  total_affected_suppliers: number;
  total_affected_customer_orders: number;
  total_financial_exposure_usd: number;
  inventory_shortages: InventoryShortage[];
  customer_order_impacts: CustomerOrderImpact[];
  summary: string;
}

export interface RecoveryRecommendation {
  recommendation_id: string;
  incident_id: number;
  incident_code: string;
  action_type: "SHIPMENT_REROUTE" | "WAREHOUSE_TRANSFER" | "ALTERNATIVE_PROCUREMENT" | "EXPEDITED_FREIGHT" | "ORDER_REALLOCATION";
  action_mask: number;
  affected_shipments: string[];
  affected_orders: string[];
  proposed_action: string;
  origin?: string;
  destination?: string;
  required_quantities: Record<string, number>;
  estimated_recovery_time_hours: number;
  estimated_cost_usd: number;
  expected_delay_reduction_hours: number;
  sla_penalty_saved_usd: number;
  net_financial_benefit_usd: number;
  operational_risk: "LOW" | "MEDIUM" | "HIGH";
  assumptions: string[];
  explanation: string;
  feasibility_status: "FEASIBLE" | "INFEASIBLE";
  feasibility_reason: string;
}

export interface SimulatedPlan {
  rank: number;
  recommendation_id: string;
  action_type: string;
  action_mask: number;
  proposed_action: string;
  feasibility_status: "FEASIBLE" | "INFEASIBLE";
  feasibility_reason: string;
  baseline_delay_hours: number;
  proposed_recovery_time_hours: number;
  time_saved_hours: number;
  recovery_cost_usd: number;
  baseline_sla_penalty_usd: number;
  sla_penalty_after_recovery_usd: number;
  sla_penalty_avoided_usd: number;
  net_financial_benefit_usd: number;
  total_recovery_impact_usd: number;
  operational_risk: string;
  optimization_score: number;
  assumptions: string[];
}

export interface SimulationResult {
  simulation_id: string;
  organization_id: string;
  incident_code: string;
  baseline_scenario: {
    delay_hours: number;
    sla_financial_penalty_usd: number;
    affected_shipments_count: number;
    affected_customer_orders_count: number;
  };
  candidate_plans: SimulatedPlan[];
  recommended_best_plan?: SimulatedPlan;
  simulation_hash: string;
  timestamp: string;
}

export interface RecoveryPlanDataContract {
  organization_id: string;
  incident_id: string;
  plan_id: string;
  version: number;
  action_mask: number;
  proposed_actions: string[];
  affected_shipments: string[];
  affected_purchase_orders: string[];
  affected_customer_orders: string[];
  estimated_recovery_time_hours: number;
  recovery_cost_usd: number;
  simulation_results: Record<string, any>;
  risk_score: number;
  assumptions: string[];
  created_at: string;
  status: string;
  canonical_plan_hash: string;
  simulation_hash: string;
}

export interface ExecutiveDashboardMetrics {
  activeDisruptionsCount: number;
  criticalHighIncidentsCount: number;
  overallNetworkRiskScore: number;
  affectedShipmentsCount: number;
  delayedShipmentsCount: number;
  customerOrdersAtRiskCount: number;
  estimatedSLAExposureUSD: number;
  pendingPlansCount: number;
}

// --- Phase 5: External Disruption Intelligence Types ---

export interface IntelligenceSource {
  id: number;
  source_id: string;
  source_name: string;
  source_type: string;
  provider_name: string;
  endpoint_url?: string;
  mode: "LIVE" | "DEMO" | "MANUAL";
  connection_status: "HEALTHY" | "DEGRADED" | "UNAVAILABLE" | "NOT_CONFIGURED" | "DEMO";
  is_active: boolean;
  requires_auth: boolean;
  env_key_name?: string;
  reliability_tier: string;
  default_confidence_weight: number;
  rate_limit_rpm: number;
  last_ingestion_at?: string;
  last_attempted_at?: string;
  last_successful_at?: string;
  consecutive_failures: number;
  last_event_timestamp?: string;
  events_processed_count: number;
  duplicates_count: number;
  rejected_count: number;
  last_error_message?: string;
}

export interface EventEvidence {
  id: number;
  evidence_type: string;
  evidence_uri?: string;
  summary: string;
  hash_sha256?: string;
  integrity_status?: "VERIFIED" | "TAMPERED";
  captured_at: string;
}

export interface EventIntegrityVerification {
  is_valid: boolean;
  status:
    | "VALID"
    | "CONTENT_TAMPERED"
    | "EVIDENCE_MISSING"
    | "ASSOCIATION_MISMATCH"
    | "MANIFEST_MISMATCH"
    | "INSUFFICIENT_INTEGRITY_PROOF"
    | "EVENT_NOT_FOUND"
    | string;
  event_id: string;
  evidence_count: number;
  expected_evidence_count?: number;
  manifest_id?: string;
  manifest_root_hash?: string;
  proves?: string;
  cannot_prove?: string;
  details?: string;
  error?: string;
  evidence_results: Array<{
    is_valid: boolean;
    status: string;
    evidence_id?: number;
    hash_sha256?: string;
    associated_event_id?: string;
    error?: string;
  }>;
}

export interface EventCorrelation {
  id: number;
  entity_type: "SHIPMENT" | "SUPPLIER" | "PURCHASE_ORDER" | "WAREHOUSE" | "CUSTOMER_ORDER";
  entity_id: string;
  match_criteria: string;
  distance_km?: number;
  relevance_score: number;
  reason_for_match: string;
}

export interface EventReview {
  id: number;
  reviewer_user_id: string;
  reviewer_wallet?: string;
  action_taken: string;
  notes: string;
  created_incident_code?: string;
  created_at: string;
}

export interface ExternalDisruptionEvent {
  id: number;
  event_id: string;
  external_event_id: string;
  source_id: string;
  source_type: string;
  mode: "LIVE" | "DEMO" | "MANUAL";
  title: string;
  description: string;
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  geographic_region: string;
  latitude?: number;
  longitude?: number;
  affected_corridor?: string;
  event_timestamp: string;
  ingestion_timestamp: string;
  source_url?: string;
  source_reliability_score: number;
  confidence_score: number;
  validation_status: "VALIDATED" | "PENDING_REVIEW" | "REJECTED" | "DUPLICATE" | "CONFIRMED_AS_DISRUPTION";
  duplicate_of_event_id?: string;
  linked_disruption_id?: number;
  raw_payload_preview?: string;
  manifest_id?: string;
  manifest_root_hash?: string;
  evidences?: EventEvidence[];
  correlations?: EventCorrelation[];
  reviews?: EventReview[];
}

export interface IngestionRun {
  id: number;
  run_id: string;
  source_id: string;
  mode: "LIVE" | "DEMO" | "MANUAL";
  status: "SUCCESS" | "PARTIAL" | "FAILED" | "TIMEOUT" | "RATE_LIMITED";
  events_ingested: number;
  events_validated: number;
  duplicates_filtered: number;
  execution_duration_ms: number;
  error_summary?: string;
  started_at: string;
  completed_at?: string;
}

