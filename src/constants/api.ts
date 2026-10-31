import { Platform } from 'react-native';

/**
 * TRUSTCHAIN Centralized API Configuration
 * Target Backend: FastAPI / Uvicorn running on laptop workstation
 */
export const LAPTOP_LAN_IP = '172.31.98.170';
export const DEFAULT_PORT = '8000';

/**
 * Resolves the active API base URL.
 * Defaults to the verified laptop LAN IP (http://172.31.98.170:8000) for cross-device compatibility.
 */
export const getApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    const cleanUrl = envUrl.trim().replace(/\/+$/, '');
    // If running on a physical Android or iOS device, localhost / 127.0.0.1 is unreachable
    if (Platform.OS !== 'web' && (cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1'))) {
      return `http://${LAPTOP_LAN_IP}:${DEFAULT_PORT}`;
    }
    return cleanUrl;
  }
  return `http://${LAPTOP_LAN_IP}:${DEFAULT_PORT}`;
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Centralized endpoint path constants
 */
export const API_ENDPOINTS = {
  HEALTH: '/health',
  DOCS: '/docs',
  OPENAPI: '/openapi.json',
  BLOCKCHAIN: {
    NETWORK_INFO: '/blockchain/network/info',
    NONCE: '/blockchain/wallet/nonce',
    VERIFY: '/blockchain/wallet/verify',
    LINKED_WALLET: '/blockchain/wallet/linked',
    LOGOUT: '/blockchain/wallet/logout',
    UNLINK: '/blockchain/wallet/unlink',
    AUTHORIZATION: (wallet: string) => `/blockchain/wallet/${wallet}/authorization`,
    GENERATE_HASH: '/blockchain/hash/generate',
    VERIFY_HASH: '/blockchain/hash/verify',
    PLAN_LATEST: (planId: string) => `/blockchain/plan/${planId}/latest`,
    PLAN_VERSION: (planId: string, version: number) => `/blockchain/plan/${planId}/${version}`,
    PLAN_ELIGIBILITY: (planId: string, version: number) => `/blockchain/plan/${planId}/${version}/eligibility`,
    PLAN_DECISIONS: (planId: string, version: number) => `/blockchain/plan/${planId}/${version}/decisions`,
    REGISTER_TRANSACTION: '/blockchain/transactions/register',
    TRACKED_TRANSACTIONS: '/blockchain/transactions/tracked',
    TRANSACTION_STATUS: (txHash: string) => `/blockchain/transactions/${txHash}`,
    RECONCILE_TRANSACTION: (txHash: string) => `/blockchain/transactions/${txHash}/reconcile`,
    EVENTS: '/blockchain/events',
    OPERATIONAL_PLAN: '/blockchain/plans/operational',
    VERIFY_PLAN: (planId: string, version: number) => `/blockchain/verification/${planId}/${version}`,
  },
  V1: {
    SUPPLIERS: '/api/v1/suppliers',
    SUBMIT_PLAN: (planId: string) => `/api/v1/recovery/plans/${planId}/submit`,
    APPROVE_PLAN: (planId: string) => `/api/v1/approvals/${planId}/approve`,
    REJECT_PLAN: (planId: string) => `/api/v1/approvals/${planId}/reject`,
    REQUEST_REVISION: (planId: string) => `/api/v1/approvals/${planId}/request-revision`,
    VERIFY_PLAN: (planId: string) => `/api/v1/blockchain/verify/plan/${planId}`,
    CHAIN_STATUS: '/api/v1/chain/status',
  },
  SUPPLY_CHAIN: {
    ACTIVE_DISRUPTIONS: '/disruptions/active',
    DISRUPTION_DETAIL: (id: string) => `/disruptions/${id}`,
    DISRUPTION_IMPACT: (id: string) => `/disruptions/${id}/impact`,
    DISRUPTION_RISK: (id: string) => `/disruptions/${id}/risk`,
    RECOMMEND_ACTIONS: (id: string) => `/disruptions/${id}/recommend-actions`,
    ORDERS: '/supply-chain/orders',
    SHIPMENTS: '/supply-chain/shipments',
    WAREHOUSES: '/supply-chain/warehouses',
    INVENTORY: '/supply-chain/inventory',
  },
};

