# TRUSTCHAIN: Unified Supply Chain Disruption Intelligence, Recovery & Governance

> Enterprise-grade platform uniting real-time AI supply chain disruption intelligence with cryptographic accountability and multi-signature governance anchored on Polygon Amoy.

---

## 🌟 Platform Overview

**TRUSTCHAIN** bridges physical supply chain logistics with cryptographic transparency and multi-tier operational resilience:
1. **Disruption Intelligence & Risk Scoring:** Real-time event detection (port congestion, geopolitical conflict, severe weather, inventory stockouts) with root-cause impact analysis traversing purchase orders, shipments, inventory buffers, and customer SLA exposure.
2. **AI-Powered Recovery Simulation:** Automated formulation of multi-action recovery plans (air freight expedite, regional stock transfer, alternate supplier emergency sourcing, split fulfillment) evaluated across cost, time, and SLA restitution.
3. **Multi-Role Mobile Experience (All 5 Roles Complete):**
   - **Operations Analyst:** Disruption tracking, timeline incident diagnostics, visual impact flow mapping, and recovery plan formulation.
   - **Supply Chain Manager:** Network-wide corridor mapping (`react-native-maps`), executive approvals with mandatory rejection reasoning, supplier scorecards, and financial SLA exposure.
   - **Warehouse Operator:** Native camera barcode/QR receiving (`expo-camera`), photographic damage quarantine (`expo-image-picker`), bin-level inventory balancing, stock transfers, and SVG floor maps.
   - **Procurement Approver:** Statutory financial delegation limit enforcement (₹25.0L ceiling), 4-tier vendor comparison matrix, PO lifecycle management, and 6-dimension risk analysis radars.
   - **Administrator:** Enterprise user provisioning, 5-role RBAC permission matrix configuration, facility/warehouse capacity management, external integration cockpit, global risk policies, and immutable audit logs.
4. **Cryptographic Accountability & Governance:** RFC 8785 canonical SHA-256 digests of operational plans, simulations, and execution evidence anchored to smart contracts on Polygon Amoy.
5. **Separation of Duties:** Enforces on-chain and application-tier role separation where recovery plan authors cannot self-approve (`CreatorCannotDecide`), preventing single-point failure or unauthorized reroutes.

---

## 🏗️ Unified Architecture

```
                                  ┌────────────────────────┐
                                  │   TRUSTCHAIN Clients   │
                                  └────┬──────────────┬────┘
                                       │              │
                   ┌───────────────────┴──┐        ┌──┴───────────────────┐
                   │  Mobile App (Expo)   │        │  Web Audit & Gov UI  │
                   │  React Native / iOS  │        │  React 19 / Vite     │
                   │  Android / Web       │        │  Verification Centre │
                   └──────────┬───────────┘        └──┬───────────────────┘
                              │                       │
                              │ EIP-191 Auth /        │ Web3.js / MetaMask /
                              │ REST Requests         │ Contract Interop
                              │                       │
                              ▼                       ▼
                   ┌──────────────────────────────────────────────┐
                   │               FastAPI Backend                │
                   │  • RFC 8785 Canonical Hashing Engine         │
                   │  • Impact Graph & Simulation Services        │
                   │  • EIP-191 Nonce Signatures & Wallet Linking │
                   │  • Web3.py Blockchain Tx & Event Indexer     │
                   │  • PostgreSQL / SQLite Operational Store     │
                   └──────────────────────┬───────────────────────┘
                                          │
                                          │ Anchoring & Verification
                                          │ (Hashes only, zero PII)
                                          ▼
                   ┌──────────────────────────────────────────────┐
                   │    Polygon Amoy Testnet (Chain ID: 80002)    │
                   │          TrustChainGovernance.sol            │
                   │  0x33D476cE98f8a374C73D3eDa5FDE65917bA3e24A │
                   └──────────────────────────────────────────────┘
```

---

## 📱 Five Enterprise Mobile Roles (`src/`)

TRUSTCHAIN delivers an 81-screen mobile architecture built with **Expo SDK 58**, **React Native 0.88.1**, **React 19.3.0**, and **Expo Router**:

### 1. Operations Analyst (14 Screens)
- **Home Dashboard (`/operations-analyst/home`):** Operational disruption feed, Singapore port bottleneck (`SHP-101`) spotlight, and active threat telemetry.
- **Disruptions & Impact (`/operations-analyst/disruptions/[id]/impact`):** Incident timeline and interactive SVG impact flow mapping to customer orders (`ORD-9921`, `ORD-9924`).
- **Predictive Risk & Orders (`/operations-analyst/risk`, `/orders`):** SVG risk donut chart and revenue-at-risk order catalog.
- **Recovery Lifecycle (`/operations-analyst/recovery/*`):** 5-step wizard (Create $\rightarrow$ Actions $\rightarrow$ Multi-Criteria Simulation $\rightarrow$ AI Recommendations $\rightarrow$ Executive Review $\rightarrow$ Execution Tracker).

### 2. Supply Chain Manager (20 Screens)
- **Executive Command Center (`/supply-chain-manager/home`):** Global supply health metrics and high-priority approvals queue.
- **Approval Decision (`/supply-chain-manager/approvals/[id]/decision`):** Executive sign-off modal with mandatory 10-character rejection reasoning and audit logging.
- **Corridor Network Map (`/supply-chain-manager/network`):** Interactive geospatial map (`react-native-maps`) rendering multi-tier transit corridors with precalculated GeoJSON polyline routes.
- **Suppliers & Facilities (`/supply-chain-manager/suppliers`, `/warehouses`):** Vendor reliability scorecards, capacity gauges, and warehouse-to-supplier topology.
- **Blockchain Audit Trail (`/supply-chain-manager/audit`):** Governance audit events with actor attribution and cryptographic transaction proofs.

### 3. Warehouse Operator (15 Screens)
- **Shift Overview (`/warehouse-operator/home`, `/tasks`):** Inbound dock queue, quarantine hold alerts, and step-by-step task checklists.
- **Barcode / QR Scanner (`/warehouse-operator/scan`):** Hardware camera scanning via `expo-camera` with targeting reticle, torch toggle, and manual SKU text fallback.
- **Goods Receiving (`/warehouse-operator/receiving`):** Dock delivery manifest verification with quantity steppers and goods receipt issuance.
- **Damage Quarantine (`/warehouse-operator/damage-report`):** Photographic damage reporting via `expo-image-picker` with quarantine status routing.
- **Inventory Balancing & Moves (`/warehouse-operator/inventory`, `/stock-transfer`):** Real-time bin-level stock steppers and inter-facility transfers.
- **Facility Floor Map (`/warehouse-operator/warehouse-map`):** Interactive SVG layout of cold storage, receiving docks, and quarantine bays.

### 4. Procurement Approver (11 Screens)
- **Procurement Cockpit (`/procurement-approver/home`):** Requisition counts, active vendor ratios, and counterparty risk telemetry.
- **Statutory Ceiling Enforcement (`/procurement-approver/requests/[id]`):** Approval authority limits enforced on requisitions up to ₹25,00,000 (dual-executive sign-off required above).
- **Vendor Comparison Matrix (`/procurement-approver/suppliers/compare`):** Side-by-side 4-tier vendor matrix evaluating unit price, MOQ, lead time, and compliance ratings.
- **Purchase Orders (`/procurement-approver/purchase-orders`):** Formal PO tracking, status lifecycles, and cancellation controls.
- **Risk Radar (`/procurement-approver/risk-analysis`):** 6-dimension counterparty risk assessment (ESG, Cyber, Geopolitical, Operational, Financial, Regulatory).

### 5. Administrator (8 Screens — Phase 6 Complete)
- **Admin Control Center (`/administrator/home`):** Real-time system telemetry, active user counts, role distributions, and recent governance activities.
- **User Management (`/administrator/users`):** User directory, multi-filter search, user provisioning modal (`UserFormModal`), facility access tags, and safe activation/deactivation. Includes safeguards preventing deactivation of the last active administrator.
- **Role & Permission Matrix (`/administrator/roles`):** Granular RBAC permissions categorized by Read, Create, Update, Delete, Approval, and Admin. Prevents revoking root governance privileges.
- **Organisations & Facilities (`/administrator/organizations`):** Multi-tenant organization records, warehouse capacity utilization bars, and hub registration.
- **External Integrations Cockpit (`/administrator/integrations`):** Real-time connectivity monitor for FastAPI, PostgreSQL, ML engine, Polygon Amoy, and Notification streams with live test probe actions.
- **Global Risk Policies (`/administrator/policies`):** Configurable disruption escalation thresholds, financial delegation caps (₹25.0L), supplier SLA minimums, and session security policies.
- **Audit & System Health (`/administrator/audit`):** Dual-tab governance ledger displaying immutable audit events and live service latency/uptime diagnostics.
- **Profile & Settings (`/administrator/profile`):** Administrative profile, authority overview (`admin:all`), credential security, and session termination.

---

## ⛓️ Smart Contract Details (`blockchain/contracts/TrustChainGovernance.sol`)

- **Polygon Amoy Verified Contract:** `0x33D476cE98f8a374C73D3eDa5FDE65917bA3e24A` (Chain ID: `80002`)
- **Local DevNet Contract:** `0x5FbDB2315678afecb367f032d93F642f64180aa3` (Chain ID: `31337`)
- **Action Categories & Bitmask:**
  - `0x01`: Operations Analyst (Plan Authoring)
  - `0x02`: Supply Chain Manager (Stage Approval)
  - `0x04`: Warehouse Approver (Stage Approval)
  - `0x08`: Procurement Approver (Stage Approval)
  - `0x10`: Organization Administrator
- **Key Invariants:**
  - `CreatorCannotDecide`: The author of a recovery plan cannot approve or reject their own submission.
  - `Multi-Stage Approval`: Multi-action plans require approval from distinct authorized role wallets.
  - `Zero PII / Off-Chain Data`: Only deterministic 32-byte hashes (`planHash`, `simulationHash`, `evidenceHash`) are recorded on-chain.

---

## 📁 Repository Structure

```
.
├── backend/                      # FastAPI backend prototype with blockchain integration
│   ├── app/
│   │   ├── blockchain/           # RFC 8785 hash engine, EIP-191 service, Web3 verification
│   │   └── main.py               # FastAPI entrypoint (/health, /blockchain)
│   ├── requirements.txt          # Python dependencies
│   └── tests/                    # 34 passing Python tests (hash, wallet, tx, routes)
├── blockchain/                   # Hardhat Ethereum / Polygon environment
│   ├── contracts/                # TrustChainGovernance.sol
│   ├── deployments/              # Amoy network artifacts & addresses
│   ├── frontend/                 # React 19 / Vite Blockchain Verification Dashboard
│   ├── scripts/                  # Deployment & verification scripts
│   └── test/                     # 94 passing Solidity governance tests
├── ml-oc/                        # Machine learning models & adaptive scoring experiments
│   ├── suggestions.ipynb         # Model training & recovery suggestion notebook
│   ├── supplier_scores.csv       # Multi-criteria supplier performance dataset
│   └── trustchain_state.pkl      # Pre-trained pipeline state & weights
├── disruption.ipynb              # Exploratory scikit-learn disruption classifier
├── src/                          # Mobile Application (Expo Router / React Native)
│   ├── app/                      # File-based route tree (91 routes across 5 roles)
│   │   ├── (auth)/               # Role-specific direct login portals
│   │   ├── (public)/             # Onboarding, signin, signup, forgot-password, workspace
│   │   └── (protected)/          # Authenticated enterprise role portals:
│   │       ├── operations-analyst/     # 14 Analyst screens
│   │       ├── supply-chain-manager/   # 20 Manager screens
│   │       ├── warehouse-operator/     # 15 Warehouse screens
│   │       ├── procurement-approver/   # 11 Procurement screens
│   │       └── administrator/          # 8 Administrator screens (Phase 6)
│   ├── features/                 # Modular domain components, services, types & mocks
│   │   ├── operations-analyst/
│   │   ├── supply-chain-manager/
│   │   ├── warehouse-operator/
│   │   ├── procurement-approver/
│   │   └── administrator/
│   ├── components/               # Core shared UI library (ScreenContainer, BrandLogo, etc.)
│   ├── constants/                # Colors, typography, spacing, theme tokens
│   ├── hooks/                    # useAuth, useTheme, useColorScheme
│   ├── services/                 # auth.ts, validation.ts
│   └── types/                    # auth.ts, roles.ts, declarations.d.ts
├── TRUSTCHAIN_Basic_Framework/   # Initial conceptual models & architecture documents
├── TRUSTCHAIN_FRONTEND_AUDIT_REPORT.md # Exhaustive forensic audit report (1,075 lines)
├── package.json                  # Mobile application package configuration
├── tsconfig.json                 # Strict TypeScript configuration
└── README.md
```

---

## 🧪 Automated Testing Status

| Component | Framework / Tool | Tests / Checks | Status |
|---|---|---|---|
| Smart Contracts | Hardhat / Mocha / Chai | 94 passing | ✅ 100% Green |
| Backend & Governance Services | Pytest / Web3.py / FastAPI | 34 passing | ✅ 100% Green |
| Frontend Verification Centre | Vite / TypeScript | 0 errors | ✅ Production build verified |
| Mobile TypeScript Compilation | `npx tsc --noEmit` | 0 errors | ✅ 100% Strict Type Safety |
| Mobile Code Quality & Linter | `npx expo lint --quiet` | 0 errors / 0 warnings | ✅ React 19 Clean Compliance |
| Expo Configuration & Health | `npx expo-doctor` | 20/20 checks passed | ✅ Zero Incompatibilities |
| Mobile JS Bundle Compilation | Metro Bundler (Android) | Full bundle built | ✅ Ready for Production |
| **Total Test Suite** | | **128 Passing + 3 Mobile Checks** | **All 100% Passing** |

---

## 🚀 Quick Start Guide

### 1. Mobile Application (React Native / Expo)
```bash
# In repository root
npm install

# Start the Expo development server
npx expo start

# Run quality checks
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

### 2. Smart Contract & Hardhat Governance
```bash
cd blockchain
npm install
npx hardhat test       # Runs 94 unit & governance tests
```

### 3. Backend API Services
```bash
# In repository root
pip install -r backend/requirements.txt
python -m pytest backend/tests/ -v        # Runs 34 Python tests
uvicorn backend.app.main:app --reload --port 8000
```

### 4. Web Verification Centre & Governance UI
```bash
cd blockchain/frontend
npm install
npm run dev            # Serves on http://localhost:5173
```

### 5. Machine Learning Experiments
```bash
# In ml-oc/ directory
jupyter notebook ml-oc/suggestions.ipynb
```

---

## 🔒 Security & Privacy

- Private keys, seed phrases, and live RPC secrets are strictly excluded via `.gitignore`.
- Refer to `.env.example` in root, `blockchain/`, and `blockchain/frontend/` for configuration templates.
- Backend never holds custodial private keys; all transactions are signed client-side via MetaMask or authorized mobile wallets.
- All Administrator role features enforce last-admin lockout prevention and root RBAC privilege immutability.

---

## 📄 License

MIT License. Designed and engineered for the OVERCLOCK '26 Hackathon.
