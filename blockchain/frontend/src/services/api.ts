import {
  NetworkInfo,
  LinkedWalletResponse,
  NonceResponse,
  OnChainPlanVersion,
  ExecutionEligibility,
  PlanDecision,
  VerificationReport,
  TrackedTransaction,
  IndexedEvent,
  OnChainWalletInfo,
} from "../types/blockchain";

import {
  Supplier,
  PurchaseOrder,
  Shipment,
  Warehouse,
  InventoryItem,
  Disruption,
  DisruptionRisk,
  DisruptionImpact,
  RecoveryRecommendation,
  SimulationResult,
  RecoveryPlanDataContract,
  PaginatedResponse,
  IntelligenceSource,
  ExternalDisruptionEvent,
  IngestionRun,
  EventIntegrityVerification,
} from "../types/supplyChain";

const API_BASE = "";

// Authenticated session context headers with Bearer token
export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("trustchain_session_token");
  const userId = localStorage.getItem("trustchain_user_id") || "user:ops-analyst-88";
  const orgId = localStorage.getItem("trustchain_org_id") || "ORG-APEX-GLOBAL";
  const userRoles = localStorage.getItem("trustchain_user_roles") || "operations_analyst";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-User-Id": userId,
    "X-Organization-Id": orgId,
    "X-User-Roles": userRoles,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
};

export const api = {
  // --- Network & Status ---
  async getNetworkInfo(): Promise<NetworkInfo> {
    const res = await fetch(`${API_BASE}/blockchain/network`);
    if (!res.ok) throw new Error("Failed to fetch network information.");
    return res.json();
  },

  // --- Wallet Nonces & Session Linking ---
  async requestWalletNonce(): Promise<NonceResponse> {
    const res = await fetch(`${API_BASE}/blockchain/wallet/nonce`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to request wallet nonce.");
    }
    return res.json();
  },

  async verifyWalletSignature(
    walletAddress: string,
    nonce: string,
    signature: string
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/blockchain/wallet/verify`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        wallet_address: walletAddress,
        nonce,
        signature,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to verify signature.");
    }
    const data = await res.json();
    if (data.session_token) {
      localStorage.setItem("trustchain_session_token", data.session_token);
      localStorage.setItem("trustchain_wallet_address", data.wallet_address);
      localStorage.setItem("trustchain_org_id", data.organization_id);
      localStorage.setItem("trustchain_user_id", data.user_id);
    }
    return data;
  },

  async getLinkedWallet(): Promise<LinkedWalletResponse> {
    const res = await fetch(`${API_BASE}/blockchain/wallet/linked`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to retrieve linked wallet.");
    return res.json();
  },

  async unlinkWallet(walletAddress: string): Promise<any> {
    const res = await fetch(
      `${API_BASE}/blockchain/wallet/unlink?wallet_address=${encodeURIComponent(
        walletAddress
      )}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) throw new Error("Failed to unlink wallet.");
    localStorage.removeItem("trustchain_session_token");
    return res.json();
  },

  async getWalletAuthorization(walletAddress: string): Promise<OnChainWalletInfo> {
    const res = await fetch(
      `${API_BASE}/blockchain/wallet/${encodeURIComponent(walletAddress)}/authorization`
    );
    if (!res.ok) throw new Error("Failed to fetch on-chain authorization.");
    return res.json();
  },

  // --- Canonical Hashing ---
  async generateCanonicalHash(planData: Record<string, any>): Promise<{
    canonical_json: string;
    sha256_hash: string;
    schema_version: string;
  }> {
    const res = await fetch(`${API_BASE}/blockchain/hash/generate`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ plan_data: planData }),
    });
    if (!res.ok) throw new Error("Failed to generate plan hash.");
    return res.json();
  },

  async verifyPlanHash(
    planData: Record<string, any>,
    expectedHash: string
  ): Promise<{ valid: boolean; computed_hash: string; expected_hash: string }> {
    const res = await fetch(`${API_BASE}/blockchain/hash/verify`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ plan_data: planData, expected_hash: expectedHash }),
    });
    if (!res.ok) throw new Error("Failed to verify plan hash.");
    return res.json();
  },

  // --- Plan State & Governance ---
  async getPlanVersion(planId: string, version: number): Promise<OnChainPlanVersion> {
    const res = await fetch(
      `${API_BASE}/blockchain/plan/${encodeURIComponent(planId)}/${version}`
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Plan version not found.");
    }
    return res.json();
  },

  async getPlanEligibility(planId: string, version: number): Promise<ExecutionEligibility> {
    const res = await fetch(
      `${API_BASE}/blockchain/plan/${encodeURIComponent(planId)}/${version}/eligibility`
    );
    if (!res.ok) throw new Error("Failed to query execution eligibility.");
    return res.json();
  },

  async getPlanDecisions(
    planId: string,
    version: number
  ): Promise<{ plan_id: string; version: number; decision_count: number; decisions: PlanDecision[] }> {
    const res = await fetch(
      `${API_BASE}/blockchain/plan/${encodeURIComponent(planId)}/${version}/decisions`
    );
    if (!res.ok) throw new Error("Failed to query plan decisions.");
    return res.json();
  },

  // --- Transactions & Events ---
  async registerTransaction(data: {
    tx_hash: string;
    chain_id?: number;
    function_name?: string;
    plan_id?: string;
    plan_version?: number;
  }): Promise<TrackedTransaction> {
    const res = await fetch(`${API_BASE}/blockchain/transactions/register`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to register transaction.");
    return res.json();
  },

  async getTransaction(txHash: string): Promise<TrackedTransaction> {
    const res = await fetch(
      `${API_BASE}/blockchain/transactions/${encodeURIComponent(txHash)}`
    );
    if (!res.ok) throw new Error("Failed to fetch transaction status.");
    return res.json();
  },

  async reconcileTransaction(txHash: string): Promise<TrackedTransaction> {
    const res = await fetch(
      `${API_BASE}/blockchain/transactions/${encodeURIComponent(txHash)}/reconcile`,
      {
        method: "POST",
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) throw new Error("Failed to reconcile transaction.");
    return res.json();
  },

  async getEvents(planId: string, version?: number): Promise<IndexedEvent[]> {
    const url = version
      ? `${API_BASE}/blockchain/events?plan_id=${encodeURIComponent(planId)}&version=${version}`
      : `${API_BASE}/blockchain/events?plan_id=${encodeURIComponent(planId)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch indexed events.");
    return res.json();
  },

  // --- Verification ---
  async verifyPlanIntegrity(planId: string, version: number): Promise<VerificationReport> {
    const res = await fetch(
      `${API_BASE}/blockchain/verification/${encodeURIComponent(planId)}/${version}`
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Plan verification failed.");
    }
    return res.json();
  },

  async saveOperationalPlan(
    planId: string,
    version: number,
    planData: Record<string, any>
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/blockchain/plans/operational`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        plan_id: planId,
        version,
        plan_data: planData,
      }),
    });
    if (!res.ok) throw new Error("Failed to store operational plan.");
    return res.json();
  },

  // =========================================================================
  // SUPPLY CHAIN CORE & INTELLIGENCE APIs
  // =========================================================================

  async getActiveDisruptions(): Promise<Disruption[]> {
    const res = await fetch(`${API_BASE}/api/v1/disruptions/active`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch active disruptions.");
    return res.json();
  },

  async getDisruptionById(disruptionId: string | number): Promise<Disruption> {
    const res = await fetch(`${API_BASE}/api/v1/disruptions/${encodeURIComponent(disruptionId)}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch disruption details.");
    return res.json();
  },

  async getDisruptionRisk(disruptionId: string | number): Promise<DisruptionRisk> {
    const res = await fetch(
      `${API_BASE}/api/v1/disruptions/${encodeURIComponent(disruptionId)}/risk`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) throw new Error("Failed to calculate disruption risk.");
    return res.json();
  },

  async getDisruptionImpact(disruptionId: string | number): Promise<DisruptionImpact> {
    const res = await fetch(
      `${API_BASE}/api/v1/disruptions/${encodeURIComponent(disruptionId)}/impact`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) throw new Error("Failed to retrieve disruption impact.");
    return res.json();
  },

  async simulateDisruptionImpact(disruptionId: string | number): Promise<DisruptionImpact> {
    const res = await fetch(
      `${API_BASE}/api/v1/disruptions/${encodeURIComponent(disruptionId)}/simulate-impact`,
      {
        method: "POST",
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) throw new Error("Failed to simulate disruption impact.");
    return res.json();
  },

  async getRecoveryRecommendations(
    disruptionId: string | number
  ): Promise<RecoveryRecommendation[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/disruptions/${encodeURIComponent(disruptionId)}/recommend-actions`,
      {
        method: "POST",
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) throw new Error("Failed to generate recovery recommendations.");
    return res.json();
  },

  async evaluateSimulation(payload: {
    disruption_id?: number;
    incident_code?: string;
    candidate_recommendations?: any[];
  }): Promise<SimulationResult> {
    const res = await fetch(`${API_BASE}/api/v1/simulation/evaluate`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to evaluate recovery simulation.");
    return res.json();
  },

  async getSimulationById(simulationId: string): Promise<SimulationResult> {
    const res = await fetch(
      `${API_BASE}/api/v1/simulation/${encodeURIComponent(simulationId)}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) throw new Error("Failed to retrieve simulation by ID.");
    return res.json();
  },

  async generateRecoveryPlan(payload: {
    incident_id: string;
    action_type: string;
    proposed_actions?: string[];
    affected_shipments?: string[];
    affected_orders?: string[];
    estimated_recovery_time_hours?: number;
    recovery_cost_usd?: number;
    simulation_results?: Record<string, any>;
    assumptions?: string[];
  }): Promise<RecoveryPlanDataContract> {
    const res = await fetch(`${API_BASE}/api/v1/recovery-plans/generate`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to generate recovery plan.");
    }
    return res.json();
  },

  async getRecoveryPlans(
    page = 1,
    pageSize = 20,
    statusFilter?: string
  ): Promise<PaginatedResponse<RecoveryPlanDataContract>> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (statusFilter) params.append("status", statusFilter);
    const res = await fetch(`${API_BASE}/api/v1/recovery-plans?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch recovery plans.");
    return res.json();
  },

  async getRecoveryPlanById(planId: string): Promise<RecoveryPlanDataContract> {
    const res = await fetch(
      `${API_BASE}/api/v1/recovery-plans/${encodeURIComponent(planId)}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) throw new Error("Failed to retrieve recovery plan.");
    return res.json();
  },

  async getSuppliers(
    page = 1,
    pageSize = 20,
    search?: string,
    tier?: string
  ): Promise<PaginatedResponse<Supplier>> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (search) params.append("search", search);
    if (tier) params.append("tier", tier);
    const res = await fetch(`${API_BASE}/api/v1/supply-chain/suppliers?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch suppliers.");
    return res.json();
  },

  async getPurchaseOrders(
    page = 1,
    pageSize = 20,
    statusFilter?: string
  ): Promise<PaginatedResponse<PurchaseOrder>> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (statusFilter) params.append("status", statusFilter);
    const res = await fetch(`${API_BASE}/api/v1/supply-chain/orders?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch purchase orders.");
    return res.json();
  },

  async getShipments(
    page = 1,
    pageSize = 20,
    statusFilter?: string,
    transportMode?: string
  ): Promise<PaginatedResponse<Shipment>> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (statusFilter) params.append("status", statusFilter);
    if (transportMode) params.append("transport_mode", transportMode);
    const res = await fetch(`${API_BASE}/api/v1/supply-chain/shipments?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch shipments.");
    return res.json();
  },

  async getShipmentById(shipmentId: string | number): Promise<Shipment> {
    const res = await fetch(
      `${API_BASE}/api/v1/supply-chain/shipments/${encodeURIComponent(shipmentId)}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) throw new Error("Failed to fetch shipment details.");
    return res.json();
  },

  async getWarehouses(page = 1, pageSize = 20): Promise<PaginatedResponse<Warehouse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    const res = await fetch(`${API_BASE}/api/v1/supply-chain/warehouses?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch warehouses.");
    return res.json();
  },

  async getInventory(
    page = 1,
    pageSize = 20,
    warehouseId?: number,
    sku?: string
  ): Promise<PaginatedResponse<InventoryItem>> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (warehouseId) params.append("warehouse_id", warehouseId.toString());
    if (sku) params.append("sku", sku);
    const res = await fetch(`${API_BASE}/api/v1/supply-chain/inventory?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch inventory items.");
    return res.json();
  },

  // --- Phase 5: External Disruption Intelligence & Ingestion ---
  async getIntelligenceSources(): Promise<IntelligenceSource[]> {
    const res = await fetch(`${API_BASE}/api/v1/intelligence/sources`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch intelligence sources.");
    return res.json();
  },

  async triggerIngestionRun(sourceId?: string, forceDemo = false): Promise<any> {
    const params = new URLSearchParams();
    if (sourceId) params.append("source_id", sourceId);
    if (forceDemo) params.append("force_demo", "true");
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE}/api/v1/intelligence/ingest/run${qs}`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to execute intelligence ingestion run.");
    return res.json();
  },

  async getExternalEvents(
    page = 1,
    pageSize = 20,
    statusFilter?: string,
    mode?: string
  ): Promise<PaginatedResponse<ExternalDisruptionEvent>> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (statusFilter) params.append("status", statusFilter);
    if (mode) params.append("mode", mode);
    const res = await fetch(`${API_BASE}/api/v1/intelligence/events?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch external disruption events.");
    return res.json();
  },

  async getExternalEventById(eventId: string): Promise<ExternalDisruptionEvent> {
    const res = await fetch(
      `${API_BASE}/api/v1/intelligence/events/${encodeURIComponent(eventId)}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) throw new Error("Failed to fetch external event details.");
    return res.json();
  },

  async confirmExternalEvent(
    eventId: string,
    notes: string
  ): Promise<Disruption> {
    const res = await fetch(
      `${API_BASE}/api/v1/intelligence/events/${encodeURIComponent(eventId)}/confirm`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "CONFIRM", notes }),
      }
    );
    if (!res.ok) throw new Error("Failed to confirm intelligence event into operational disruption.");
    return res.json();
  },

  async rejectExternalEvent(
    eventId: string,
    notes: string
  ): Promise<ExternalDisruptionEvent> {
    const res = await fetch(
      `${API_BASE}/api/v1/intelligence/events/${encodeURIComponent(eventId)}/reject`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "REJECT", notes }),
      }
    );
    if (!res.ok) throw new Error("Failed to reject external event.");
    return res.json();
  },

  async submitManualEvent(payload: {
    title: string;
    description: string;
    category: string;
    severity: string;
    geographic_region: string;
    latitude?: number;
    longitude?: number;
    affected_corridor?: string;
    source_url?: string;
    evidence_summary?: string;
  }): Promise<ExternalDisruptionEvent> {
    const res = await fetch(`${API_BASE}/api/v1/intelligence/ingest/manual`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to submit manual intelligence report.");
    return res.json();
  },

  async getIngestionHistory(limit = 20): Promise<IngestionRun[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/intelligence/ingestion/status?limit=${limit}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) throw new Error("Failed to fetch ingestion history.");
    return res.json();
  },

  async verifyEventEvidence(eventId: string): Promise<EventIntegrityVerification> {
    const res = await fetch(
      `${API_BASE}/api/v1/intelligence/events/${encodeURIComponent(eventId)}/integrity`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) throw new Error("Failed to verify event evidence integrity.");
    return res.json();
  },
};

// --- Named Convenience Functions ---
export const fetchNetworkStatus = (): Promise<NetworkInfo> => api.getNetworkInfo();

export const fetchTrackedTransactions = async (
  limit = 50
): Promise<TrackedTransaction[]> => {
  const res = await fetch(`${API_BASE}/blockchain/transactions/tracked?limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch tracked transactions.");
  return res.json();
};

export const fetchIndexedEvents = async (opts?: {
  planId?: string;
  version?: number;
  limit?: number;
}): Promise<IndexedEvent[]> => {
  const params = new URLSearchParams();
  if (opts?.planId) params.append("plan_id", opts.planId);
  if (opts?.version !== undefined) params.append("version", opts.version.toString());
  if (opts?.limit) params.append("limit", opts.limit.toString());
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/blockchain/events${qs}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch indexed events.");
  return res.json();
};

export const fetchWalletStatus = async (
  walletAddress: string
): Promise<LinkedWalletResponse> => {
  return api.getLinkedWallet();
};

export const fetchPlanVersionDetails = (
  planId: string,
  version: number
): Promise<OnChainPlanVersion> => api.getPlanVersion(planId, version);

export const fetchPlanDecisions = async (
  planId: string,
  version: number
): Promise<PlanDecision[]> => {
  const res = await api.getPlanDecisions(planId, version);
  return res.decisions;
};

export const fetchPlanLatestVersion = async (
  planId: string
): Promise<{ plan_id: string; latest_version: number | null }> => {
  const res = await fetch(`${API_BASE}/blockchain/plan/${encodeURIComponent(planId)}/latest`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch latest plan version.");
  return res.json();
};

export const verifyRecoveryPlan = (
  planId: string,
  version: number
): Promise<VerificationReport> => api.verifyPlanIntegrity(planId, version);
