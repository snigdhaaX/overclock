# TRUSTCHAIN — COMPLETE MOBILE TESTING CHECKLIST & OPERATIONAL RUNBOOK

**Project:** TRUSTCHAIN — AI-Powered Supply Chain Disruption Intelligence, Recovery & Governance Platform  
**Target Environment:** React Native Mobile Client (Expo SDK 52) & Hardhat EVM Node (Chain ID `31337`)  
**Audience:** Demonstration Operators, QA Testers, Hackathon Judges  
**Date:** October 31, 2026  

---

## 1. PRE-TEST ENVIRONMENT SETUP

| Check | Item | Verification Command / Step | Expected Result | Pass / Fail |
| :---: | :--- | :--- | :--- | :---: |
| [ ] | **Hardhat Node Active** | Run `cd blockchain && npx hardhat node` | RPC listening on `http://127.0.0.1:8545` | PASS |
| [ ] | **Contract Deployed** | Check block #1 | Bytecode exists at `0x5FbDB2315678afecb367f032d93F642f64180aa3` | PASS |
| [ ] | **FastAPI Server Running** | Run `uvicorn backend.app.main:app --host 0.0.0.0 --port 8000` | `GET /health` returns `HEALTHY` | PASS |
| [ ] | **Expo Server Running** | Run `npx expo start` | QR code displayed, bundle compiles cleanly | PASS |
| [ ] | **Environment Configuration** | Inspect `.env` file | `EXPO_PUBLIC_API_URL` points to backend | PASS |

---

## 2. PHYSICAL DEVICE (ANDROID / IOS) & LAN CONFIGURATION

If testing on a physical smartphone (e.g., Samsung Galaxy, Google Pixel, iPhone) over local Wi-Fi:

1. **Obtain Workstation IP:**
   - macOS / Linux: `ifconfig | grep "inet " | grep -v 127.0.0.1` (e.g. `192.168.1.145`)
   - Windows: `ipconfig` -> `IPv4 Address`
2. **Update `.env`:**
   ```env
   EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:8000
   EXPO_PUBLIC_HARDHAT_RPC_URL=http://<YOUR_LAN_IP>:8545
   EXPO_PUBLIC_LOCAL_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
   ```
3. **Firewall Allowlist:**
   - Ensure macOS / Windows Firewall permits inbound connections on ports `8000` (FastAPI) and `8545` (Hardhat JSON-RPC).
4. **Android Emulator Shortcut:**
   - Android Emulator maps host `localhost` to `10.0.2.2`. If testing exclusively on the Android Emulator, set `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000`.

---

## 3. OPERATIONS ANALYST MOBILE WORKFLOW

| Check | Screen | Action | Expected Behavior |
| :---: | :--- | :--- | :--- |
| [ ] | **Role Selection** | Tap **Operations Analyst** | Navigates to Analyst dashboard (`/operations-analyst`) |
| [ ] | **Disruptions** | Tap **Singapore Port Vessel Congestion** | Shows financial impact ($142,000 at risk, 4 orders) |
| [ ] | **Formulate** | Tap **Formulate Recovery Strategy** | Generates candidate strategies (Plan A: WH-BLR transfer) |
| [ ] | **Plan Review** | Inspect `<PlanHashCard>` | Displays 64-character RFC 8785 canonical plan hash |
| [ ] | **Simulation** | Inspect Simulation Digest | Shows deterministic Monte Carlo hash (no `0x1111...`) |
| [ ] | **Wallet Connect** | Connect Analyst Wallet (`0x7099...`) | EIP-191 challenge verified; shows Category `0x01` |
| [ ] | **Anchor Plan** | Tap **Sign & Anchor on Blockchain** | Broadcasts `anchorPlan`; card displays `SUBMITTED` -> `CONFIRMED` |
| [ ] | **Sign Out** | Tap profile sign-out | Clears session and returns safely to Role Selection |

---

## 4. SUPPLY CHAIN MANAGER GOVERNANCE WORKFLOW

| Check | Screen | Action | Expected Behavior |
| :---: | :--- | :--- | :--- |
| [ ] | **Role Selection** | Tap **Supply Chain Manager** | Navigates to Manager dashboard (`/supply-chain-manager`) |
| [ ] | **Approvals** | Tap **Approvals Portal** tab | Displays newly anchored plan with badge `PENDING_APPROVAL` |
| [ ] | **Plan Audit** | Inspect 15-Point Verification Card | DB Hash matches On-Chain Hash; Analyst shown as Creator |
| [ ] | **Anti-Self-Approval** | Attempt approval with Analyst wallet | Transaction reverts immediately with `CreatorCannotDecide` |
| [ ] | **Manager Wallet** | Connect Manager Wallet (`0x3C44...`) | Verified with Category `0x02` (Supply Chain Manager) |
| [ ] | **Approve Plan** | Tap **Submit On-Chain Approval** | Broadcasts `approvePlan`; card transitions to `CONFIRMED` |
| [ ] | **Status Update** | Inspect plan status banner | Status updates from `PENDING_APPROVAL` to `APPROVED` |
| [ ] | **Eligibility** | Check Execution Eligibility | Flags transition from `BLOCKED` to `ELIGIBLE` |

---

## 5. OPERATIONAL EXECUTION & EVIDENCE ANCHORING

| Check | Screen | Action | Expected Behavior |
| :---: | :--- | :--- | :--- |
| [ ] | **Role Selection** | Return to **Operations Analyst** | Navigates to Analyst role |
| [ ] | **Execution** | Open approved plan execution screen | Displays green **Execution Eligible** badge |
| [ ] | **File Picker** | Tap **Select Delivery Document / Photo** | Opens native document/photo picker |
| [ ] | **Binary Hashing** | Select delivery proof (image/PDF) | Computes SHA-256 fingerprint over actual file bytes |
| [ ] | **Anchor Evidence**| Tap **Anchor Evidence On-Chain** | Broadcasts `anchorExecution` with calculated fingerprint |
| [ ] | **Confirmation** | Observe Transaction Status Card | Transaction confirms in new block; status becomes `EXECUTED` |

---

## 6. AUDIT LEDGER & EVENT VERIFICATION

| Check | Screen | Action | Expected Behavior |
| :---: | :--- | :--- | :--- |
| [ ] | **Audit Ledger** | Tap **Audit Ledger** in Manager tab | Displays chronological stream of smart contract events |
| [ ] | **Event 1** | Inspect `PlanAnchored` event | Displays Plan ID, Version 1, Block #4, Creator `0x7099...` |
| [ ] | **Event 2** | Inspect `PlanApproved` event | Displays Stage 0x02, Block #5, Approver `0x3C44...` |
| [ ] | **Event 3** | Inspect `ExecutionAnchored` event | Displays Evidence Fingerprint, Block #6, ExecutedBy `0x7099...` |
| [ ] | **Event Drawer** | Tap any event card | Drawer slides up with full 66-char tx hash, gas, and copy button |
| [ ] | **Deep Link** | Tap **Inspect Plan in Approvals** | Direct navigation to the corresponding plan audit page |

---

## 7. NEGATIVE & SECURITY TEST CASES

| Test ID | Scenario | Input / Action | Expected Result | Pass / Fail |
| :---: | :--- | :--- | :--- | :---: |
| **NEG-01** | **Anti-Self-Approval** | Creator attempts to approve own plan | Smart contract reverts: `CreatorCannotDecide` | PASS |
| **NEG-02** | **Duplicate Plan Anchoring** | Submit same plan hash twice | Smart contract reverts: `PlanHashAlreadyAnchored` | PASS |
| **NEG-03** | **Premature Execution** | Anchor evidence before approval | Smart contract reverts: `StagesNotCompleted` | PASS |
| **NEG-04** | **Reused Evidence Hash** | Anchor same evidence for second plan | Smart contract reverts: `EvidenceHashAlreadyUsed` | PASS |
| **NEG-05** | **Expired Auth Nonce** | Submit signature after 5-min TTL | Backend returns `401 Unauthorized: Nonce expired` | PASS |
| **NEG-06** | **Unauthenticated Prod Headers** | Call API with `X-User-Id` in prod mode | Backend returns `401 Unauthorized` | PASS |
| **NEG-07** | **Malformed Tx Hash Input** | Enter `0x123` into manual tx input | UI validates and displays `Invalid 66-character 0x hex` | PASS |
| **NEG-08** | **Oversized Evidence File** | Select file > 10 MB in execution screen | UI displays error: `File size exceeds 10 MB limit` | PASS |

