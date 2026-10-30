import Constants from 'expo-constants';
import type { RiskRequest, RiskResponse } from './riskInputs';

const REQUEST_TIMEOUT_MS = 8000;
const BACKEND_PORT = 8000;

/** On a phone, "localhost" is the phone itself, so default to the machine serving the Expo bundle. */
export function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/+$/, '');
  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${devHost || 'localhost'}:${BACKEND_PORT}`;
}

export async function scoreOrders(orders: RiskRequest[]): Promise<RiskResponse[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/risk/score/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Placeholder identity until real login exists; the backend must not trust this in production.
        'X-Organization-Id': process.env.EXPO_PUBLIC_RISK_ORG_ID || 'org:synthetic-demo',
      },
      body: JSON.stringify({ orders }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Risk service returned ${response.status}`);
    const body = (await response.json()) as { results: RiskResponse[] };
    return body.results;
  } finally {
    clearTimeout(timeout);
  }
}
