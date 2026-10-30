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

export interface PlanDecision {
  actor: string;
  stage: number;
  decision_code: number;
  decision: "APPROVE" | "REJECT" | "REQUEST_REVISION" | "UNKNOWN";
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
    | "NONE"
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "REJECTED"
    | "REVISION_REQUESTED"
    | "SUPERSEDED"
    | "EXECUTED"
    | "UNKNOWN";
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
    | "ELIGIBLE"
    | "NOT_FOUND"
    | "NOT_CURRENT_VERSION"
    | "REJECTED"
    | "REVISION_REQUESTED"
    | "APPROVALS_INCOMPLETE"
    | "ALREADY_EXECUTED"
    | "UNKNOWN";
}

export type VerificationStatus =
  | "VERIFIED"
  | "HASH_MISMATCH"
  | "NOT_ANCHORED"
  | "VERSION_NOT_FOUND"
  | "SUPERSEDED"
  | "PENDING"
  | "RPC_UNAVAILABLE"
  | "APPROVED"
  | "EXECUTED";

export interface VerificationReport {
  result: VerificationStatus;
  plan_id: string;
  version: number;
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
  decisions?: PlanDecision[];
  details: string;
  verification_timestamp: string;
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
    | "CREATED"
    | "PENDING"
    | "SUBMITTED"
    | "INCLUDED"
    | "CONFIRMED"
    | "FAILED"
    | "REORG_REVIEW";
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

export const CATEGORY_NAMES: Record<number, string> = {
  0x01: "Operations Analyst",
  0x02: "Supply Chain Manager",
  0x04: "Warehouse Approver",
  0x08: "Procurement Approver",
  0x10: "Administrator",
};

export const ACTION_NAMES: Record<number, string> = {
  0x01: "Warehouse Stock Transfer",
  0x02: "Alternative Procurement",
  0x04: "Shipment Reroute",
  0x08: "Expedited Freight",
  0x10: "Order Demand Reallocation",
};
