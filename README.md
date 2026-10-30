# TRUSTCHAIN: Unified Supply Chain Disruption Intelligence, Recovery & Governance

> Enterprise-grade platform uniting real-time AI supply chain disruption intelligence with cryptographic accountability and multi-signature governance anchored on Polygon Amoy.

---

## 🌟 Platform Overview

**TRUSTCHAIN** bridges physical supply chain logistics with cryptographic transparency:
1. **Disruption Intelligence & Risk Scoring:** Real-time event detection (port congestion, geopolitical conflict, severe weather, labor strikes) with algorithmic impact analysis across purchase orders, shipments, inventory, and supplier SLA exposure.
2. **AI-Powered Recovery Simulation:** Automated generation of multi-action recovery plans (re-route, alternate supplier procurement, expedited warehouse transfer) evaluated across cost, time, and SLA feasibility.
3. **Cryptographic Accountability:** RFC 8785 canonical SHA-256 digests of operational plans, simulations, and execution evidence anchored immutably to smart contracts.
4. **On-Chain Governance & Separation of Duties:** Deployed on Polygon Amoy, enforcing role separation where recovery plan authors cannot self-approve (`CreatorCannotDecide`), preventing single-point failure or unauthorized reroutes.
5. **Stakeholder Multi-Client Experience:** 
   - **Expo / React Native Mobile App:** Built for Operations Analysts, Supply Chain Managers, and Warehouse Operators on the move.
   - **Web Verification Centre & Governance Dashboard:** React 19 / Vite audit portal for verifying operational records against blockchain state and detecting tampering in real time.

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
                   │  • SQLite / PostgreSQL Operational Store     │
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
├── backend/                  # FastAPI backend with blockchain integration
│   ├── app/
│   │   ├── blockchain/       # RFC 8785 hash engine, EIP-191 service, Web3 verification
│   │   └── main.py           # FastAPI entrypoint
│   ├── requirements.txt      # Python dependencies
│   └── tests/                # 34 passing Python tests (hash, wallet, tx, routes)
├── blockchain/               # Hardhat Ethereum / Polygon environment
│   ├── contracts/            # TrustChainGovernance.sol
│   ├── deployments/          # Amoy network artifacts & addresses
│   ├── frontend/             # React 19 / Vite Blockchain Verification Dashboard
│   ├── scripts/              # Local demonstration & deployment scripts
│   └── test/                 # 94 passing Solidity governance tests
├── src/                      # Mobile application (Expo Router / React Native)
│   ├── features/
│   │   ├── operations-analyst/     # Disruption intelligence, recovery cards
│   │   ├── supply-chain-manager/   # Network maps, routes, approval flows
│   │   └── warehouse-operator/     # Scanning, cargo check, floor maps
├── TRUSTCHAIN_Basic_Framework/ # Decision-support and risk analysis prototypes
├── .env.example              # Environment variables template
└── README.md
```

---

## 🧪 Automated Testing Status

| Component | Framework | Tests | Status |
|---|---|---|---|
| Smart Contracts | Hardhat / Mocha / Chai | 94 passing | ✅ 100% Green |
| Backend & Governance Services | Pytest / Web3.py / FastAPI | 34 passing | ✅ 100% Green |
| Frontend Verification Centre | Vite / TypeScript | 0 errors | ✅ Production build verified |
| Mobile Application | TypeScript / Expo Lint | Validated | ✅ Verified |
| **Total Test Suite** | | **128 Passing** | **All Passing** |

---

## 🚀 Quick Start Guide

### 1. Smart Contract & Hardhat
```bash
cd blockchain
npm install
npx hardhat test       # Runs 94 unit & governance tests
```

### 2. Backend API
```bash
# In repository root
pip install -r backend/requirements.txt
python -m pytest backend/tests/ -v        # Runs 34 Python tests
uvicorn backend.app.main:app --reload --port 8000
```

### 3. Web Verification Centre & Governance UI
```bash
cd blockchain/frontend
npm install
npm run dev            # Serves on http://localhost:5173
```

### 4. Mobile Application (Expo / React Native)
```bash
# In repository root
npm install
npx expo start
```

---

## 🔒 Security & Privacy

- Private keys, seed phrases, and live RPC secrets are strictly excluded via `.gitignore`.
- Refer to `.env.example` in root, `blockchain/`, and `blockchain/frontend/` for configuration templates.
- Backend never holds custodial private keys; all transactions are signed client-side via MetaMask or authorized mobile wallets.

---

## 📄 License

MIT License. Designed and engineered for the OVERCLOCK '26 Hackathon.
