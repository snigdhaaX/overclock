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

const API_BASE = "";

// Development authentication context headers
const getAuthHeaders = () => {
  const userId = localStorage.getItem("trustchain_user_id") || "user:analyst-101";
  const orgId = localStorage.getItem("trustchain_org_id") || "org:acme-logistics";
  const userRoles = localStorage.getItem("trustchain_user_roles") || "operations_analyst";

  return {
    "Content-Type": "application/json",
    "X-User-Id": userId,
    "X-Organization-Id": orgId,
    "X-User-Roles": userRoles,
  };
};

export const api = {
  // --- Network & Status ---
  async getNetworkInfo(): Promise<NetworkInfo> {
    const res = await fetch(`${API_BASE}/blockchain/network`);
    if (!res.ok) throw new Error("Failed to fetch network information.");
    return res.json();
  },

  // --- Wallet Nonces & Linking ---
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
    return res.json();
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
    return res.json();
  },

  async getWalletAuthorization(walletAddress: string): Promise<OnChainWalletInfo> {
    const res = await fetch(
      `${API_BASE}/blockchain/wallet/${encodeURIComponent(walletAddress)}/authorization`
    );
    if (!res.ok) throw new Error("Failed to fetch on-chain authorization.");
    return res.json();
  },

  // --- Hashing ---
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
};

// --- Named Convenience Functions ---
export const fetchNetworkStatus = (): Promise<NetworkInfo> => api.getNetworkInfo();

export const fetchTrackedTransactions = async (
  limit: number = 50
): Promise<TrackedTransaction[]> => {
  const res = await fetch(`${API_BASE}/blockchain/transactions/tracked?limit=${limit}`);
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
  const res = await fetch(`${API_BASE}/blockchain/events${qs}`);
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
  const res = await fetch(`${API_BASE}/blockchain/plan/${encodeURIComponent(planId)}/latest`);
  if (!res.ok) throw new Error("Failed to fetch latest plan version.");
  return res.json();
};

export const verifyRecoveryPlan = (
  planId: string,
  version: number
): Promise<VerificationReport> => api.verifyPlanIntegrity(planId, version);
