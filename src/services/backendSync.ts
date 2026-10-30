import { useEffect, useState } from 'react';
import operationsService from '../features/operations-analyst/services/operationsService';
import managerService from '../features/supply-chain-manager/services/managerService';
import { apiRequest, hasAccessToken, NetworkError } from './apiClient';

const POLL_MS = 10000;

let timer: ReturnType<typeof setInterval> | null = null;
let version = 0;
let online = false;
const listeners = new Set<() => void>();

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
