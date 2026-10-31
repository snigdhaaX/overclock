# TRUSTCHAIN — MOBILE DEMONSTRATION GUIDE

**Project:** TRUSTCHAIN — AI-Powered Supply Chain Disruption Intelligence, Recovery & Governance Platform  
**Target Environment:** React Native (Expo SDK 52) Mobile Application & Hardhat Local Node (Chain ID 31337)  
**Target Audience:** Hackathon Judges, Investors, Solution Architects & Demonstration Operators  
**Date:** October 31, 2026  

---

## 1. PRE-FLIGHT ENVIRONMENT SETUP

A complete live demonstration requires three terminal processes running on your workstation.

### Terminal 1 — Local Hardhat Blockchain Node
Start the local EVM node (Paris hardfork, Chain ID 31337):
```bash
cd blockchain
npx hardhat node
```
*Verification:* The terminal should display `Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/` and list 20 pre-funded test accounts. Leave this terminal open.

---

### Terminal 2 — FastAPI Unified Backend
Start the FastAPI server:
```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Verification:* Check `http://localhost:8000/health`. It should return:
```json
{
  "status": "HEALTHY",
  "service": "TRUSTCHAIN-UNIFIED-API",
  "modules": ["blockchain_governance", "supply_chain_intelligence"]
}
```

---

### Terminal 3 — Expo React Native Mobile App
Start the Expo development server:
```bash
npx expo start
```
*Options:*
- Press `i` to launch in the **iOS Simulator**.
- Press `a` to launch in the **Android Emulator**.
- Scan the QR code using the **Expo Go** app on your physical mobile phone.

---

## 2. PHYSICAL ANDROID & WI-FI CONFIGURATION

When demonstrating on a physical Android device or iPhone connected over Wi-Fi:

1. **Find Workstation LAN IP:**
   - macOS / Linux: `ifconfig | grep "inet " | grep -v 127.0.0.1` (e.g. `192.168.1.145`)
   - Windows: `ipconfig` (IPv4 Address)
2. **Configure Root `.env`:**
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.145:8000
   EXPO_PUBLIC_HARDHAT_RPC_URL=http://192.168.1.145:8545
   EXPO_PUBLIC_LOCAL_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
   ```
3. **Connect Mobile Device to Same Wi-Fi Network.**
4. **Android Emulator Shortcut:**
   If using Android Studio Emulator, loopback to the host machine is automatically handled via `http://10.0.2.2:8000`.

---

## 3. PRE-CONFIGURED DISPOSABLE TEST WALLETS

Use these pre-funded Hardhat default accounts during your demonstration:

| Role | Address | Private Key | Category Mask |
| :--- | :--- | :--- | :---: |
| **Operations Analyst** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` | `0x01` |
| **Supply Chain Manager** | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` | `0x02` |

---

## 4. STEP-BY-STEP LIVE DEMONSTRATION WORKFLOW

### Step 1: Operations Analyst — Disruption Detection & Plan Anchoring
1. Open the mobile app. On the Role Selection portal, tap **Operations Analyst**.
2. On the home dashboard, tap the **Singapore Vessel Port Congestion** disruption card (`SHP-101`).
3. Point out the real-time financial impact metrics: **$142,000 Revenue at Risk**, **4 Affected Orders**.
4. Tap **Formulate Recovery Strategy**.
5. Select **Plan A — Stock Transfer from WH-BLR** ($14,200 estimated cost).
6. Tap **Review Plan & Anchor**.
7. In the **Plan Review & Submit** screen, show the judges:
   - **Canonical Plan Hash (`<PlanHashCard>`):** 64-char SHA-256 digest calculated via RFC 8785 JSON canonicalization.
   - **External Evidence Manifest Card:** External intelligence Merkle root.
   - **Simulation Digest:** Deterministic digest derived from the Monte Carlo simulation engine.
8. Tap **Sign & Anchor on Blockchain**.
9. The **Transaction Status Card** immediately transitions:
   - `SUBMITTED` -> `PENDING` -> `CONFIRMED (Block #4)`.
10. Tap **Sign Out** to return to the Role Selection screen.

---

### Step 2: Supply Chain Manager — 15-Point Integrity Audit & Governance Approval
1. On the Role Selection portal, tap **Supply Chain Manager**.
2. Tap the **Approvals** portal tab.
3. Tap on the newly submitted plan **RP-001**.
4. Point out the **15-Point Cryptographic Integrity Audit Card**:
   - Highlight that the Database Plan Hash and On-Chain Hash match 100%.
   - Point out that the Analyst is recognized as the authorized creator.
   - Point out that the plan is in status `PENDING_APPROVAL`.
5. Tap **Governance Decision**.
6. **Live Security Demonstration (Anti-Self-Approval):**
   - Explain that if an analyst attempts to approve their own plan, the smart contract strictly reverts with `CreatorCannotDecide`.
7. As the Supply Chain Manager, select **Approve Plan**, select Policy **RP-POL-04 (Expenditure Authorization)**, and tap **Submit On-Chain Approval**.
8. Observe the status card transition to `CONFIRMED (Block #5)` and plan status update to `APPROVED`.

---

### Step 3: Operations Analyst — Operational Execution & Evidence Anchoring
1. Return to the **Operations Analyst** role.
2. Tap **Active Recoveries** and select **RP-001**.
3. Tap **Execution Tracking & Dispatch**.
4. Point out that **Execution Eligibility** is now active because all required governance stages have signed off.
5. Under **Upload Operational Delivery Proof**, tap **Select Delivery Document / Photo**.
6. Select a bill of lading or delivery receipt image.
7. Show that the app calculates a genuine **SHA-256 Evidence Fingerprint** over the file binary content.
8. Tap **Anchor Evidence On-Chain**.
9. Observe the transaction confirm in Block `#6` with on-chain status transitioning to `EXECUTED`.

---

### Step 4: Auditor / Executive — Immutable Audit Ledger
1. Return to **Supply Chain Manager** and tap the **Audit Ledger** tab.
2. Show the real-time stream of indexed smart contract events:
   - `PlanAnchored` (Block #4)
   - `PlanApproved` (Block #5)
   - `ExecutionAnchored` (Block #6)
3. Tap on any event card to open the **Transaction Detail Drawer**:
   - Inspect full 66-character transaction hashes, block numbers, and gas used.
   - Click **Copy Hash** to show clipboard integration.
   - Tap **Inspect Plan in Approvals Portal** to deep-link directly into the verified plan.

---

## 5. TROUBLESHOOTING

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **"Network request failed" on mobile** | Mobile cannot reach `localhost:8000` | In `.env`, set `EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:8000`. Ensure workstation firewall allows port 8000 and 8545. |
| **"Transaction reverted on-chain"** | Creator attempted to self-approve | Switch wallet to Supply Chain Manager (`0x3C44...`). Creator cannot approve their own plan. |
| **"Plan already anchored"** | Plan version 1 already exists on-chain | Increment version number or create a new recovery plan ID. |
| **Hardhat node crashes or resets** | Ephemeral memory reset | Re-run `test_phase6_e2e_acceptance.py` to redeploy contract and re-register test wallets. |

