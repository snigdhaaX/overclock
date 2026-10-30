# TRUSTCHAIN — Backend Action Items & Integration Specification
**Target Audience:** Kamesh (Lead Backend & Systems Engineer)  
**Author:** Trustchain Architecture & Mobile Engineering  
**Date:** October 31, 2026  
**Status:** PRIORITY IMPLEMENTATION ROADMAP FOR HACKATHON LIVE DEMO  

---

## 1. Context & Objectives

During frontend hardening and real-device testing, we integrated the mobile app with the FastAPI backend via `src/services/backendSync.ts` using our LAN address (`http://172.31.98.170:8000/api/v1`).

The Operations Analyst and Supply Chain Manager flows are now communicating with the live backend for:
- `GET /api/v1/suppliers`
- `POST /api/v1/approvals/{plan_id}/approve`
- `POST /api/v1/approvals/{plan_id}/reject`
- `POST /api/v1/approvals/{plan_id}/request-revision`
- `GET /api/v1/blockchain/verify/plan/{plan_id}`
- `GET /api/v1/chain/status`

To achieve 100% full-stack live demo readiness across all roles (particularly **Warehouse Operator** and **Blockchain Anchoring**), the following action items require your attention.

---

## 2. Priority Matrix Overview

| Priority | Area | Action Item | Urgency |
|---|---|---|---|
| **P0** | **Warehouse APIs** | Implement 6 Core Inbound/Outbound Warehouse Endpoints | Demo Critical |
| **P0** | **Governance Rule** | Enforce `CREATOR_CANNOT_DECIDE` Rule in Production DB / JWT | Demo Critical |
| **P1** | **Blockchain Proof** | Relay live Polygon Amoy transaction hash on plan sign-off | High |
| **P1** | **Supplier Schema** | Ensure `deliveryPerformance` is nullable in DB & responses | High |
| **P2** | **Token Expiry** | Implement refresh token rotation & 2-hour TTL revocation | Medium |

---

## 3. P0: Warehouse Operator API Endpoints

The Warehouse Operator mobile interface (Phase 4) currently uses local state fallback. To make warehouse actions persist to the backend and reflect on the Manager Command Centre in real time, implement the following endpoints under `/api/v1/warehouse`:

### 3.1. Inventory & SKU Lookup
- **Method:** `GET`
- **Route:** `/api/v1/warehouse/inventory`
- **Query Params:** `warehouse_id` (e.g. `WH-BLR`, `WH-MUM`), `search` (optional)
- **Response Schema:**
```json
[
  {
    "sku": "PRD-012",
    "name": "Automotive Microcontroller MCU-v4",
    "warehouseId": "WH-BLR",
    "binLocation": "BAY-B-14",
    "quantityOnHand": 840,
    "quantityReserved": 280,
    "quantityAvailable": 560,
    "unitCost": 45.0,
    "lastCycleCount": "2026-10-22T08:00:00Z"
  }
]
```

### 3.2. Barcode & Serial Verification
- **Method:** `POST`
- **Route:** `/api/v1/warehouse/scan`
- **Request Body:**
```json
{
  "barcode": "TC-PRD012-WHBLR-8921",
  "warehouseId": "WH-BLR",
  "scanType": "BARCODE_128"
}
```
- **Response Schema:**
```json
{
  "valid": true,
  "sku": "PRD-012",
  "batchNumber": "BAT-2026-088",
  "currentLocation": "BAY-B-14",
  "status": "IN_STOCK",
  "verifiedAt": "2026-10-31T02:30:00Z"
}
```

### 3.3. Goods Receipt / Inbound Processing
- **Method:** `POST`
- **Route:** `/api/v1/warehouse/receipts`
- **Request Body:**
```json
{
  "shipmentId": "SHP-101",
  "warehouseId": "WH-MUM",
  "operatorId": "usr_wh_001",
  "items": [
    {
      "sku": "PRD-012",
      "expectedUnits": 300,
      "receivedUnits": 298,
      "damagedUnits": 2,
      "condition": "ACCEPTABLE"
    }
  ],
  "notes": "Delivered via BlueDart express priority"
}
```
- **Response Schema:**
```json
{
  "receiptId": "REC-2026-0049",
  "status": "COMPLETED",
  "varianceDetected": true,
  "varianceNotes": "2 units damaged during ocean transit",
  "receivedAt": "2026-10-31T02:35:00Z"
}
```

### 3.4. Damage & Incident Reporting
- **Method:** `POST`
- **Route:** `/api/v1/warehouse/damage-reports`
- **Request Body:**
```json
{
  "sku": "PRD-012",
  "warehouseId": "WH-BLR",
  "damagedUnits": 12,
  "severity": "CRITICAL",
  "cause": "WATER_DAMAGE",
  "operatorId": "usr_wh_001",
  "photoUri": "https://storage.trustchain.internal/damage/dmg_9921.jpg",
  "quarantineLocation": "BAY-Q-01"
}
```
- **Response Schema:**
```json
{
  "reportId": "DMG-2026-0012",
  "quarantineAssigned": "BAY-Q-01",
  "disposition": "PENDING_INSPECTION",
  "createdAt": "2026-10-31T02:36:00Z"
}
```

### 3.5. Intra-Warehouse Stock Transfer Execution
- **Method:** `POST`
- **Route:** `/api/v1/warehouse/transfers`
- **Request Body:**
```json
{
  "planId": "RP-001",
  "sku": "PRD-012",
  "originWarehouse": "WH-BLR",
  "originBin": "BAY-B-14",
  "destinationWarehouse": "WH-MUM",
  "quantity": 280,
  "carrier": "BlueDart Logistics Fleet",
  "dispatchedBy": "usr_wh_001"
}
```
- **Response Schema:**
```json
{
  "transferId": "TRF-2026-8812",
  "status": "IN_TRANSIT",
  "trackingNumber": "BD-EXP-992104-IN",
  "dispatchedAt": "2026-10-31T02:37:00Z"
}
```

### 3.6. Operator Task Completion Check-off
- **Method:** `PATCH`
- **Route:** `/api/v1/warehouse/tasks/{taskId}/complete`
- **Request Body:**
```json
{
  "operatorId": "usr_wh_001",
  "completionNotes": "Pick and pack completed. Outbound container sealed."
}
```
- **Response Schema:**
```json
{
  "taskId": "TSK-001",
  "status": "COMPLETED",
  "completedAt": "2026-10-31T02:38:00Z"
}
```

---

## 4. P0: Self-Approval Governance Rule (`CREATOR_CANNOT_DECIDE`)

The frontend has already implemented the client-side check. In `backend/app/main.py`:
- We added the route check:
```python
if "analyst" in request.role.lower() or "analyst" in request.actor.lower():
    raise HTTPException(status_code=400, detail="CREATOR_CANNOT_DECIDE")
```
- **Action for Kamesh:**
  1. Ensure this is integrated with your JWT auth dependency (`get_current_user`).
  2. Verify that `user.role` from the verified token is checked against `plan.formulated_by_user_id`.
  3. Emit an immutable audit log whenever a rejection or unauthorized approval attempt occurs.

---

## 5. P1: Real Blockchain Anchoring on Polygon Amoy

The frontend `<ChainProof>` component renders:
- Network: **Polygon Amoy (Chain ID 80002)**
- Smart Contract: `0x33D476cE98f8a374C73D3eDa5FDE65917bA3e24A`

### Backend Requirements:
1. Ensure your `web3.py` or Ethereum client has access to an Amoy RPC (e.g., `https://rpc-amoy.polygon.technology/` or Infura/Alchemy endpoint).
2. On `POST /api/v1/approvals/{plan_id}/approve`, call the smart contract method:
   ```solidity
   function recordApproval(
       string memory planId,
       string memory approverRole,
       string memory decisionHash
   ) external returns (bytes32);
   ```
3. Return the real on-chain transaction hash (`0x...`) in the HTTP response.
4. On `GET /api/v1/blockchain/verify/plan/{plan_id}`, query the contract's event logs (`event PlanAuthorized(...)`) and return verification status and timestamp.

---

## 6. P1: Supplier Schema Data Integrity

### Requirement:
- Ensure the supplier table and serializer support nullable floats for `deliveryPerformance` and `on_time_rate`.
- When a supplier is recently onboarded (e.g. `SUP-03 Bharat Advanced Electronics`), return `null`:
```json
{
  "id": "SUP-03",
  "name": "Bharat Advanced Electronics",
  "category": "SMD Assembly & PCB Fab",
  "tier": 2,
  "location": "Electronics City, Bengaluru, Karnataka",
  "status": "Under Review",
  "riskScore": 35,
  "deliveryPerformance": null,
  "on_time_rate": null
}
```
*Note: Do not convert nulls to 0.0, as the frontend interprets null specifically as "Not enough history".*

---

## 7. P2: Token Expiration & Refresh Contract

The mobile app includes a 2-hour session lifetime:
1. Token response schema:
```json
{
  "accessToken": "ey...",
  "refreshToken": "rt...",
  "issuedAt": 1730342400000,
  "expiresAt": 1730349600000
}
```
2. When the access token expires, the client calls `POST /api/v1/auth/refresh` with `{ "refreshToken": "..." }`.
3. If refresh token is expired or revoked, return HTTP 401; the mobile app handles this by clearing secure storage and redirecting to the sign-in portal.

---

## 8. Verification & Quick Commands

To test your backend locally alongside the mobile app:
```bash
# 1. Start backend bound to 0.0.0.0
python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

# 2. Test self-approval blocked:
curl -X POST http://localhost:8000/api/v1/approvals/RP-001/approve \
  -H "Content-Type: application/json" \
  -d '{"planId":"RP-001","actor":"operations-analyst","role":"operations-analyst","notes":"Self approval"}'
# Expected response: HTTP 400 {"detail": "CREATOR_CANNOT_DECIDE"}

# 3. Test manager approval:
curl -X POST http://localhost:8000/api/v1/approvals/RP-001/approve \
  -H "Content-Type: application/json" \
  -d '{"planId":"RP-001","actor":"David Vance","role":"supply-chain-manager","notes":"Approved"}'
# Expected response: HTTP 200 {"success":true,"status":"Approved","txHash":"0x..."}

# 4. Check supplier null performance:
curl http://localhost:8000/api/v1/suppliers
```

