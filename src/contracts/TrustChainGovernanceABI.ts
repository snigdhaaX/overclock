export const TRUSTCHAIN_GOVERNANCE_ABI = [
  // Governance Mutating Functions
  'function anchorPlan(bytes32 planId, uint32 version, bytes32 planHash, bytes32 simulationHash, uint8 actionMask, uint8 requiredStages) external',
  'function approvePlan(bytes32 planId, uint32 version, uint8 stage) external',
  'function rejectPlan(bytes32 planId, uint32 version, bytes32 reasonHash) external',
  'function requestRevision(bytes32 planId, uint32 version, bytes32 reasonHash) external',
  'function anchorExecution(bytes32 planId, uint32 version, bytes32 evidenceHash) external',
  'function anchorExecutionEvidence(bytes32 planId, uint32 version, bytes32 executionEvidenceHash) external',

  // View & Query Functions
  'function getWallet(address wallet) external view returns (bytes32 orgId, uint8 categories, bool active, uint64 registeredAt, uint64 revokedAt)',
  'function getPlanVersion(bytes32 planId, uint32 version) external view returns (bytes32 planHash, bytes32 simulationHash, bytes32 orgId, address creator, uint8 actionMask, uint8 requiredStages, uint8 completedStages, uint8 status, uint64 anchoredAt, bytes32 executionEvidenceHash, address executedBy, uint64 executedAt)',
  'function getDecisions(bytes32 planId, uint32 version) external view returns (tuple(address actor, uint8 stage, uint8 decision, uint64 timestamp, bytes32 reasonHash)[] memory)',
  'function executionEligibility(bytes32 planId, uint32 version) external view returns (bool eligible, string memory reason)',
  'function latestVersion(bytes32 planId) external view returns (uint32)',
  'function planExists(bytes32 planId, uint32 version) external view returns (bool)',

  // Events
  'event PlanAnchored(bytes32 indexed planId, uint32 indexed version, bytes32 planHash, bytes32 simulationHash, bytes32 orgId, address indexed creator, uint8 actionMask, uint8 requiredStages, uint64 timestamp)',
  'event PlanApproved(bytes32 indexed planId, uint32 indexed version, address indexed approver, uint8 stage, uint64 timestamp)',
  'event PlanRejected(bytes32 indexed planId, uint32 indexed version, address indexed rejector, bytes32 reasonHash, uint64 timestamp)',
  'event RevisionRequested(bytes32 indexed planId, uint32 indexed version, address indexed requester, bytes32 reasonHash, uint64 timestamp)',
  'event ExecutionAnchored(bytes32 indexed planId, uint32 indexed version, address indexed executor, bytes32 evidenceHash)',
  'event ExecutionEvidenceAnchored(bytes32 indexed planId, uint32 indexed version, bytes32 evidenceHash, address indexed submitter, uint64 timestamp)',
  'event WalletRegistered(address indexed wallet, bytes32 orgId, uint8 categories, uint64 timestamp)',
  'event WalletRevoked(address indexed wallet, bytes32 orgId, address indexed revokedBy)',
];

export const CONTRACT_ADDRESSES = {
  amoy: {
    chainId: 80002,
    address: '0x33D476cE98f8a374C73D3eDa5FDE65917bA3e24A',
    name: 'Polygon Amoy Testnet',
    explorer: 'https://amoy.polygonscan.com',
  },
  localhost: {
    chainId: 31337,
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    name: 'Hardhat Local Node',
    explorer: 'http://localhost:8545',
  },
  local: {
    chainId: 31337,
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    name: 'Hardhat Local Node',
    explorer: 'http://localhost:8545',
  },
};
