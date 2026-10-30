import { useCallback, useEffect, useMemo, useState } from 'react';
import operationsService from '../services/operationsService';
import { scoreOrders } from '../services/riskApi';
import { applyRisk, buildRiskRequest, RiskResponse, SAMPLE_DATA_AS_OF } from '../services/riskInputs';
import type { AffectedOrder } from '../types';

const CACHE_TTL_MS = 60000;
const cache = new Map<string, { at: number; result: RiskResponse }>();

export type RiskStatus = 'loading' | 'live' | 'unavailable';

export function useOrderRisk(orders: AffectedOrder[]) {
  const [results, setResults] = useState<Record<string, RiskResponse>>({});
  const [status, setStatus] = useState<RiskStatus>('loading');
  const [attempt, setAttempt] = useState(0);
  const key = orders.map((o) => o.id).join('|');
  // Live orders arrive already scored by the backend.
  const alreadyScored = orders.length > 0 && orders.every((o) => o.riskSource && o.riskSource.kind !== 'sample');

  useEffect(() => {
    if (alreadyScored) {
      setStatus('live');
      return;
    }
    let cancelled = false;
    const now = Date.now();
    const cached: Record<string, RiskResponse> = {};
    const missing = [];
    for (const order of orders) {
      const hit = cache.get(order.id);
      if (hit && now - hit.at < CACHE_TTL_MS) {
        cached[order.id] = hit.result;
      } else {
        const request = buildRiskRequest(order, operationsService.getDisruptionById(order.associatedDisruptionId), SAMPLE_DATA_AS_OF);
        if (request) missing.push(request);
      }
    }
    setResults(cached);
    if (missing.length === 0) {
      setStatus(Object.keys(cached).length > 0 ? 'live' : 'unavailable');
      return;
    }
    setStatus('loading');
    scoreOrders(missing)
      .then((scored) => {
        if (cancelled) return;
        const fresh = { ...cached };
        for (const result of scored) {
          cache.set(result.order_id, { at: Date.now(), result });
          fresh[result.order_id] = result;
        }
        setResults(fresh);
        setStatus('live');
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });
    return () => {
      cancelled = true;
    };
    // orders is rebuilt on every render, so the joined ids are what identify a real change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt, alreadyScored]);

  const scored = useMemo(() => orders.map((o) => applyRisk(o, results[o.id])), [orders, results]);
  const firstSource = scored.find((o) => o.riskSource?.kind !== 'sample')?.riskSource;

  const refresh = useCallback(() => {
    cache.clear();
    setAttempt((n) => n + 1);
  }, []);

  return { orders: scored, status, source: firstSource, refresh };
}
