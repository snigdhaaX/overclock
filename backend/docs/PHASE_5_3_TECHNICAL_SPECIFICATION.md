# TRUSTCHAIN — Phase 5.3 Technical Specification
## Evidence Integrity, Canonical Governance Binding & Independent Verification

### 1. Architectural Overview & Context
In TRUSTCHAIN Phase 5.2, external disruption events and their ingested telemetry evidences were sealed into Merkle-style RFC 8785 canonical manifests (`EventEvidenceManifest`). However, the Phase 5.3 audit identified that `EventEvidenceManifest.manifest_root_hash` was decoupled from the operational recovery plan canonical hash (`RecoveryPlanHashService.build_canonical_representation()`). Consequently, on-chain commitments (`anchorPlan`) did not commit to the underlying disruption evidence.

Phase 5.3 establishes a complete, unbreakable cryptographic relationship across the entire lifecycle:
```
Organization
    └── Disruption (Incident)
          └── External Disruption Event
                └── Event Evidence Items (AIS, Weather, Satellite, News)
                      └── EventEvidenceManifest (Sealed Merkle root)
                            └── RecoveryPlan (RFC 8785 Canonical JSON with evidence_manifest_hash)
                                  └── Polygon Amoy Smart Contract (anchorPlan bytes32 planHash)
                                        └── PlanVerificationService (15-point End-to-End Verification)
```

---

### 2. Canonical Schema Versions & Payload Structure

#### 2.1 Canonical Recovery Plan Schema V2 (`trustchain-recovery-plan-v2`)
Every new recovery plan created under Phase 5.3 includes the authoritative `evidence_manifest_hash` in its RFC 8785 canonical representation:

```json
{
  "action_categories": [1, 2],
  "currency": "USD",
  "disruption_id": "INC-2026-0881",
  "estimated_total_cost": "4500.50",
  "evidence_manifest_hash": "0x420ad7aaf78552ca2bac7430495293301c16034fed82d92b5ae3339f50fc66a6",
  "operational_constraints": {
    "sla_hours": "48"
  },
  "organization_id": "org-apex-global",
  "plan_id": "RCP-2026-001",
  "policy_snapshot": {
    "required_stages": "2"
  },
  "recovery_actions": [
    {
      "action_type": "WAREHOUSE_TRANSFER",
      "constraints": {
        "transit_days": "2"
      },
      "currency": "USD",
      "destination_warehouse": "WH-CENTRAL-02",
      "estimated_cost": "4500.50",
      "product_reference": "SKU-ELEC-440",
      "quantity": 1500,
      "source_warehouse": "WH-WEST-01"
    }
  ],
  "schema_version": "trustchain-recovery-plan-v2",
  "simulation_hash": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "version": 1
}
```

#### 2.2 Canonical Recovery Plan Schema V1 (`trustchain-recovery-plan-v1`)
Legacy historical plans anchored in earlier phases omit `evidence_manifest_hash` to ensure historical bit-for-bit cryptographic verification:

```json
{
  "action_categories": [1, 2],
  "currency": "USD",
  "disruption_id": "INC-2026-0881",
  "estimated_total_cost": "4500.50",
  "operational_constraints": {
    "sla_hours": "48"
  },
  "organization_id": "org-apex-global",
  "plan_id": "RCP-AMOY-001",
  "policy_snapshot": {
    "required_stages": "2"
  },
  "recovery_actions": [...],
  "simulation_hash": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "version": 1
}
```

#### 2.3 Explicit Zero Sentinel for Legitimate Internal Disruptions
For operational disruptions originating internally (e.g., equipment calibration, warehouse re-balancing) where external disruption telemetry was never claimed or required, the explicit sentinel is enforced:
```python
ZERO_MANIFEST_SENTINEL = "0x" + "0" * 64
```
**Distinction:**
- `ZERO_MANIFEST_SENTINEL` indicates a valid plan with zero external evidence requirement (`VERIFIED_WITHOUT_EXTERNAL_EVIDENCE`).
- An external event with missing or empty evidence records produces `INSUFFICIENT_INTEGRITY_PROOF` or `MANIFEST_MISSING`.

---

### 3. Evidence Manifest Association Rules
`DisruptionIngestionService.resolve_evidence_manifest_for_disruption` resolves evidence manifests with strict multi-tenant boundaries:
1. **Tenant Isolation:** `Disruption.organization_id == plan.organization_id == manifest.organization_id`. Any cross-tenant access triggers a 403 or `ORGANIZATION_MISMATCH`.
2. **Deterministic Selection:** Linked external events are resolved via `linked_disruption_id` or `EventCorrelation`. If multiple events exist, events with `CONFIRMED_AS_DISRUPTION` take precedence, followed deterministically by the most recent timestamp.
3. **Sealed Status Requirement:** Manifest must be in `SEALED` status (`manifest.status == "SEALED"` and non-empty evidence items). Unsealed manifests trigger `MANIFEST_INVALID`.
4. **Authoritative Resolution:** The backend `/blockchain/hash/generate` endpoint independently resolves the manifest root from operational database records; frontend-supplied substitute manifest hashes are strictly overridden.

---

### 4. Verification Engine & Status Taxonomy
`PlanVerificationService.verify_plan_integrity` evaluates a 15-point verification chain:
1. Operational plan identity in database.
2. Tenant boundary authorization.
3. Smart contract reachability.
4. On-chain plan record presence (`plan_exists`).
5. Canonical RFC 8785 representation validity.
6. Local SHA-256 digest calculation.
7. On-chain plan hash match.
8. Evidence manifest existence.
9. Manifest organization isolation.
10. Manifest seal status (`SEALED`).
11. Evidence collection non-emptiness.
12. Deep evidence tamper & deletion detection via `DisruptionIngestionService`.
13. Manifest root consistency (recomputed JCS vs stored).
14. Simulation hash match.
15. Execution evidence continuity (where anchored).

#### Granular Status Taxonomy:
- `VERIFIED`: Complete end-to-end integrity verified, committing to valid evidence manifest and matching on-chain anchor.
- `VERIFIED_WITHOUT_EXTERNAL_EVIDENCE`: Valid internal operational plan with confirmed zero-manifest sentinel.
- `LEGACY_VERIFIED`: Historical plan (V1 schema) verified bit-for-bit against historical on-chain record.
- `SUPERSEDED`: Plan cryptographic integrity confirmed, but plan version has been superseded on-chain.
- `PENDING`: Plan cryptographic integrity confirmed, awaiting multi-signature governance approval.
- `PLAN_HASH_MISMATCH`: Local plan content does not match on-chain `planHash`.
- `SIMULATION_HASH_MISMATCH`: Local simulation hash does not match on-chain `simulationHash`.
- `MANIFEST_MISSING`: Plan claims external evidence, but manifest record is missing from database.
- `MANIFEST_INVALID`: Manifest is corrupted, unsealed, or contains zero evidence items.
- `MANIFEST_ROOT_MISMATCH`: Extra uncommitted evidence added after manifest was sealed.
- `EVIDENCE_CONTENT_TAMPERED`: Stored evidence item summary/payload altered after sealing.
- `EVIDENCE_MISSING`: Evidence row deleted from operational database.
- `EVIDENCE_ASSOCIATION_MISMATCH`: Evidence item reassigned to another disruption event.
- `ORGANIZATION_MISMATCH`: Cross-tenant boundary violation between plan, disruption, or manifest.
- `DISRUPTION_MISMATCH`: Disruption record associated with plan does not match or belongs to different tenant.
- `VERSION_MISMATCH`: Queried version does not match on-chain version.
- `ON_CHAIN_RECORD_MISSING`: Plan exists in operational database but has not been anchored on-chain.
- `INSUFFICIENT_INTEGRITY_PROOF`: Disruption event lacks sealed manifest or evidence items.

---

### 5. Execution Evidence Continuity
When execution evidence is anchored on-chain via `anchorExecutionEvidence(planId, version, evidenceHash)`:
- The execution evidence hash is verified against `on_chain.execution_evidence_hash`.
- The verification response confirms status `RECORDED` with the exact on-chain hash.
- Execution evidence is strictly linked to the approved version and cannot be transferred to superseded versions.

---

### 6. Database Migration (`backend/app/blockchain/migrate_phase53.py`)
The migration is fully idempotent and safe for existing SQLite databases:
- Adds 6 new columns to `operational_plans`: `canonical_schema_version`, `disruption_id`, `evidence_manifest_id`, `evidence_manifest_hash`, `canonical_plan_hash`, `is_anchored`.
- Adds indexes: `idx_op_disruption_id`, `idx_op_manifest_hash`, `idx_op_canonical_hash`.
- Backfills historical plans (`RCP-LIVE-2026-001`, `RCP-AMOY-001`, `RCP-SHP-88219`, `RCP-SHP-DRAFT`) with `canonical_schema_version = 'trustchain-recovery-plan-v1'`, preserving historical verification.

---

### 7. Cryptographic and Operational Invariants
1. **Zero Solidity Modification:** The deployed contract `TrustChainGovernance.sol` (`0x33D476cE98f8a374C73D3eDa5FDE65917bA3e24A`) remains 100% untouched.
2. **Zero POL Spent / Zero Broadcasts:** Read-only inspection on Amoy; local transactions strictly confined to Hardhat devnet (Chain ID 31337).
3. **No Private Key Storage:** Custodial keys are strictly prohibited in the backend; signing occurs exclusively client-side via MetaMask.
