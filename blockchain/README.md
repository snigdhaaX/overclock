# TRUSTCHAIN — Blockchain Module

Solidity governance contract for anchoring TRUSTCHAIN recovery plans on **Polygon Amoy**.
It is built with Hardhat, installed locally in this folder. You don't need a local node, Ganache, Docker or Geth.

## Status

| Milestone | Scope | State |
|---|---|---|
| 1 | Wallet registry, plan anchoring, versioning | ✅ Implemented, 36 tests passing |
| 2 | Approvals, rejection, revision, separation of duties, execution evidence | ✅ Implemented, 58 tests added (94 total passing) |
| 3 | SHA-256 canonical hashing, FastAPI + Web3.py, nonce signatures, tx tracking | ✅ Implemented, 33 Python tests passing (127 total passing) |
| 4 | MetaMask + Blockchain Verification Centre | ⏳ |
| 5 | Polygon Amoy deployment + end-to-end demo | ⏳ |

## Commands

```powershell
cd blockchain
npm install            # first time only
npx hardhat compile
npx hardhat test       # runs on the in-process Hardhat network (no node needed)
npx hardhat run scripts/deploy.js                  # dry-run deploy (ephemeral)
npx hardhat run scripts/deploy.js --network amoy   # Milestone 5, needs .env
```

## Contract model (`contracts/TrustChainGovernance.sol`)

### Administrative roles (OpenZeppelin AccessControl)
| Role | Can do | Cannot do |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Grant and revoke roles | Approve or author plans (not in the registry) |
| `REGISTRAR_ROLE` | Register, update and revoke wallets | Register or modify **its own** wallet |
| `PAUSER_ROLE` | Pause and unpause | — |

Holding an admin role never grants approval authority. Approval authority comes only from the wallet registry.

### Approval categories (bitmask)
| Bit | Category | Plan creator | Approval stage |
|---|---|---|---|
| `0x01` | Operations Analyst | ✅ | — |
| `0x02` | Supply Chain Manager | ✅ | ✅ |
| `0x04` | Warehouse Approver | — | ✅ |
| `0x08` | Procurement Approver | — | ✅ |
| `0x10` | Administrator | — | — |

### Plan versions
`anchorPlan(planId, version, planHash, simulationHash, requiredStages)`
- `planId`: `bytes32`, e.g. `ethers.encodeBytes32String("RCP-1001")`.
- `version` must be `latestVersion + 1`. Earlier versions are never overwritten; they are only marked `SUPERSEDED`.
- `planHash` and `simulationHash` are SHA-256 digests produced by the backend (Milestone 3).
- `requiredStages` is a non-empty subset of `0x02 | 0x04 | 0x08`. The backend chooses it from the plan's action categories.
- A plan hash can never be reused, so each version has a distinct fingerprint.
- Only the organisation that owns a plan can add versions to it. A version that has been executed blocks further versions.

Statuses: `NONE, PENDING_APPROVAL, APPROVED, REJECTED, REVISION_REQUESTED, SUPERSEDED, EXECUTED`.

### Events
`WalletRegistered`, `WalletCategoriesUpdated`, `WalletRevoked`, `PlanAnchored`, `PlanSuperseded`.
Milestone 2 adds `PlanApproved`, `PlanRejected`, `PlanRevisionRequested`, `PlanFinalized` and `ExecutionAnchored`.

## Security notes
- Secrets come only from `.env`, which Git ignores. `.env.example` contains placeholders only.
- Use a dedicated test wallet that holds only Amoy test POL.
- The contract stores fingerprints, not plan contents. Anchoring execution evidence records a hash; it does not prove that the physical operation happened.
- `revokeWallet` still works while the contract is paused, so access can be removed during an incident.
