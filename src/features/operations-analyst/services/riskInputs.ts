import type { AffectedOrder, Disruption, OrderRiskSource, SeverityLevel } from '../types';

/**
 * Sample orders are dated around this moment, and all their deadlines have since passed.
 * Scoring against the real clock would mark every order overdue. Remove this once orders
 * come from the backend, and use the current time instead.
 */
export const SAMPLE_DATA_AS_OF = '2026-10-24T09:00:00Z';

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

export interface RiskRequest {
  order_id: string;
  supplier_id: string;
  carrier_id: string;
  snapshot_at: string;
  hours_to_deadline: number;
  required_qty: number;
  shortage_qty: number;
  reported_delay_hours: number;
  priority_tier: number;
  route_risk: number | null;
  weather_severity: number | null;
  customs_hours: number | null;
}

export interface RiskResponse {
  order_id: string;
  method: 'ml' | 'formula';
  model_version: number | null;
  miss_probability: number | null;
  risk_score: number;
  risk_category: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  formula_score: number;
  priority_weight: number;
  factor_effects: Record<string, number> | null;
  data_sources: string[];
}

/** Parses dates such as "26 Oct 2026" by hand, because Hermes does not reliably parse this format. */
export function parseDeliveryDate(value: string): Date | null {
  const match = /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(value.trim());
  if (!match || !(match[2] in MONTHS)) return null;
  return new Date(Date.UTC(Number(match[3]), MONTHS[match[2]], Number(match[1]), 23, 59));
}

export function parseDelayHours(value: string): number {
  const match = /(\d+(?:\.\d+)?)\s*(day|hour|hr)/i.exec(value);
  if (!match) return 0;
  return Number(match[1]) * (match[2].toLowerCase() === 'day' ? 24 : 1);
}

/** Assumption: sample orders have no priority field, so revenue stands in for business priority. */
export function priorityTierFromRevenue(revenue: number): number {
  if (revenue >= 60000) return 1;
  if (revenue >= 40000) return 2;
  if (revenue >= 20000) return 3;
  return 4;
}

export function buildRiskRequest(order: AffectedOrder, disruption: Disruption | undefined, asOf: string): RiskRequest | null {
  const deadline = parseDeliveryDate(order.deliveryCommitment);
  if (!deadline || order.units <= 0) return null;
  const exposed = order.status === 'At Risk' || order.status === 'Delayed';
  return {
    order_id: order.id,
    supplier_id: (disruption?.supplier ?? 'unknown').slice(0, 128),
    carrier_id: (disruption?.carrier ?? 'unknown').slice(0, 128),
    snapshot_at: asOf,
    hours_to_deadline: (deadline.getTime() - new Date(asOf).getTime()) / 3600000,
    required_qty: order.units,
    // Assumption: sample orders have no shortage field, so all units of an exposed order count as short.
    shortage_qty: exposed ? order.units : 0,
    reported_delay_hours: exposed ? parseDelayHours(disruption?.estimatedDelay ?? '') : 0,
    priority_tier: priorityTierFromRevenue(order.revenue),
    route_risk: null,
    weather_severity: null,
    customs_hours: null,
  };
}

const CATEGORY_TO_SEVERITY: Record<RiskResponse['risk_category'], SeverityLevel> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MODERATE: 'Medium',
  LOW: 'Low',
};

const FACTOR_LABELS: Record<string, string> = {
  slack_hours: 'Too little time left after the delay',
  hours_to_deadline: 'Deadline is close',
  reported_delay_hours: 'Length of the reported delay',
  shortage_ratio: 'Share of the order that is short',
  priority_tier: 'Order priority',
  route_risk: 'Route risk',
  weather_severity: 'Weather',
  customs_hours: 'Customs time',
  supplier_hist_miss_rate: 'Supplier track record',
  supplier_recent_miss_rate: 'Supplier recent misses',
  carrier_hist_miss_rate: 'Carrier track record',
  carrier_recent_miss_rate: 'Carrier recent misses',
};

function topFactors(effects: Record<string, number> | null): string[] {
  if (!effects) return [];
  return Object.entries(effects)
    .filter(([, effect]) => effect > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([name]) => FACTOR_LABELS[name] ?? name);
}

export function toRiskSource(result: RiskResponse): OrderRiskSource {
  return {
    kind: result.method,
    modelVersion: result.model_version,
    missProbability: result.miss_probability,
    topFactors: topFactors(result.factor_effects),
    dataSources: result.data_sources,
  };
}

export function applyRisk(order: AffectedOrder, result: RiskResponse | undefined): AffectedOrder {
  if (!result) return { ...order, riskSource: SAMPLE_SOURCE };
  return {
    ...order,
    riskScore: Math.round(result.risk_score),
    severity: CATEGORY_TO_SEVERITY[result.risk_category],
    riskSource: toRiskSource(result),
  };
}

export const SAMPLE_SOURCE: OrderRiskSource = {
  kind: 'sample',
  modelVersion: null,
  missProbability: null,
  topFactors: [],
  dataSources: [],
};
