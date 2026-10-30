# TRUSTCHAIN — FUTURE CONTRACT V2 TECHNICAL DESIGN SPECIFICATION

**Date:** 2026-10-31  
**Project:** TRUSTCHAIN Governance Smart Contract V2 Specification  
**Notice:** This document is a technical design specification for a future smart contract upgrade. The currently deployed `TrustChainGovernance.sol` contract (`0x33D4...` on Amoy, `0x5FbD...` on Hardhat) remains immutable and untouched.

---

## 1. OBJECTIVE & ARCHITECTURAL MOTIVATION
While `TrustChainGovernance.sol` (V1) is operationally sound and passes all 94 scenario tests, this V2 specification catalogs four architectural enhancements to:
1. Eliminate public mempool front-running on execution evidence.
2. Prevent front-running of administrative action policy updates.
3. Eliminate RPC memory exhaustion during historical governance decision queries.
4. Save 20,000 gas per anchored recovery plan version through optimal storage slot packing.

---

## 2. PROPOSED ARCHITECTURAL ENHANCEMENTS

### Proposal 1: Designated Executor Binding
- **Vulnerability Addressed:** In V1, any wallet holding `EXECUTOR_MASK` in the owning organization can submit `anchorExecution`. If Analyst Alice broadcasts the transaction in a public mempool, Analyst Bob could front-run it, stealing the on-chain attribution.
- **V2 Specification:**
  - Add `address designatedExecutor` to `PlanVersion`.
  - When the final approval stage is satisfied via `approvePlan`, allow the approver to optionally designate an authorized executor:
    ```solidity
    function approvePlanWithExecutor(bytes32 planId, uint32 version, uint8 stage, address executor) external;
    ```
  - In `anchorExecution`:
    ```solidity
    if (p.designatedExecutor != address(0) && msg.sender != p.designatedExecutor) {
        revert UnauthorizedExecutor(msg.sender, p.designatedExecutor);
    }
    ```
- **Security Benefit:** Guarantees non-repudiation and eliminates mempool executor spoofing.
- **Gas Impact:** +5,000 gas during final approval; 0 gas impact during execution.
- **Migration Impact:** Backend and mobile apps pass `designatedExecutor` during final approval.

---

### Proposal 2: Timelocked Action Policy Updates
- **Vulnerability Addressed:** In V1, `setActionPolicy` takes effect immediately. An analyst observing a stricter policy update in the mempool could front-run it by anchoring under the looser policy.
- **V2 Specification:**
  - Two-phase commit with a 24-hour timelock window:
    ```solidity
    struct PolicyChange {
        uint8 newStages;
        uint64 effectiveTimestamp;
    }
    mapping(uint8 => PolicyChange) public pendingPolicyUpdates;
    
    function proposeActionPolicy(uint8 action, uint8 stages) external onlyRole(POLICY_ADMIN_ROLE);
    function executeActionPolicy(uint8 action) external onlyRole(POLICY_ADMIN_ROLE);
    ```
- **Security Benefit:** Protects enterprise governance integrity against policy evasion.
- **Gas Impact:** Minimal (~12,000 gas on admin update; 0 gas on operational anchoring).
- **Migration Impact:** Transparent to recovery plan workflows.

---

### Proposal 3: Paginated Decision History Reads
- **Vulnerability Addressed:** In V1, `getDecisions` returns the entire dynamic array `Decision[] memory`. If a controversial plan incurs numerous approvals, rejections, and revision requests, loading the array in a single view call could exhaust memory or RPC response size limits.
- **V2 Specification:**
  ```solidity
  function getDecisionsPaginated(
      bytes32 planId,
      uint32 version,
      uint256 offset,
      uint256 limit
  ) external view returns (Decision[] memory pagedDecisions, uint256 total);
  ```
- **Security Benefit:** Eliminates potential RPC denial-of-service or memory bloat.
- **Gas Impact:** View call only (zero on-chain transaction gas impact).
- **Migration Impact:** Mobile audit screen pulls decisions in pages of 10 or 25.

---

### Proposal 4: Storage Slot Packing in `PlanVersion`
- **Inefficiency Addressed:** In V1, `uint64 anchoredAt` spills into Slot 4 because it is declared below `status`, leaving 8 unused bytes in Slot 3.
- **V2 Storage Layout:**
  ```solidity
  struct PlanVersion {
      bytes32 planHash;              // Slot 0 (32 bytes)
      bytes32 simulationHash;        // Slot 1 (32 bytes)
      bytes32 orgId;                 // Slot 2 (32 bytes)
      
      // --- PACKED SLOT 3 (Exactly 32 Bytes) ---
      address creator;               // 20 bytes
      uint8 actionMask;              // 1 byte
      uint8 requiredStages;          // 1 byte
      uint8 completedStages;         // 1 byte
      PlanStatus status;             // 1 byte
      uint64 anchoredAt;             // 8 bytes (20 + 1 + 1 + 1 + 1 + 8 = 32 bytes)
      // ----------------------------------------
      
      bytes32 executionEvidenceHash; // Slot 4 (32 bytes)
      address executedBy;            // Slot 5 (20 bytes)
      uint64 executedAt;             // Slot 5 (8 bytes) -> Packed into Slot 5!
  }
  ```
- **Gas Savings:** Eliminates an entire 32-byte storage slot allocation, saving **20,000 gas per anchored plan version** on initial write and **2,100 gas** on cold reads.
- **Compatibility:** Storage layouts between V1 and V2 cannot be mixed on the same proxy without upgradeable storage gaps; must be deployed as a new clean contract instance.

---

## 3. SUMMARY MATRIX

| Feature | Security Benefit | Gas Impact | Backend / Mobile Changes Required |
|---|---|---|---|
| **Designated Executor** | Eliminates mempool evidence front-running | +5,000 gas on approve | Pass executor address in final approval modal. |
| **Timelocked Policy** | Prevents front-running tighter policies | Negligible | Add admin propose/execute UI in portal. |
| **Paginated Decisions** | Bounds RPC response payload | Zero (View) | Add pagination support in mobile audit log. |
| **Storage Slot Packing** | Optimizes storage layout | **-20,000 gas** on anchor | Update contract ABI artifact. |
