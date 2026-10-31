# TRUSTCHAIN — FINAL TEST EVIDENCE AND RUNTIME ARTIFACTS

**Project:** TRUSTCHAIN — AI-Powered Supply Chain Disruption Intelligence, Recovery & Governance Platform  
**Environment:** Local Hardhat Node (Chain ID 31337) & Python 3.13 FastAPI Backend  
**Audit Date:** October 31, 2026  
**Evidence Standard:** 100% Reproducible Runtime Execution Logs  

---

## 1. HARDHAT SMART CONTRACT TEST SUITE EVIDENCE

```bash
$ cd blockchain && npx hardhat test
```

```
  TrustChainGovernance — Milestone 2
    Action-based approval policy
      ✔ ships with the documented default policy (265ms)
      ✔ derives different stages for different action combinations
      ✔ rejects empty or unknown action masks
      ✔ snapshots required stages at anchoring and emits PlanActionsDeclared
      ✔ additionalStages can only tighten the policy
      ✔ policy admin can change policy; existing versions keep their snapshot
      ✔ a disabled action cannot be anchored
      ✔ combined-action stages are configurable
      ✔ explicit-stage anchoring can be disabled to force policy-derived stages
      ✔ rejects malformed policy updates
      ✔ [M2-15] unauthorised accounts cannot change policy
      ✔ [M2-15] registrar cannot grant itself the policy-admin role
    Scenario: warehouse transfer only
      ✔ [M2-1][M2-13] warehouse approver approves; plan finalises and becomes eligible
      ✔ execution evidence is anchored and recorded on the version
      ✔ [M2-5] supply-chain manager cannot approve a stage the plan does not require
    Scenario: alternative procurement only
      ✔ procurement approver completes the only stage
      ✔ [M2-5] warehouse approver cannot approve the procurement stage
    Scenario: combined warehouse transfer + procurement
      ✔ [M2-12] partial approvals block execution until every stage is complete
      ✔ records the full ordered approval history
      ✔ one wallet holding several categories cannot complete several stages alone
    Separation of duties & authorisation
      ✔ [M2-2] unregistered wallet cannot approve
      ✔ [M2-2] contract admin (no registry entry) cannot approve
      ✔ [M2-2] wallet registered with only the Administrator category cannot approve
      ✔ [M2-2] approver from another organisation cannot approve
      ✔ [M2-3] creator cannot approve their own plan (manager-authored)
      ✔ [M2-3] creator holding the approval category still cannot self-approve
      ✔ [M2-3] creator cannot reject or request revision of their own plan
      ✔ [M2-4] duplicate approval by the same wallet fails
      ✔ [M2-4] a second approver cannot re-approve an already completed stage
      ✔ [M2-5] invalid stage values are rejected
      ✔ [M2-6] revoked wallet cannot approve; its earlier decisions remain in history
      ✔ approving an unknown plan or version fails
    Rejection
      ✔ [M2-7] authorised approver rejects with a reason hash
      ✔ rejection requires a reason hash
      ✔ unauthorised wallet cannot reject
      ✔ [M2-8] rejected plan cannot be executed or approved further
      ✔ [M2-8] no further decisions are accepted after rejection
      ✔ a fully approved but unexecuted plan can still be rejected and then cannot execute
      ✔ an executed plan cannot be rejected
      ✔ after rejection, a new version can be anchored; the rejected version stays REJECTED
    Revision requests
      ✔ [M2-9] revision request is recorded without altering the version
      ✔ revision request requires a reason hash
      ✔ version under revision cannot be approved or executed
      ✔ revision cannot be requested once a plan is fully approved
      ✔ revised plan is a new version that supersedes the one under revision
    Version control
      ✔ [M2-10] a new version requires fresh approvals; approvals never carry over
      ✔ a new version can require a different stage set than the previous one
      ✔ [M2-11] superseded (old) version cannot be executed even though fully approved
      ✔ stale versions cannot receive approvals, rejections or revision requests
      ✔ an executed plan cannot receive a new version
    Execution evidence
      ✔ [M2-14] duplicate execution anchoring is rejected
      ✔ [M2-14] the same evidence hash cannot be reused for another plan
      ✔ rejects zero evidence hash and unknown plans
      ✔ only active wallets of the owning organisation with an operational category may anchor evidence
    Pause & administrative safety
      ✔ pause blocks approvals, rejections, revisions and execution anchoring
      ✔ [M2-15] policy admin role does not grant approval authority
      ✔ [M2-15] revoking policy-admin role removes policy authority
    End-to-end: RCP-1001 acceptance flow (contract layer)
      ✔ analyst anchors, self-approval blocked, approvals complete, execution anchored, hash verifies

  TrustChainGovernance — Milestone 1
    Deployment & roles
      ✔ assigns admin, pauser and registrar roles
      ✔ rejects zero addresses in the constructor
      ✔ does not give the administrator automatic approval or creation authority
    Wallet registration
      ✔ [T1] authorised registrar registers a wallet and emits WalletRegistered
      ✔ supports multiple categories on one wallet
      ✔ [T2] unauthorised account cannot register a wallet
      ✔ admin without REGISTRAR_ROLE cannot register a wallet
      ✔ blocks registrar self-registration (privilege escalation)
      ✔ blocks registrar self-update of categories
      ✔ validates address, organisation and categories
      ✔ prevents duplicate active registration
      ✔ updates categories and emits WalletCategoriesUpdated
      ✔ cannot update an unregistered wallet
    Wallet revocation
      ✔ revokes a wallet and emits WalletRevoked
      ✔ unauthorised account cannot revoke
      ✔ cannot revoke an inactive wallet twice
      ✔ [T15] revoked wallet cannot anchor plans afterwards
      ✔ a revoked wallet can be re-registered explicitly
    Recovery plan anchoring
      ✔ [T3] authorised analyst anchors V1 and emits PlanAnchored
      ✔ supply chain manager may also author a plan
      ✔ [T4] duplicate anchoring of the same version fails
      ✔ reusing a plan hash fails, even under a different plan ID
      ✔ unregistered wallet cannot anchor
      ✔ approver-only wallets cannot author plans
      ✔ rejects zero identifiers and hashes
      ✔ rejects empty or non-approval required stages
      ✔ rejects version gaps and version 0
      ✔ new version supersedes the previous one without overwriting its history
      ✔ another organisation cannot add versions to a plan it does not own
      ✔ [T16] verifyPlanHash detects a hash mismatch
      ✔ getPlanVersion reverts for unknown versions
    Administration & pausing
      ✔ [T17] non-admin cannot grant roles
      ✔ [T17] registrar cannot grant itself admin or pauser roles
      ✔ [T17] non-pauser cannot pause
      ✔ pause blocks registration and anchoring but still allows revocation
      ✔ admin can rotate the registrar; the old registrar loses authority

  94 passing (647ms)
```

---

## 2. BACKEND E2E ACCEPTANCE TEST EVIDENCE

```bash
$ python -m pytest backend/tests/test_phase6_e2e_acceptance.py -v
```

```
============================= test session starts ==============================
platform darwin -- Python 3.13.9, pytest-8.4.2, pluggy-1.5.0
rootdir: /Users/reethika/Desktop/Trustchain

backend/tests/test_phase6_e2e_acceptance.py::TestPhase6EndToEndAcceptance::test_01_application_startup_and_network_detection PASSED [ 11%]
backend/tests/test_phase6_e2e_acceptance.py::TestPhase6EndToEndAcceptance::test_02_analyst_wallet_authentication PASSED [ 22%]
backend/tests/test_phase6_e2e_acceptance.py::TestPhase6EndToEndAcceptance::test_03_plan_anchoring_workflow PASSED [ 33%]
backend/tests/test_phase6_e2e_acceptance.py::TestPhase6EndToEndAcceptance::test_04_manager_authentication PASSED [ 44%]
backend/tests/test_phase6_e2e_acceptance.py::TestPhase6EndToEndAcceptance::test_05_manager_plan_verification PASSED [ 55%]
backend/tests/test_phase6_e2e_acceptance.py::TestPhase6EndToEndAcceptance::test_06_governance_approval_workflow PASSED [ 66%]
backend/tests/test_phase6_e2e_acceptance.py::TestPhase6EndToEndAcceptance::test_07_execution_evidence_anchoring PASSED [ 77%]
backend/tests/test_phase6_e2e_acceptance.py::TestPhase6EndToEndAcceptance::test_08_live_audit_verification PASSED [ 88%]
backend/tests/test_phase6_e2e_acceptance.py::TestPhase6EndToEndAcceptance::test_09_restart_and_recovery PASSED [100%]

======================== 9 passed in 1.40s ========================
```

---

## 3. REMEDIATION & SECURITY TEST EVIDENCE

```bash
$ python -m pytest backend/tests/test_final_acceptance_remediation.py -v
```

```
============================= test session starts ==============================
platform darwin -- Python 3.13.9, pytest-8.4.2, pluggy-1.5.0
rootdir: /Users/reethika/Desktop/Trustchain

backend/tests/test_final_acceptance_remediation.py::TestFinalAcceptanceRemediation::test_production_rejects_client_identity_headers_without_session PASSED [ 11%]
backend/tests/test_final_acceptance_remediation.py::TestFinalAcceptanceRemediation::test_production_rejects_invalid_bearer_token PASSED [ 22%]
backend/tests/test_final_acceptance_remediation.py::TestFinalAcceptanceRemediation::test_tenant_isolation_on_plan_endpoints PASSED [ 33%]
backend/tests/test_final_acceptance_remediation.py::TestFinalAcceptanceRemediation::test_register_transaction_rejects_malformed_hashes PASSED [ 44%]
backend/tests/test_final_acceptance_remediation.py::TestFinalAcceptanceRemediation::test_reconcile_transaction_tenant_protected PASSED [ 55%]
backend/tests/test_final_acceptance_remediation.py::TestFinalAcceptanceRemediation::test_v1_approval_does_not_return_fake_tx_hash PASSED [ 66%]
backend/tests/test_final_acceptance_remediation.py::TestFinalAcceptanceRemediation::test_v1_verify_plan_reflects_actual_on_chain_state PASSED [ 77%]
backend/tests/test_final_acceptance_remediation.py::TestFinalAcceptanceRemediation::test_v1_chain_status_reflects_actual_network PASSED [ 88%]
backend/tests/test_final_acceptance_remediation.py::TestFinalAcceptanceRemediation::test_deterministic_simulation_hash_computation PASSED [100%]

======================== 9 passed in 1.34s ========================
```

---

## 4. COMPLETE BACKEND REGRESSION SUITE

```bash
$ python -m pytest backend/tests/
```

```
============================= test session starts ==============================
platform darwin -- Python 3.13.9, pytest-8.4.2, pluggy-1.5.0
rootdir: /Users/reethika/Desktop/Trustchain
collected 150 items

backend/tests/test_auth_security.py ..                                   [  1%]
backend/tests/test_external_intelligence.py .......                      [  6%]
backend/tests/test_final_acceptance_remediation.py .........             [ 12%]
backend/tests/test_hash_service.py ...........                           [ 19%]
backend/tests/test_intelligence_engine.py ..................             [ 31%]
backend/tests/test_phase4_hardening.py ......                            [ 35%]
backend/tests/test_phase51_reliability.py ..........                     [ 42%]
backend/tests/test_phase52_evidence_manifest.py .........                [ 48%]
backend/tests/test_phase53_evidence_binding.py ........................  [ 64%]
backend/tests/test_phase6_e2e_acceptance.py .........                    [ 70%]
backend/tests/test_phase6_mobile_integration.py ......                   [ 74%]
backend/tests/test_routes.py ......                                      [ 78%]
backend/tests/test_supply_chain.py .............                         [ 86%]
backend/tests/test_transaction_service.py .........                      [ 92%]
backend/tests/test_verification_service.py .....                         [ 96%]
backend/tests/test_wallet_service.py ......                              [100%]

====================== 150 passed in 5.32s =======================
```

---

## 5. MOBILE APP STATIC TYPECHECK & EXPO DOCTOR

```bash
$ npx tsc --noEmit
# Exit Code: 0 (No type errors)

$ npx expo-doctor
20/20 checks passed. No issues detected!
# Exit Code: 0
```

---

## 6. LIVE TRANSACTION AND BLOCK EVIDENCE

The following live transaction records were produced by the end-to-end integration flow on the Hardhat node:

- **Contract Deployment:**
  - Block Number: `1`
  - Contract Address: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Analyst Wallet Registration:**
  - Block Number: `2`
  - Wallet: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
  - Categories: `0x01` (Operations Analyst)
- **Supply Chain Manager Registration:**
  - Block Number: `3`
  - Wallet: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
  - Categories: `0x02` (Supply Chain Manager)
- **Recovery Plan Anchoring:**
  - Plan ID: `RP-E2E-ACCEPTANCE` (Version 1)
  - Action Mask: `0x04` (Shipment Reroute)
  - Required Stages: `0x02` (Supply Chain Manager)
  - Tx Hash: `0xfbf826004640c640815886542613adc2d600bdb99ca12cf5e5731cb47cc3ba80`
  - Block Number: `4`
  - Gas Used: `184,210`
  - Emitted Event: `PlanAnchored(planId, 1, creator, planHash, simHash, orgId, stages)`
- **Governance Approval:**
  - Actor: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
  - Stage Approved: `2` (CAT_SUPPLY_CHAIN_MANAGER)
  - Tx Hash: `0x6696f676f7abeec970160a1e7ee4cf4f6902193b7bcf9902c93ea86d22229dc3`
  - Block Number: `5`
  - Gas Used: `74,830`
  - Emitted Event: `PlanApproved(planId, 1, approver, stage: 2)`
- **Execution Evidence Anchoring:**
  - Executor: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
  - Evidence Fingerprint: `0x6b9113fbefae96086f54d1a7a1d6eefa80cb88593b5b6ab57ba65a3ae387b4fb`
  - Tx Hash: `0xe9e66889385306721d4a990c86c53b51b4a97c896eed4d0b3f99c6975c81a2a3`
  - Block Number: `6`
  - Gas Used: `68,914`
  - Emitted Event: `ExecutionAnchored(planId, 1, executor, evidenceHash)`

