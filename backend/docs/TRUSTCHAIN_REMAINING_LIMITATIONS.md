# TRUSTCHAIN — REMAINING LIMITATIONS AND PRODUCTION ROADMAP

**Project:** TRUSTCHAIN — AI-Powered Supply Chain Disruption Intelligence, Recovery & Governance Platform  
**Target Environment:** React Native (Expo SDK 52) Mobile Application & EVM Smart Contracts  
**Date:** October 31, 2026  

---

## 1. FUTURE SMART CONTRACT UPGRADES (CONTRACT V2 DESIGN)

The currently deployed `TrustChainGovernance.sol` contract (Solidity 0.8.24) is protected under strict zero-modification rules. The following structural enhancements are deferred to Contract V2:

1. **Explicit Zero-Simulation Support:**
   - *Current Constraint:* In Contract V1, `anchorPlan` reverts with `ZeroIdentifier` if `simulationHash == bytes32(0)`. Plans must therefore always provide a non-zero simulation hash (handled by our deterministic canonical simulation generator).
   - *V2 Design:* Permit plans without simulations by accepting `bytes32(0)` while emitting an explicit `PlanSimulationOmitted` event.
2. **Dynamic In-Place Plan Revisions:**
   - *Current Constraint:* Recovery plans are immutable once anchored. Revisions require incrementing the version counter (`version + 1`), which supersedes the previous version and requires fresh approvals.
   - *V2 Design:* Support atomic patch proposals allowing minor non-material amendments without discarding completed prior approval stages.
3. **EIP-712 Meta-Transactions (Gasless Mobile Relaying):**
   - *Current Constraint:* The mobile client currently submits transactions via MetaMask deep link or injected web3 provider, requiring the mobile user's account to pay gas.
   - *V2 Design:* Implement EIP-712 structured signing with a trusted ERC-2771 forwarder so that enterprise operators do not need individual gas balances to sign governance approvals.

---

## 2. PHYSICAL DEVICE TESTING (NOT PERFORMED IN CI)

- **Hardware Constraint:** The automated validation suite runs in headless macOS and Linux environments. Physical iOS and Android smartphones with touch displays, biometric sensors, and hardware cameras were not physically connected to the test runner.
- **Verified Aspects:**
  - TypeScript compilation passes with 0 errors (`npx tsc --noEmit`).
  - Expo Doctor passes 20 out of 20 diagnostic checks.
  - Native image picking and base64 hashing compile cleanly.
- **Physical Device Pre-Requisite:**
  - Testing on a physical smartphone requires setting `EXPO_PUBLIC_API_URL=http://<WORKSTATION_LAN_IP>:8000` in `.env` (loopback `127.0.0.1` connects to the phone itself, not the host machine).

---

## 3. POLYGON AMOY TESTNET MUTATION LOCK

- **Safeguard Status:** State-changing transactions on Polygon Amoy (Chain ID 80002) are strictly blocked by client-side guard `useBlockchainWallet.ts:377`.
- **Reasoning:**
  - Prevents accidental token spend or demonstration disruption due to public testnet gas volatility, block reorganization, or testnet faucet exhaustion.
  - Public testnet block times (2-5 seconds) introduce unpredictable delays during live demonstrations compared to local Hardhat instant mining.
- **Tested Functionality on Amoy:** Read-only queries, block height inspection, wallet category authorization verification, and plan existence checks.

---

## 4. PRODUCTION INFRASTRUCTURE REQUIREMENTS

To deploy TRUSTCHAIN into a live multi-tenant enterprise production environment, the following infrastructure steps must be completed:

1. **Dedicated Multi-Region RPC Nodes:**
   - Replace public RPC URLs with dedicated Infura, Alchemy, or QuickNode enterprise endpoints with automatic failover.
2. **Production Database Engine:**
   - Migrate from local SQLite (`trustchain.db`) to a managed PostgreSQL cluster (e.g. AWS RDS or GCP Cloud SQL) with read replicas and automated point-in-time recovery.
3. **Secret Management:**
   - Store webhook secrets, database credentials, and registrar private keys in AWS Secrets Manager or HashiCorp Vault rather than `.env` files.
4. **Rate Limiting & Web Application Firewall:**
   - Deploy Cloudflare or AWS WAF in front of FastAPI to enforce IP rate limiting and DDoS protection on public endpoints.

---

## 5. REMAINING SECURITY RISKS & RESIDUAL ASSESSMENTS

| Risk Item | Likelihood | Impact | Current Mitigation | Production Action Required |
| :--- | :---: | :---: | :--- | :--- |
| **Development Header Auth Leak** | Low | High | Blocked when `ENVIRONMENT=production`; logs prominent warning in dev mode. | Enforce CI/CD pipeline check ensuring `ENVIRONMENT=production` in release builds. |
| **Local Hardhat In-Memory Reset** | Medium | Low | Local test transactions reset if node process restarts. | Use persistent Hardhat state or staging network for multi-day demos. |
| **MetaMask Deep Link Callback Delay** | Low | Low | Manual transaction hash paste box provided as fallback. | Implement WalletConnect v2 for direct mobile websocket callbacks. |
| **Mobile Clock Skew** | Low | Medium | EIP-191 nonces have 5-minute expiry windows. | Validate client clock synchronization via NTP or server timestamp response. |

