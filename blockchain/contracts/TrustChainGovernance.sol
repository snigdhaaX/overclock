// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title TrustChainGovernance
 * @notice On-chain governance anchor for TRUSTCHAIN supply-chain recovery plans.
 *
 * Milestone 1:
 *   - Organisational wallet registry (approval categories, revocation).
 *   - Version-specific recovery-plan hash anchoring with immutable history.
 *
 * Milestone 2:
 *   - Action-based approval policy (recovery action -> required approval stages).
 *   - Multi-stage approval, rejection and revision requests with full history.
 *   - Separation of duties (creator cannot decide; one decision per wallet per version).
 *   - Version-specific decisions; stale / superseded versions cannot be decided or executed.
 *   - Execution-evidence anchoring for fully approved, current versions only.
 *
 * Trust model:
 *   - The contract stores SHA-256 fingerprints only; plan contents stay off-chain.
 *   - Governance rules are enforced here, never delegated to frontend/backend role claims.
 *   - Holding an AccessControl role (admin / registrar / policy admin) does NOT grant any
 *     approval category. Approval authority comes solely from the wallet registry.
 *   - Execution evidence is a hash of off-chain evidence. The contract does not and cannot
 *     prove that a physical warehouse transfer or purchase took place.
 *   - The contract performs no external calls and holds no funds, so there is no
 *     reentrancy surface; state is always updated before events are emitted.
 */
contract TrustChainGovernance is AccessControl, Pausable {
    // ---------------------------------------------------------------------
    // Roles (administrative only — never approval authority)
    // ---------------------------------------------------------------------

    /// @notice May register, update and revoke organisational wallets.
    bytes32 public constant REGISTRAR_ROLE = keccak256("TRUSTCHAIN_REGISTRAR_ROLE");

    /// @notice May pause / unpause state-changing governance operations.
    bytes32 public constant PAUSER_ROLE = keccak256("TRUSTCHAIN_PAUSER_ROLE");

    /// @notice May configure the action -> approval-stage policy.
    bytes32 public constant POLICY_ADMIN_ROLE = keccak256("TRUSTCHAIN_POLICY_ADMIN_ROLE");

    // ---------------------------------------------------------------------
    // Approval categories (bitmask)
    // ---------------------------------------------------------------------

    uint8 public constant CAT_OPERATIONS_ANALYST = 1 << 0; // 0x01
    uint8 public constant CAT_SUPPLY_CHAIN_MANAGER = 1 << 1; // 0x02  (management stage)
    uint8 public constant CAT_WAREHOUSE_APPROVER = 1 << 2; // 0x04
    uint8 public constant CAT_PROCUREMENT_APPROVER = 1 << 3; // 0x08
    uint8 public constant CAT_ADMINISTRATOR = 1 << 4; // 0x10

    /// @notice Every category the registry recognises.
    uint8 public constant ALL_CATEGORIES = 0x1F;

    /// @notice Categories that correspond to an approval stage on a plan.
    uint8 public constant APPROVAL_STAGE_MASK =
        CAT_SUPPLY_CHAIN_MANAGER | CAT_WAREHOUSE_APPROVER | CAT_PROCUREMENT_APPROVER;

    /// @notice Categories allowed to author (anchor) a recovery plan version.
    uint8 public constant PLAN_CREATOR_MASK = CAT_OPERATIONS_ANALYST | CAT_SUPPLY_CHAIN_MANAGER;

    /// @notice Categories allowed to anchor execution evidence (Administrator excluded).
    uint8 public constant EXECUTOR_MASK =
        CAT_OPERATIONS_ANALYST | CAT_SUPPLY_CHAIN_MANAGER | CAT_WAREHOUSE_APPROVER | CAT_PROCUREMENT_APPROVER;

    // ---------------------------------------------------------------------
    // Recovery action types (bitmask) — mapped to stages by the action policy
    // ---------------------------------------------------------------------

    uint8 public constant ACTION_WAREHOUSE_TRANSFER = 1 << 0; // 0x01
    uint8 public constant ACTION_ALTERNATIVE_PROCUREMENT = 1 << 1; // 0x02
    uint8 public constant ACTION_SHIPMENT_REROUTE = 1 << 2; // 0x04
    uint8 public constant ACTION_EXPEDITED_FREIGHT = 1 << 3; // 0x08
    uint8 public constant ACTION_ORDER_REALLOCATION = 1 << 4; // 0x10

    uint8 public constant ALL_ACTIONS = 0x1F;

    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    struct Wallet {
        bytes32 orgId; // keccak256 / UUID-derived organisation identifier
        uint8 categories; // bitmask of CAT_* values
        bool active;
        uint64 registeredAt;
        uint64 revokedAt; // 0 while active
    }

    enum PlanStatus {
        NONE, // 0 — not anchored
        PENDING_APPROVAL, // 1 — anchored, awaiting stages
        APPROVED, // 2 — all required stages complete
        REJECTED, // 3 — rejected by an authorised approver (terminal)
        REVISION_REQUESTED, // 4 — approver asked for a new version (terminal for this version)
        SUPERSEDED, // 5 — a newer version has been anchored (terminal)
        EXECUTED // 6 — execution evidence anchored (terminal)
    }

    struct PlanVersion {
        bytes32 planHash; // SHA-256 of canonical approval-relevant plan JSON
        bytes32 simulationHash; // SHA-256 of the simulation / optimisation output
        bytes32 orgId;
        address creator;
        uint8 actionMask; // declared ACTION_* bits (0 = explicit-stage anchoring)
        uint8 requiredStages; // snapshot at anchoring time; later policy changes never apply
        uint8 completedStages;
        PlanStatus status;
        uint64 anchoredAt;
        bytes32 executionEvidenceHash;
        address executedBy;
        uint64 executedAt;
    }

    enum DecisionType {
        APPROVE, // 0
        REJECT, // 1
        REQUEST_REVISION // 2
    }

    struct Decision {
        address actor;
        uint8 stage;
        DecisionType decision;
        uint64 timestamp;
        bytes32 reasonHash; // SHA-256 of off-chain reason text (0 for approvals)
    }

    enum Eligibility {
        ELIGIBLE, // 0
        NOT_FOUND, // 1
        NOT_CURRENT_VERSION, // 2 — superseded or otherwise stale
        REJECTED, // 3
        REVISION_REQUESTED, // 4
        APPROVALS_INCOMPLETE, // 5
        ALREADY_EXECUTED // 6
    }

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    mapping(address => Wallet) private _wallets;

    /// planId => version => record. Versions start at 1 and are never overwritten.
    mapping(bytes32 => mapping(uint32 => PlanVersion)) private _plans;

    /// planId => latest anchored version (0 = never anchored).
    mapping(bytes32 => uint32) public latestVersion;

    /// planHash => already anchored (prevents reusing a fingerprint across versions/plans).
    mapping(bytes32 => bool) public planHashUsed;

    uint256 public totalAnchoredVersions;

    /// action bit => required approval stages (0 = action not permitted).
    mapping(uint8 => uint8) public actionPolicy;

    /// Extra stages required when a plan declares two or more distinct actions.
    uint8 public combinedActionStages;

    /// When false, only action-based anchoring is accepted.
    bool public explicitStagesAllowed;

    /// keccak256(planId, version) => ordered decision history.
    mapping(bytes32 => Decision[]) private _decisions;

    /// keccak256(planId, version) => wallet => has made a decision on this version.
    mapping(bytes32 => mapping(address => bool)) private _hasDecided;

    /// executionEvidenceHash => already anchored.
    mapping(bytes32 => bool) public evidenceHashUsed;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event WalletRegistered(
        address indexed wallet,
        bytes32 indexed orgId,
        uint8 categories,
        address indexed registrar
    );
    event WalletCategoriesUpdated(
        address indexed wallet,
        bytes32 indexed orgId,
        uint8 previousCategories,
        uint8 newCategories,
        address indexed registrar
    );
    event WalletRevoked(address indexed wallet, bytes32 indexed orgId, address indexed registrar);

    event PlanAnchored(
        bytes32 indexed planId,
        uint32 indexed version,
        address indexed creator,
        bytes32 planHash,
        bytes32 simulationHash,
        bytes32 orgId,
        uint8 requiredStages
    );
    event PlanActionsDeclared(bytes32 indexed planId, uint32 indexed version, uint8 actionMask);
    event PlanSuperseded(bytes32 indexed planId, uint32 indexed version, uint32 indexed supersededBy);

    event PlanApproved(
        bytes32 indexed planId,
        uint32 indexed version,
        address indexed approver,
        uint8 stage,
        uint8 completedStages
    );
    event PlanRejected(
        bytes32 indexed planId,
        uint32 indexed version,
        address indexed rejector,
        uint8 stage,
        bytes32 reasonHash
    );
    event PlanRevisionRequested(
        bytes32 indexed planId,
        uint32 indexed version,
        address indexed requester,
        uint8 stage,
        bytes32 reasonHash
    );
    event PlanFinalized(bytes32 indexed planId, uint32 indexed version, uint8 completedStages);
    event ExecutionAnchored(
        bytes32 indexed planId,
        uint32 indexed version,
        address indexed executor,
        bytes32 evidenceHash
    );

    event ActionPolicyUpdated(uint8 indexed action, uint8 previousStages, uint8 newStages, address indexed admin);
    event CombinedActionStagesUpdated(uint8 previousStages, uint8 newStages, address indexed admin);
    event ExplicitStagesAllowedUpdated(bool allowed, address indexed admin);

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error ZeroAddress();
    error ZeroIdentifier();
    error InvalidCategories(uint8 categories);
    error WalletAlreadyActive(address wallet);
    error WalletNotActive(address wallet);
    error SelfRegistrationForbidden(address registrar);
    error OrganisationMismatch(bytes32 expected, bytes32 actual);
    error MissingCategory(address wallet, uint8 required);
    error InvalidVersion(uint32 expected, uint32 provided);
    error InvalidRequiredStages(uint8 stages);
    error PlanHashAlreadyUsed(bytes32 planHash);
    error PlanAlreadyExecuted(bytes32 planId, uint32 version);
    error PlanNotFound(bytes32 planId, uint32 version);

    error InvalidActions(uint8 actionMask);
    error ActionPolicyNotConfigured(uint8 action);
    error ExplicitStagesDisabled();
    error InvalidStage(uint8 stage);
    error StageNotRequired(uint8 stage, uint8 requiredStages);
    error StageAlreadyApproved(uint8 stage);
    error StaleVersion(bytes32 planId, uint32 provided, uint32 current);
    error PlanNotPending(bytes32 planId, uint32 version, PlanStatus status);
    error CreatorCannotDecide(address creator);
    error ApproverAlreadyDecided(address approver);
    error ReasonRequired();
    error NotExecutionEligible(bytes32 planId, uint32 version, PlanStatus status);
    error EvidenceHashAlreadyUsed(bytes32 evidenceHash);

    // ---------------------------------------------------------------------
    // Construction
    // ---------------------------------------------------------------------

    /**
     * @param admin Holder of DEFAULT_ADMIN_ROLE, PAUSER_ROLE and POLICY_ADMIN_ROLE.
     * @param registrar Initial REGISTRAR_ROLE holder (may equal admin).
     * @dev Neither address is placed in the wallet registry, so neither receives
     *      plan-creation or approval authority automatically.
     *
     * Default action policy (changeable by POLICY_ADMIN_ROLE):
     *   WAREHOUSE_TRANSFER      -> Warehouse Approver
     *   ALTERNATIVE_PROCUREMENT -> Procurement Approver
     *   SHIPMENT_REROUTE        -> Supply Chain Manager
     *   EXPEDITED_FREIGHT       -> Supply Chain Manager
     *   ORDER_REALLOCATION      -> Supply Chain Manager
     *   >= 2 distinct actions   -> + Supply Chain Manager (management sign-off)
     */
    constructor(address admin, address registrar) {
        if (admin == address(0) || registrar == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(POLICY_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, registrar);

        _setActionPolicy(ACTION_WAREHOUSE_TRANSFER, CAT_WAREHOUSE_APPROVER);
        _setActionPolicy(ACTION_ALTERNATIVE_PROCUREMENT, CAT_PROCUREMENT_APPROVER);
        _setActionPolicy(ACTION_SHIPMENT_REROUTE, CAT_SUPPLY_CHAIN_MANAGER);
        _setActionPolicy(ACTION_EXPEDITED_FREIGHT, CAT_SUPPLY_CHAIN_MANAGER);
        _setActionPolicy(ACTION_ORDER_REALLOCATION, CAT_SUPPLY_CHAIN_MANAGER);

        combinedActionStages = CAT_SUPPLY_CHAIN_MANAGER;
        emit CombinedActionStagesUpdated(0, CAT_SUPPLY_CHAIN_MANAGER, msg.sender);

        explicitStagesAllowed = true;
        emit ExplicitStagesAllowedUpdated(true, msg.sender);
    }

    // ---------------------------------------------------------------------
    // Wallet registry
    // ---------------------------------------------------------------------

    /**
     * @notice Register an organisational wallet with one or more categories.
     * @dev A registrar may never register or modify its own wallet, which blocks
     *      the registrar -> approver privilege-escalation path.
     */
    function registerWallet(address wallet, bytes32 orgId, uint8 categories)
        external
        onlyRole(REGISTRAR_ROLE)
        whenNotPaused
    {
        if (wallet == address(0)) revert ZeroAddress();
        if (orgId == bytes32(0)) revert ZeroIdentifier();
        if (wallet == msg.sender) revert SelfRegistrationForbidden(msg.sender);
        _validateCategories(categories);

        Wallet storage w = _wallets[wallet];
        if (w.active) revert WalletAlreadyActive(wallet);

        w.orgId = orgId;
        w.categories = categories;
        w.active = true;
        w.registeredAt = uint64(block.timestamp);
        w.revokedAt = 0;

        emit WalletRegistered(wallet, orgId, categories, msg.sender);
    }

    /// @notice Change the categories of an active wallet (organisation is immutable).
    function updateWalletCategories(address wallet, uint8 categories)
        external
        onlyRole(REGISTRAR_ROLE)
        whenNotPaused
    {
        if (wallet == msg.sender) revert SelfRegistrationForbidden(msg.sender);
        _validateCategories(categories);

        Wallet storage w = _wallets[wallet];
        if (!w.active) revert WalletNotActive(wallet);

        uint8 previous = w.categories;
        w.categories = categories;
        emit WalletCategoriesUpdated(wallet, w.orgId, previous, categories, msg.sender);
    }

    /// @notice Revoke a wallet. Revoked wallets lose all future governance authority.
    function revokeWallet(address wallet) external onlyRole(REGISTRAR_ROLE) {
        // Intentionally NOT gated by whenNotPaused: revocation must work during incidents.
        Wallet storage w = _wallets[wallet];
        if (!w.active) revert WalletNotActive(wallet);

        w.active = false;
        w.categories = 0;
        w.revokedAt = uint64(block.timestamp);

        emit WalletRevoked(wallet, w.orgId, msg.sender);
    }

    // ---------------------------------------------------------------------
    // Approval policy configuration
    // ---------------------------------------------------------------------

    /**
     * @notice Set the approval stages required by one recovery action type.
     * @param action Single ACTION_* bit.
     * @param stages Subset of APPROVAL_STAGE_MASK; 0 disables the action.
     * @dev Applies only to plan versions anchored afterwards.
     */
    function setActionPolicy(uint8 action, uint8 stages) external onlyRole(POLICY_ADMIN_ROLE) {
        _setActionPolicy(action, stages);
    }

    /// @notice Extra stages required when a plan combines two or more action types (0 = none).
    function setCombinedActionStages(uint8 stages) external onlyRole(POLICY_ADMIN_ROLE) {
        if ((stages & ~APPROVAL_STAGE_MASK) != 0) revert InvalidRequiredStages(stages);
        uint8 previous = combinedActionStages;
        combinedActionStages = stages;
        emit CombinedActionStagesUpdated(previous, stages, msg.sender);
    }

    /// @notice Enable / disable anchoring with creator-supplied stage masks.
    function setExplicitStagesAllowed(bool allowed) external onlyRole(POLICY_ADMIN_ROLE) {
        explicitStagesAllowed = allowed;
        emit ExplicitStagesAllowedUpdated(allowed, msg.sender);
    }

    // ---------------------------------------------------------------------
    // Recovery plan anchoring
    // ---------------------------------------------------------------------

    /**
     * @notice Anchor a plan version with an explicit stage mask (Milestone 1 interface).
     * @param requiredStages Non-empty subset of APPROVAL_STAGE_MASK.
     * @dev Can be disabled by POLICY_ADMIN_ROLE so only action-based anchoring is accepted.
     */
    function anchorPlan(
        bytes32 planId,
        uint32 version,
        bytes32 planHash,
        bytes32 simulationHash,
        uint8 requiredStages
    ) external whenNotPaused {
        if (!explicitStagesAllowed) revert ExplicitStagesDisabled();
        if (requiredStages == 0 || (requiredStages & ~APPROVAL_STAGE_MASK) != 0) {
            revert InvalidRequiredStages(requiredStages);
        }
        _anchor(planId, version, planHash, simulationHash, 0, requiredStages);
    }

    /**
     * @notice Anchor a plan version whose approval stages are derived from its declared actions.
     * @param actionMask       Non-empty combination of ACTION_* bits contained in the plan.
     * @param additionalStages Optional stricter stages (subset of APPROVAL_STAGE_MASK). Can only
     *                         add stages — never remove policy-mandated ones.
     */
    function anchorPlan(
        bytes32 planId,
        uint32 version,
        bytes32 planHash,
        bytes32 simulationHash,
        uint8 actionMask,
        uint8 additionalStages
    ) external whenNotPaused {
        if ((additionalStages & ~APPROVAL_STAGE_MASK) != 0) revert InvalidRequiredStages(additionalStages);
        uint8 stages = requiredStagesForActions(actionMask) | additionalStages;
        _anchor(planId, version, planHash, simulationHash, actionMask, stages);
    }

    // ---------------------------------------------------------------------
    // Approval workflow
    // ---------------------------------------------------------------------

    /**
     * @notice Approve one required stage of the current version of a plan.
     * @param stage Single approval-stage bit that the caller is authorised for.
     */
    function approvePlan(bytes32 planId, uint32 version, uint8 stage) external whenNotPaused {
        (PlanVersion storage p, bytes32 key) = _authoriseDecision(planId, version, stage);
        if (p.status != PlanStatus.PENDING_APPROVAL) revert PlanNotPending(planId, version, p.status);
        if ((p.completedStages & stage) != 0) revert StageAlreadyApproved(stage);

        p.completedStages |= stage;
        _recordDecision(key, stage, DecisionType.APPROVE, bytes32(0));
        emit PlanApproved(planId, version, msg.sender, stage, p.completedStages);

        if (p.completedStages == p.requiredStages) {
            p.status = PlanStatus.APPROVED;
            emit PlanFinalized(planId, version, p.completedStages);
        }
    }

    /**
     * @notice Reject the current version. Allowed while pending or approved-but-not-executed.
     * @param stage      Required stage under whose authority the caller rejects.
     * @param reasonHash SHA-256 of the off-chain rejection reason.
     */
    function rejectPlan(bytes32 planId, uint32 version, uint8 stage, bytes32 reasonHash) external whenNotPaused {
        if (reasonHash == bytes32(0)) revert ReasonRequired();
        (PlanVersion storage p, bytes32 key) = _authoriseDecision(planId, version, stage);
        if (p.status != PlanStatus.PENDING_APPROVAL && p.status != PlanStatus.APPROVED) {
            revert PlanNotPending(planId, version, p.status);
        }

        p.status = PlanStatus.REJECTED;
        _recordDecision(key, stage, DecisionType.REJECT, reasonHash);
        emit PlanRejected(planId, version, msg.sender, stage, reasonHash);
    }

    /**
     * @notice Ask the creator to submit a new version. The current version is closed but its
     *         hash, approvals and history are left untouched.
     */
    function requestRevision(bytes32 planId, uint32 version, uint8 stage, bytes32 reasonHash)
        external
        whenNotPaused
    {
        if (reasonHash == bytes32(0)) revert ReasonRequired();
        (PlanVersion storage p, bytes32 key) = _authoriseDecision(planId, version, stage);
        if (p.status != PlanStatus.PENDING_APPROVAL) revert PlanNotPending(planId, version, p.status);

        p.status = PlanStatus.REVISION_REQUESTED;
        _recordDecision(key, stage, DecisionType.REQUEST_REVISION, reasonHash);
        emit PlanRevisionRequested(planId, version, msg.sender, stage, reasonHash);
    }

    // ---------------------------------------------------------------------
    // Execution evidence
    // ---------------------------------------------------------------------

    /**
     * @notice Anchor the hash of execution evidence for a fully approved, current version.
     * @dev Records evidence only; it does not prove the physical operation happened.
     */
    function anchorExecution(bytes32 planId, uint32 version, bytes32 evidenceHash) external whenNotPaused {
        if (planId == bytes32(0) || evidenceHash == bytes32(0)) revert ZeroIdentifier();

        PlanVersion storage p = _plans[planId][version];
        if (p.status == PlanStatus.NONE) revert PlanNotFound(planId, version);

        Wallet storage w = _requireActiveWallet(msg.sender);
        if (w.orgId != p.orgId) revert OrganisationMismatch(p.orgId, w.orgId);
        if ((w.categories & EXECUTOR_MASK) == 0) revert MissingCategory(msg.sender, EXECUTOR_MASK);

        uint32 current = latestVersion[planId];
        if (version != current) revert StaleVersion(planId, version, current);
        if (p.status == PlanStatus.EXECUTED) revert PlanAlreadyExecuted(planId, version);
        if (p.status != PlanStatus.APPROVED || p.completedStages != p.requiredStages) {
            revert NotExecutionEligible(planId, version, p.status);
        }
        if (evidenceHashUsed[evidenceHash]) revert EvidenceHashAlreadyUsed(evidenceHash);

        p.status = PlanStatus.EXECUTED;
        p.executionEvidenceHash = evidenceHash;
        p.executedBy = msg.sender;
        p.executedAt = uint64(block.timestamp);
        evidenceHashUsed[evidenceHash] = true;

        emit ExecutionAnchored(planId, version, msg.sender, evidenceHash);
    }

    // ---------------------------------------------------------------------
    // Pausing
    // ---------------------------------------------------------------------

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getWallet(address wallet) external view returns (Wallet memory) {
        return _wallets[wallet];
    }

    function isActiveWallet(address wallet) external view returns (bool) {
        return _wallets[wallet].active;
    }

    /// @notice True when `wallet` is active and holds every bit in `category`.
    function hasCategory(address wallet, uint8 category) public view returns (bool) {
        Wallet storage w = _wallets[wallet];
        return w.active && category != 0 && (w.categories & category) == category;
    }

    function getPlanVersion(bytes32 planId, uint32 version) external view returns (PlanVersion memory) {
        PlanVersion memory p = _plans[planId][version];
        if (p.status == PlanStatus.NONE) revert PlanNotFound(planId, version);
        return p;
    }

    function planExists(bytes32 planId, uint32 version) external view returns (bool) {
        return _plans[planId][version].status != PlanStatus.NONE;
    }

    /// @notice True when `planHash` matches the anchored hash for that exact version.
    function verifyPlanHash(bytes32 planId, uint32 version, bytes32 planHash) external view returns (bool) {
        PlanVersion storage p = _plans[planId][version];
        return p.status != PlanStatus.NONE && p.planHash == planHash;
    }

    /**
     * @notice Stages the current policy requires for `actionMask`. Reverts for unknown or
     *         disabled actions.
     */
    function requiredStagesForActions(uint8 actionMask) public view returns (uint8 stages) {
        if (actionMask == 0 || (actionMask & ~ALL_ACTIONS) != 0) revert InvalidActions(actionMask);
        uint8 count;
        for (uint8 bit = 1; bit != 0 && bit <= ALL_ACTIONS; bit <<= 1) {
            if ((actionMask & bit) == 0) continue;
            uint8 s = actionPolicy[bit];
            if (s == 0) revert ActionPolicyNotConfigured(bit);
            stages |= s;
            unchecked {
                ++count;
            }
        }
        if (count > 1) stages |= combinedActionStages;
    }

    /// @notice Ordered approval / rejection / revision history of one plan version.
    function getDecisions(bytes32 planId, uint32 version) external view returns (Decision[] memory) {
        return _decisions[_key(planId, version)];
    }

    function getDecisionCount(bytes32 planId, uint32 version) external view returns (uint256) {
        return _decisions[_key(planId, version)].length;
    }

    function hasDecided(bytes32 planId, uint32 version, address wallet) external view returns (bool) {
        return _hasDecided[_key(planId, version)][wallet];
    }

    /// @notice Stages still outstanding on a version.
    function pendingStages(bytes32 planId, uint32 version) external view returns (uint8) {
        PlanVersion storage p = _plans[planId][version];
        return p.requiredStages & ~p.completedStages;
    }

    /// @notice Whether execution evidence may currently be anchored for this version, and why not.
    function executionEligibility(bytes32 planId, uint32 version)
        public
        view
        returns (bool eligible, Eligibility reason)
    {
        PlanVersion storage p = _plans[planId][version];
        if (p.status == PlanStatus.NONE) return (false, Eligibility.NOT_FOUND);
        if (p.status == PlanStatus.EXECUTED) return (false, Eligibility.ALREADY_EXECUTED);
        if (version != latestVersion[planId] || p.status == PlanStatus.SUPERSEDED) {
            return (false, Eligibility.NOT_CURRENT_VERSION);
        }
        if (p.status == PlanStatus.REJECTED) return (false, Eligibility.REJECTED);
        if (p.status == PlanStatus.REVISION_REQUESTED) return (false, Eligibility.REVISION_REQUESTED);
        if (p.status != PlanStatus.APPROVED || p.completedStages != p.requiredStages) {
            return (false, Eligibility.APPROVALS_INCOMPLETE);
        }
        return (true, Eligibility.ELIGIBLE);
    }

    function isExecutionEligible(bytes32 planId, uint32 version) external view returns (bool eligible) {
        (eligible, ) = executionEligibility(planId, version);
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    function _anchor(
        bytes32 planId,
        uint32 version,
        bytes32 planHash,
        bytes32 simulationHash,
        uint8 actionMask,
        uint8 requiredStages
    ) internal {
        if (planId == bytes32(0) || planHash == bytes32(0) || simulationHash == bytes32(0)) {
            revert ZeroIdentifier();
        }

        Wallet storage creator = _requireActiveWallet(msg.sender);
        if ((creator.categories & PLAN_CREATOR_MASK) == 0) {
            revert MissingCategory(msg.sender, PLAN_CREATOR_MASK);
        }
        bytes32 orgId = creator.orgId;

        uint32 previous = latestVersion[planId];
        if (version != previous + 1) revert InvalidVersion(previous + 1, version);
        if (planHashUsed[planHash]) revert PlanHashAlreadyUsed(planHash);

        if (previous != 0) {
            PlanVersion storage prior = _plans[planId][previous];
            if (prior.orgId != orgId) revert OrganisationMismatch(prior.orgId, orgId);
            if (prior.status == PlanStatus.EXECUTED) revert PlanAlreadyExecuted(planId, previous);
            if (prior.status != PlanStatus.REJECTED) {
                // Pending / approved / revision-requested versions are no longer current.
                // Their hash, approvals and decision history are preserved.
                prior.status = PlanStatus.SUPERSEDED;
                emit PlanSuperseded(planId, previous, version);
            }
        }

        PlanVersion storage p = _plans[planId][version];
        p.planHash = planHash;
        p.simulationHash = simulationHash;
        p.orgId = orgId;
        p.creator = msg.sender;
        p.actionMask = actionMask;
        p.requiredStages = requiredStages;
        p.status = PlanStatus.PENDING_APPROVAL;
        p.anchoredAt = uint64(block.timestamp);

        latestVersion[planId] = version;
        planHashUsed[planHash] = true;
        unchecked {
            ++totalAnchoredVersions;
        }

        emit PlanAnchored(planId, version, msg.sender, planHash, simulationHash, orgId, requiredStages);
        if (actionMask != 0) emit PlanActionsDeclared(planId, version, actionMask);
    }

    /**
     * @dev Shared authorisation for approve / reject / requestRevision. Enforces:
     *      valid single stage, existing plan, current version, active wallet, same
     *      organisation, stage authority, creator separation, required stage, and
     *      one decision per wallet per version.
     */
    function _authoriseDecision(bytes32 planId, uint32 version, uint8 stage)
        internal
        view
        returns (PlanVersion storage p, bytes32 key)
    {
        if (stage == 0 || (stage & (stage - 1)) != 0 || (stage & ~APPROVAL_STAGE_MASK) != 0) {
            revert InvalidStage(stage);
        }

        p = _plans[planId][version];
        if (p.status == PlanStatus.NONE) revert PlanNotFound(planId, version);

        uint32 current = latestVersion[planId];
        if (version != current) revert StaleVersion(planId, version, current);

        Wallet storage w = _requireActiveWallet(msg.sender);
        if (w.orgId != p.orgId) revert OrganisationMismatch(p.orgId, w.orgId);
        if ((w.categories & stage) == 0) revert MissingCategory(msg.sender, stage);
        if (msg.sender == p.creator) revert CreatorCannotDecide(msg.sender);
        if ((p.requiredStages & stage) == 0) revert StageNotRequired(stage, p.requiredStages);

        key = _key(planId, version);
        if (_hasDecided[key][msg.sender]) revert ApproverAlreadyDecided(msg.sender);
    }

    function _recordDecision(bytes32 key, uint8 stage, DecisionType decision, bytes32 reasonHash) internal {
        _hasDecided[key][msg.sender] = true;
        _decisions[key].push(
            Decision({
                actor: msg.sender,
                stage: stage,
                decision: decision,
                timestamp: uint64(block.timestamp),
                reasonHash: reasonHash
            })
        );
    }

    function _setActionPolicy(uint8 action, uint8 stages) internal {
        if (action == 0 || (action & (action - 1)) != 0 || (action & ~ALL_ACTIONS) != 0) {
            revert InvalidActions(action);
        }
        if ((stages & ~APPROVAL_STAGE_MASK) != 0) revert InvalidRequiredStages(stages);
        uint8 previous = actionPolicy[action];
        actionPolicy[action] = stages;
        emit ActionPolicyUpdated(action, previous, stages, msg.sender);
    }

    function _key(bytes32 planId, uint32 version) internal pure returns (bytes32) {
        return keccak256(abi.encode(planId, version));
    }

    function _validateCategories(uint8 categories) internal pure {
        if (categories == 0 || (categories & ~ALL_CATEGORIES) != 0) revert InvalidCategories(categories);
    }

    function _requireActiveWallet(address wallet) internal view returns (Wallet storage w) {
        w = _wallets[wallet];
        if (!w.active) revert WalletNotActive(wallet);
    }
}
