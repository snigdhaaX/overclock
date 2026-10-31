import authService, { TokenStorage } from './auth';
import { SupplierProfile } from '../features/supply-chain-manager/types';
import { API_BASE_URL, getApiBaseUrl } from '../constants/api';

export { API_BASE_URL, getApiBaseUrl };

export class BackendSyncService {
  private get baseUrl(): string {
    return getApiBaseUrl();
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const tokens = await TokenStorage.getTokens();
    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }

    const user = await TokenStorage.getUser();
    if (user) {
      headers['X-User-Id'] = user.id;
      headers['X-Organization-Id'] = user.organization;
      headers['X-User-Roles'] = user.assignedRole;
    }

    return headers;
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (res.status === 401) {
      console.warn('[BackendSync] 401 Unauthorized - clearing session');
      await authService.logout();
      throw new Error('SESSION_EXPIRED: Your session has expired. Please sign in again.');
    }

    if (!res.ok) {
      let errBody: any = null;
      try {
        errBody = await res.json();
      } catch {
        // non-json response
      }

      if (errBody?.detail === 'CREATOR_CANNOT_DECIDE' || errBody?.error === 'CREATOR_CANNOT_DECIDE') {
        const error: any = new Error(
          errBody.message || 'The creator of a recovery plan cannot approve their own plan.'
        );
        error.code = 'CREATOR_CANNOT_DECIDE';
        throw error;
      }

      const msg = errBody?.detail || errBody?.message || `Request failed with status ${res.status}`;
      const err: any = new Error(msg);
      err.status = res.status;
      err.body = errBody;
      throw err;
    }

    return res.json();
  }

  async checkHealth(): Promise<{ status: string; service: string } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { method: 'GET' });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  }

  async fetchSuppliers(): Promise<SupplierProfile[]> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${this.baseUrl}/api/v1/suppliers`, {
        method: 'GET',
        headers,
      });
      return await this.handleResponse<SupplierProfile[]>(res);
    } catch (err: any) {
      console.warn('[BackendSync] fetchSuppliers fallback to local service:', err?.message || err);
      throw err;
    }
  }

  async submitRecoveryPlan(planId: string): Promise<any> {
    const headers = await this.getHeaders();
    const res = await fetch(`${this.baseUrl}/api/v1/recovery/plans/${planId}/submit`, {
      method: 'POST',
      headers,
    });
    return this.handleResponse(res);
  }

  async approvePlan(payload: {
    planId: string;
    actor: string;
    role: string;
    comments?: string;
  }): Promise<any> {
    const headers = await this.getHeaders();
    const res = await fetch(`${this.baseUrl}/api/v1/approvals/${payload.planId}/approve`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return this.handleResponse(res);
  }

  async rejectPlan(payload: {
    planId: string;
    actor: string;
    role: string;
    reason: string;
    comments?: string;
  }): Promise<any> {
    const headers = await this.getHeaders();
    const res = await fetch(`${this.baseUrl}/api/v1/approvals/${payload.planId}/reject`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return this.handleResponse(res);
  }

  async requestRevision(payload: {
    planId: string;
    actor: string;
    changeRequirements: string;
  }): Promise<any> {
    const headers = await this.getHeaders();
    const res = await fetch(`${this.baseUrl}/api/v1/approvals/${payload.planId}/request-revision`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return this.handleResponse(res);
  }

  async verifyPlanBlockchain(planId: string): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${this.baseUrl}/api/v1/blockchain/verify/plan/${planId}`, {
        method: 'GET',
        headers,
      });
      return await this.handleResponse(res);
    } catch (err) {
      console.warn('[BackendSync] verifyPlanBlockchain call failed:', err);
      return null;
    }
  }
}

export const backendSync = new BackendSyncService();
export default backendSync;

