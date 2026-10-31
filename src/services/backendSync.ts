import { useEffect, useState } from 'react';
import operationsService from '../features/operations-analyst/services/operationsService';
import managerService from '../features/supply-chain-manager/services/managerService';
import { apiRequest, hasAccessToken, NetworkError } from './apiClient';

const POLL_MS = 10000;

let timer: ReturnType<typeof setInterval> | null = null;
let version = 0;
let online = false;
const listeners = new Set<() => void>();

export interface LiveData {
  risk?: any;
  chain?: { signingEnabled: boolean; connected: boolean; chainId?: number; network?: string; contract?: string; latestBlock?: number; contractDeployed?: boolean };
  auditChain?: { valid: boolean; events: number; broken_at: number | null };
  inventory?: { warehouse: string; warehouseCode: string; product: string; sku: string; onHand: number; reserved: number; safety: number; available: number }[];
  suppliers?: { code: string; name: string; country: string; outcomes: number; on_time_rate: number | null; late_rate: number | null }[];
  currentUser?: { name: string; email: string };
  health?: any;
}

export interface RetrainResult {
  status: string;
  reason?: string;
  decision_reason?: string;
}

let live: LiveData = {};

/** Data from the last sync that has no home in the older mock-backed services. */
export const getLiveData = () => live;

export const runRetrain = () => apiRequest<RetrainResult>('/risk/models/retrain', { method: 'POST', body: {}, timeoutMs: 60000 });

function notify() {
  version += 1;
  listeners.forEach((listener) => listener());
}

/** Loads live data into the services that screens already read from. */
export async function syncNow(): Promise<boolean> {
  if (!hasAccessToken()) return false;
  try {
    const data = await apiRequest<any>('/app/bootstrap');
    operationsService.hydrate(data);
    managerService.hydrate(data);
    live = { risk: data.risk, chain: data.chain, auditChain: data.auditChain, inventory: data.inventory, suppliers: data.suppliers, currentUser: data.currentUser, health: data.health };
    online = true;
    notify();
    return true;
  } catch (err) {
    console.warn('Live data sync failed:', err);
    if (online && err instanceof NetworkError) {
      online = false;
      notify();
    }
    return false;
  }
}

export function startSync() {
  if (timer === null) timer = setInterval(syncNow, POLL_MS);
  return syncNow();
}

export function stopSync() {
  if (timer !== null) clearInterval(timer);
  timer = null;
  online = false;
}

export function isBackendOnline() {
  return online;
}

/** Re-renders a screen when fresh data arrives. Add one line to any screen that shows live data. */
export function useSyncVersion() {
  const [, setSeen] = useState(version);
  useEffect(() => {
    const listener = () => setSeen(version);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return version;
}

async function act<T>(path: string, body?: unknown): Promise<T> {
  const result = await apiRequest<T>(path, { method: 'POST', body });
  await syncNow();
  return result;
}

export const submitPlan = (planId: string) => act(`/recovery/plans/${encodeURIComponent(planId)}/submit`);
export const approvePlan = (planId: string, comments?: string) => act(`/approvals/${encodeURIComponent(planId)}/approve`, { comments });
export const rejectPlan = (planId: string, comments: string) => act(`/approvals/${encodeURIComponent(planId)}/reject`, { comments });
export const requestRevision = (planId: string, comments: string) => act(`/approvals/${encodeURIComponent(planId)}/request-revision`, { comments });
export const confirmExecution = (planId: string) => act(`/execution/${encodeURIComponent(planId)}/confirm`);

export interface PlanVerification {
  plan_id: string;
  version: number;
  result: 'VERIFIED' | 'HASH_MISMATCH' | 'NOT_ANCHORED';
  computed_hash: string;
  stored_hash: string;
  on_chain_match: boolean | null;
}

export const verifyPlan = (planId: string) => apiRequest<PlanVerification>(`/blockchain/verify/plan/${encodeURIComponent(planId)}`);

export interface AiPlanExplanation {
  plan_id: string;
  explanation: string;
  advantages: string[];
  disadvantages: string[];
  required_validation: string[];
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export type AiRecommendation =
  | { status: 'AVAILABLE'; model: string; generated_at: string; advisory_notice: string; overview: string; recommended_plan_id: string; explanations: AiPlanExplanation[] }
  | { status: 'UNAVAILABLE'; reason: string; message: string };

const UNAVAILABLE: AiRecommendation = {
  status: 'UNAVAILABLE',
  reason: 'UNREACHABLE',
  message: 'AI explanations are unavailable right now. The checked options below are still accurate and can be used.',
};

/** Never throws: if AI can't answer for any reason, the screen says so and everything else keeps working. */
export async function getAiRecommendation(disruptionId: string): Promise<AiRecommendation> {
  try {
    return await apiRequest<AiRecommendation>(`/ai/disruptions/${encodeURIComponent(disruptionId)}/recommendations`, { method: 'POST', timeoutMs: 30000 });
  } catch {
    return UNAVAILABLE;
  }
}
