import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { TokenStorage } from './auth';
import { WalletStorage } from './walletStorage';
import {
  NetworkInfo,
  LinkedWalletResponse,
  NonceResponse,
  VerifySignatureResponse,
  OnChainPlanVersion,
  ExecutionEligibility,
  PlanDecision,
  PlanVerificationReport,
  TrackedTransaction,
  IndexedEvent,
  OnChainWalletInfo,
  HashGenerateResponse,
  HashVerifyResponse,
  RegisterTxRequest,
} from '../types/blockchain';

// Default host resolution for Expo mobile & web
const getDefaultApiBase = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // A phone reaches the machine serving the Expo bundle, which is where the backend runs.
  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (devHost) {
    return `http://${devHost}:8000`;
  }
  // Android emulator routes host machine loopback to 10.0.2.2
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
};

let currentApiBase = getDefaultApiBase();

export const setApiBaseUrl = (url: string) => {
  currentApiBase = url.replace(/\/+$/, '');
};

export const getApiBaseUrl = (): string => currentApiBase;

export class BlockchainApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number = 500, details?: any) {
    super(message);
    this.name = 'BlockchainApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Builds request headers incorporating user authentication and cryptographic wallet session tokens.
 */
async function buildHeaders(customHeaders?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...customHeaders,
  };

  try {
    // 1. Check wallet session storage
    const walletSession = await WalletStorage.getSession();
    if (walletSession.sessionToken) {
      headers['Authorization'] = `Bearer ${walletSession.sessionToken}`;
    }

    if (walletSession.userId) {
      headers['X-User-Id'] = walletSession.userId;
    }
    if (walletSession.organizationId) {
      headers['X-Organization-Id'] = walletSession.organizationId;
    }
    if (walletSession.chainId) {
      headers['X-Chain-Id'] = walletSession.chainId.toString();
    }

    // 2. Fall back to standard auth profile if wallet session doesn't specify user/org
    if (!headers['X-User-Id'] || !headers['X-Organization-Id']) {
      const user = await TokenStorage.getUser();
      if (user) {
        if (!headers['X-User-Id']) headers['X-User-Id'] = user.id;
        if (!headers['X-Organization-Id']) {
          headers['X-Organization-Id'] = user.organization || 'ORG-APEX-GLOBAL';
        }
        if (user.assignedRole) {
          headers['X-User-Roles'] = user.assignedRole;
        }
      }
    }

    // If still no auth token, check TokenStorage tokens
    if (!headers['Authorization']) {
      const tokens = await TokenStorage.getTokens();
      if (tokens?.accessToken) {
        headers['Authorization'] = `Bearer ${tokens.accessToken}`;
      }
    }
  } catch (err) {
    console.warn('Error constructing auth headers:', err);
  }

  // Fallback defaults for testing
  if (!headers['X-User-Id']) headers['X-User-Id'] = 'user:ops-analyst-88';
  if (!headers['X-Organization-Id']) headers['X-Organization-Id'] = 'ORG-APEX-GLOBAL';
  if (!headers['X-User-Roles']) headers['X-User-Roles'] = 'operations_analyst';

  return headers;
}

/**
 * Reusable fetch wrapper with typed response and unified error handling.
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${currentApiBase}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = await buildHeaders(options.headers as Record<string, string>);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errMsg = `Request failed with status ${res.status}`;
      let errDetail: any = null;
      try {
        const errorJson = await res.json();
        errMsg = errorJson.detail || errorJson.message || errMsg;
        errDetail = errorJson;
      } catch {
        const text = await res.text().catch(() => '');
        if (text) errMsg = text;
      }

      // If unauthorized, session may have expired
      if (res.status === 401 || res.status === 403) {
        console.warn(`[BlockchainAPI] Unauthorized session (${res.status}): ${errMsg}`);
      }

      throw new BlockchainApiError(errMsg, res.status, errDetail);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    if (err instanceof BlockchainApiError) {
      throw err;
    }
    throw new BlockchainApiError(
      err?.message || 'Network connection to blockchain service failed.',
      0,
      err
    );
  }
}

export const blockchainApi = {
  // ---------------------------------------------------------------------------
  // 1. Network & Status
  // ---------------------------------------------------------------------------
  async getNetworkInfo(): Promise<NetworkInfo> {
    return apiRequest<NetworkInfo>('/blockchain/network');
  },

  // ---------------------------------------------------------------------------
  // 2. Wallet Ownership & Linking
  // ---------------------------------------------------------------------------
  async requestNonce(): Promise<NonceResponse> {
    return apiRequest<NonceResponse>('/blockchain/wallet/nonce', {
      method: 'POST',
    });
  },

  async verifySignature(
    walletAddress: string,
    nonce: string,
    signature: string
  ): Promise<VerifySignatureResponse> {
    const res = await apiRequest<VerifySignatureResponse>('/blockchain/wallet/verify', {
      method: 'POST',
      body: JSON.stringify({
        wallet_address: walletAddress,
        nonce,
        signature,
      }),
    });

    // Automatically persist verified session
    if (res.session_token) {
      await WalletStorage.saveSession({
        sessionToken: res.session_token,
        walletAddress: res.wallet_address,
        userId: res.user_id,
        organizationId: res.organization_id,
      });
    }

    return res;
  },

  async getLinkedWallet(): Promise<LinkedWalletResponse> {
    return apiRequest<LinkedWalletResponse>('/blockchain/wallet/linked');
  },

  async logoutWallet(): Promise<{ status: string; revoked: boolean; message: string }> {
    try {
      const res = await apiRequest<{ status: string; revoked: boolean; message: string }>(
        '/blockchain/wallet/logout',
        { method: 'POST' }
      );
      await WalletStorage.clearSession();
      return res;
    } catch (err) {
      await WalletStorage.clearSession();
      throw err;
    }
  },

  async unlinkWallet(walletAddress: string): Promise<{ status: string; wallet_address: string }> {
    const res = await apiRequest<{ status: string; wallet_address: string }>(
      `/blockchain/wallet/unlink?wallet_address=${encodeURIComponent(walletAddress)}`,
      { method: 'DELETE' }
    );
    await WalletStorage.clearSession();
    return res;
  },

  async getWalletAuthorization(walletAddress: string): Promise<OnChainWalletInfo> {
    return apiRequest<OnChainWalletInfo>(
      `/blockchain/wallet/${encodeURIComponent(walletAddress)}/authorization`
    );
  },

  // ---------------------------------------------------------------------------
  // 3. Canonical Hashing
  // ---------------------------------------------------------------------------
  async generatePlanHash(planData: Record<string, any>): Promise<HashGenerateResponse> {
    return apiRequest<HashGenerateResponse>('/blockchain/hash/generate', {
      method: 'POST',
      body: JSON.stringify({ plan_data: planData }),
    });
  },

  async verifyPlanHash(
    planData: Record<string, any>,
    expectedHash: string,
    schemaVersion?: string
  ): Promise<HashVerifyResponse> {
    return apiRequest<HashVerifyResponse>('/blockchain/hash/verify', {
      method: 'POST',
      body: JSON.stringify({
        plan_data: planData,
        expected_hash: expectedHash,
        schema_version: schemaVersion,
      }),
    });
  },

  // ---------------------------------------------------------------------------
  // 4. Contract & On-Chain Plan State
  // ---------------------------------------------------------------------------
  async getLatestPlanVersion(planId: string): Promise<{ plan_id: string; latest_version: number }> {
    return apiRequest<{ plan_id: string; latest_version: number }>(
      `/blockchain/plan/${encodeURIComponent(planId)}/latest`
    );
  },

  async getOnChainPlan(planId: string, version: number): Promise<OnChainPlanVersion> {
    return apiRequest<OnChainPlanVersion>(
      `/blockchain/plan/${encodeURIComponent(planId)}/${version}`
    );
  },

  async getEligibility(planId: string, version: number): Promise<ExecutionEligibility> {
    return apiRequest<ExecutionEligibility>(
      `/blockchain/plan/${encodeURIComponent(planId)}/${version}/eligibility`
    );
  },

  async getDecisions(
    planId: string,
    version: number
  ): Promise<{
    plan_id: string;
    version: number;
    decision_count: number;
    decisions: PlanDecision[];
  }> {
    return apiRequest<{
      plan_id: string;
      version: number;
      decision_count: number;
      decisions: PlanDecision[];
    }>(`/blockchain/plan/${encodeURIComponent(planId)}/${version}/decisions`);
  },

  // ---------------------------------------------------------------------------
  // 5. Transactions & Contract Events
  // ---------------------------------------------------------------------------
  async registerTransaction(req: RegisterTxRequest): Promise<TrackedTransaction> {
    return apiRequest<TrackedTransaction>('/blockchain/transactions/register', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async listTrackedTransactions(limit: number = 50): Promise<TrackedTransaction[]> {
    return apiRequest<TrackedTransaction[]>(`/blockchain/transactions/tracked?limit=${limit}`);
  },

  async getTransactionStatus(txHash: string): Promise<TrackedTransaction> {
    return apiRequest<TrackedTransaction>(
      `/blockchain/transactions/${encodeURIComponent(txHash)}`
    );
  },

  async reconcileTransaction(txHash: string): Promise<TrackedTransaction> {
    return apiRequest<TrackedTransaction>(
      `/blockchain/transactions/${encodeURIComponent(txHash)}/reconcile`,
      { method: 'POST' }
    );
  },

  async getEvents(
    planId?: string,
    version?: number,
    limit: number = 50
  ): Promise<IndexedEvent[]> {
    const params = new URLSearchParams();
    if (planId) params.append('plan_id', planId);
    if (version !== undefined) params.append('version', version.toString());
    params.append('limit', limit.toString());

    return apiRequest<IndexedEvent[]>(`/blockchain/events?${params.toString()}`);
  },

  // ---------------------------------------------------------------------------
  // 6. Recovery Plan Integrity Verification
  // ---------------------------------------------------------------------------
  async storeOperationalPlan(
    planId: string,
    version: number,
    planData: Record<string, any>
  ): Promise<{ status: string; plan_id: string; version: number }> {
    return apiRequest<{ status: string; plan_id: string; version: number }>(
      '/blockchain/plans/operational',
      {
        method: 'POST',
        body: JSON.stringify({
          plan_id: planId,
          version,
          plan_data: planData,
        }),
      }
    );
  },

  async verifyPlanIntegrity(planId: string, version: number): Promise<PlanVerificationReport> {
    return apiRequest<PlanVerificationReport>(
      `/blockchain/verification/${encodeURIComponent(planId)}/${version}`
    );
  },
};
