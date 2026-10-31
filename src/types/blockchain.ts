/**
 * TRUSTCHAIN Blockchain Mobile Types
 * Defines data structures for smart contract interaction, wallet authentication,
 * and canonical verification.
 */

export interface NetworkInfo {
  rpc_url: string;
  connected: boolean;
  chain_id: number | null;
  expected_chain_id: number;
  latest_block: number | null;
  contract_address: string;
  abi_loaded: boolean;
}

export interface UserWalletInfo {
  user_id: string;
  organization_id: string;
  wallet_address: string;
  linked_at: string;
  active: boolean;
}

export interface OnChainWalletInfo {
  org_id: string;
  categories: number;
  active: boolean;
  registered_at: number;
  revoked_at: number;
}

export interface LinkedWalletResponse {
  linked: boolean;
  wallet: UserWalletInfo | null;
  on_chain_authorization: OnChainWalletInfo | null;
}

export interface NonceResponse {
  nonce: string;
  user_id: string;
  organization_id: string;
  issued_at: string;
  expires_at: string;
  message: string;
}

export interface VerifySignatureResponse {
  status: string;
  session_token: string;
  wallet_address: string;
  organization_id: string;
  user_id: string;
  on_chain_registered: boolean;
  categories: number;
}

export interface PlanDecision {
  actor: string;
  stage: number;
  decision_code: number;
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION' | 'UNKNOWN';
  timestamp: number;
  reason_hash: string | null;
}

export interface OnChainPlanVersion {
  plan_hash: string;
  simulation_hash: string;
  org_id: string;
  creator: string;
  action_mask: number;
  required_stages: number;
  completed_stages: number;
  status_code: number;
  status:
    | 'NONE'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'REJECTED'
    | 'REVISION_REQUESTED'
    | 'SUPERSEDED'
    | 'EXECUTED'
    | 'UNKNOWN';
  anchored_at: number;
  execution_evidence_hash: string | null;
  executed_by: string | null;
  executed_at: number | null;
}

export interface ExecutionEligibility {
  plan_id: string;
  version: number;
  eligible: boolean;
  reason:
    | 'ELIGIBLE'
    | 'NOT_FOUND'
    | 'NOT_CURRENT_VERSION'
    | 'REJECTED'
    | 'REVISION_REQUESTED'
    | 'APPROVALS_INCOMPLETE'
    | 'ALREADY_EXECUTED'
    | 'UNKNOWN'
    | string;
}

export interface HashGenerateRequest {
  plan_data: Record<string, any>;
}

export interface HashGenerateResponse {
  canonical_json: string;
  sha256_hash: string;
  schema_version: string;
  evidence_manifest_hash: string;
}

export interface HashVerifyRequest {
  plan_data: Record<string, any>;
  expected_hash: string;
  schema_version?: string;
}

export interface HashVerifyResponse {
  valid: boolean;
  computed_hash: string;
  expected_hash: string;
  schema_version: string;
}

export interface RegisterTxRequest {
  tx_hash: string;
  chain_id?: number;
  function_name?: string;
  plan_id?: string;
  plan_version?: number;
}

export interface TrackedTransaction {
  tx_hash: string;
  chain_id: number;
  contract_address: string;
  function_name?: string | null;
  plan_id?: string | null;
  plan_version?: number | null;
  submitter_wallet: string;
  block_number?: number | null;
  gas_used?: number | null;
  status:
    | 'CREATED'
    | 'PENDING'
    | 'SUBMITTED'
    | 'INCLUDED'
    | 'CONFIRMING'
    | 'CONFIRMED'
    | 'FAILED'
    | 'REORGED'
    | 'REORG_REVIEW';
  receipt_status?: number | null;
  confirmations: number;
  created_at?: string | null;
  confirmed_at?: string | null;
  error_message?: string | null;
}

export interface IndexedEvent {
  tx_hash: string;
  event_name: string;
  log_index: number;
  plan_id: string | null;
  plan_version: number | null;
  wallet_address: string | null;
  block_number: number;
  indexed_at: string;
  event_data: Record<string, any>;
}

export type VerificationStatus =
  | 'VERIFIED'
  | 'VERIFIED_WITHOUT_EXTERNAL_EVIDENCE'
  | 'LEGACY_VERIFIED'
  | 'SUPERSEDED'
  | 'PENDING'
  | 'PLAN_HASH_MISMATCH'
  | 'SIMULATION_HASH_MISMATCH'
  | 'MANIFEST_ROOT_MISMATCH'
  | 'EVIDENCE_CONTENT_TAMPERED'
  | 'MANIFEST_MISSING'
  | 'MANIFEST_INVALID'
  | 'EVIDENCE_MISSING'
  | 'INSUFFICIENT_INTEGRITY_PROOF'
  | 'EVIDENCE_ASSOCIATION_MISMATCH'
  | 'ORGANIZATION_MISMATCH'
  | 'DISRUPTION_MISMATCH'
  | 'VERSION_MISMATCH'
  | 'ON_CHAIN_RECORD_MISSING'
  | 'VERSION_NOT_FOUND'
  | 'RPC_UNAVAILABLE';

export interface PlanVerificationReport {
  result: VerificationStatus;
  status?: string;
  plan_id: string;
  version: number;
  schema_version?: string;
  database_hash: string;
  on_chain_hash?: string | null;
  hashes_match: boolean;
  is_current_version?: boolean;
  latest_on_chain_version?: number;
  on_chain_status?: string;
  required_stages?: number;
  completed_stages?: number;
  execution_eligible?: boolean;
  execution_eligibility_reason?: string;
  execution_evidence_hash?: string | null;
  evidence_manifest_hash?: string;
  decisions?: PlanDecision[];
  checks?: Record<string, boolean>;
  details: string;
  verification_timestamp: string;
}

export const CATEGORY_NAMES: Record<number, string> = {
  0x01: 'Operations Analyst',
  0x02: 'Supply Chain Manager',
  0x04: 'Warehouse Approver',
  0x08: 'Procurement Approver',
  0x10: 'Administrator',
};

export const ACTION_NAMES: Record<number, string> = {
  0x01: 'Warehouse Stock Transfer',
  0x02: 'Alternative Procurement',
  0x04: 'Shipment Reroute',
  0x08: 'Expedited Freight',
  0x10: 'Order Demand Reallocation',
};
