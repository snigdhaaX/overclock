"""Recovery plans, approvals and execution (PRD modules 16, 17, 18)."""
from sqlalchemy import CheckConstraint, Column, ForeignKey, ForeignKeyConstraint, Integer, String, Text, UniqueConstraint, Uuid
from .base import Base, IdMixin, JSONType, Money, OrgMixin, TimestampMixin, TZDateTime, in_values, utcnow

PLAN_STATUSES = (
    "DRAFT", "SIMULATED", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "REVISION_REQUIRED", "MODIFIED", "RESUBMITTED",
    "CANCELLED", "EXPIRED", "INVALIDATED", "EXECUTION_PENDING", "EXECUTING", "COMPLETED", "PARTIALLY_COMPLETED", "FAILED", "MANUAL_REVIEW",
)
ACTION_TYPES = (
    "INVENTORY_REALLOCATION", "STOCK_TRANSFER", "SHIPMENT_EXPEDITE", "SHIPMENT_REROUTE", "ALTERNATIVE_SUPPLIER",
    "SPLIT_FULFILMENT", "PARTIAL_FULFILMENT", "PROCUREMENT_ADJUSTMENT",
)
APPROVAL_DECISIONS = ("PENDING", "APPROVED", "REJECTED", "REVISION_REQUIRED", "EXPIRED")
CHAIN_STATUSES = ("NOT_REQUIRED", "CHAIN_PENDING", "CHAIN_CONFIRMED", "CHAIN_FAILED", "CHAIN_REORG_REVIEW")
EXECUTION_ACTION_STATES = ("PENDING", "RUNNING", "SUCCEEDED", "FAILED", "COMPENSATING", "COMPENSATED", "MANUAL_REVIEW")


class RecoveryPlan(IdMixin, OrgMixin, TimestampMixin, Base):
    """Each row is one version of a plan, so an approval is tied to exactly what was reviewed (PRD 6.86).

    A material change adds a new row with the same plan_key. Old approvals stay on the old row and
    therefore cannot carry over.
    """
    __tablename__ = "recovery_plans"

    plan_key = Column(String(64), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    supersedes_id = Column(Uuid, ForeignKey("recovery_plans.id", ondelete="SET NULL"))
    disruption_id = Column(Uuid, ForeignKey("disruptions.id", ondelete="RESTRICT"), nullable=False, index=True)
    simulation_id = Column(Uuid, ForeignKey("simulation_snapshots.id", ondelete="SET NULL"), index=True)
    creator_id = Column(Uuid, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="DRAFT", index=True)
    title = Column(String(200), nullable=False)
    estimated_cost = Column(Money)
    feasibility_result = Column(JSONType)
    expected_outcome = Column(JSONType)
    approval_requirements = Column(JSONType, nullable=False, default=dict)
    plan_hash = Column(String(66))  # canonical digest anchored on-chain; the plan itself stays off-chain
    submitted_at = Column(TZDateTime)

    __table_args__ = (
        UniqueConstraint("organization_id", "plan_key", "version", name="uq_recovery_plans_key_version"),
        # Target of the composite foreign key on approvals.
        UniqueConstraint("id", "creator_id", name="uq_recovery_plans_id_creator"),
        in_values("status", PLAN_STATUSES),
        CheckConstraint("version >= 1", name="version_positive"),
    )


class RecoveryPlanAction(IdMixin, OrgMixin, Base):
    __tablename__ = "recovery_plan_actions"

    plan_id = Column(Uuid, ForeignKey("recovery_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    sequence = Column(Integer, nullable=False)
    action_type = Column(String(28), nullable=False)
    parameters = Column(JSONType, nullable=False, default=dict)
    estimated_cost = Column(Money)

    __table_args__ = (
        UniqueConstraint("plan_id", "sequence", name="uq_recovery_plan_actions_sequence"),
        in_values("action_type", ACTION_TYPES),
    )


class Approval(IdMixin, OrgMixin, TimestampMixin, Base):
    __tablename__ = "approvals"

    plan_id = Column(Uuid, nullable=False, index=True)
    plan_creator_id = Column(Uuid, nullable=False)
    approver_id = Column(Uuid, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    stage = Column(Integer, nullable=False, default=1)
    action_category = Column(String(64), nullable=False)
    decision = Column(String(20), nullable=False, default="PENDING", index=True)
    comments = Column(Text)
    wallet_address = Column(String(42))
    chain_status = Column(String(20), nullable=False, default="NOT_REQUIRED", index=True)
    tx_hash = Column(String(66))
    idempotency_key = Column(String(128), nullable=False)
    decided_at = Column(TZDateTime)

    __table_args__ = (
        # plan_creator_id must match the plan's real creator, so the rule below can't be sidestepped.
        ForeignKeyConstraint(
            ["plan_id", "plan_creator_id"], ["recovery_plans.id", "recovery_plans.creator_id"],
            name="fk_approvals_plan_and_creator", ondelete="CASCADE",
        ),
        # Separation of duties (PRD 6.4, 6.90), matching CreatorCannotDecide in the smart contract.
        CheckConstraint("approver_id <> plan_creator_id", name="creator_cannot_approve"),
        UniqueConstraint("plan_id", "stage", "approver_id", name="uq_approvals_one_decision"),
        UniqueConstraint("organization_id", "idempotency_key", name="uq_approvals_idempotency"),
        in_values("decision", APPROVAL_DECISIONS),
        in_values("chain_status", CHAIN_STATUSES),
    )


class ExecutionRun(IdMixin, OrgMixin, TimestampMixin, Base):
    """Only exists after explicit confirmation by an authorized user (PRD 6.94, 6.95)."""
    __tablename__ = "execution_runs"

    plan_id = Column(Uuid, ForeignKey("recovery_plans.id", ondelete="RESTRICT"), nullable=False, index=True)
    simulation_id = Column(Uuid, ForeignKey("simulation_snapshots.id", ondelete="SET NULL"))
    execution_request_id = Column(String(128), nullable=False)
    confirmed_by = Column(Uuid, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    confirmed_at = Column(TZDateTime, nullable=False, default=utcnow)
    status = Column(String(20), nullable=False, default="EXECUTION_PENDING", index=True)
    started_at = Column(TZDateTime)
    finished_at = Column(TZDateTime)

    __table_args__ = (
        UniqueConstraint("organization_id", "execution_request_id", name="uq_execution_runs_request"),
        in_values("status", ("EXECUTION_PENDING", "EXECUTING", "COMPLETED", "PARTIALLY_COMPLETED", "FAILED", "MANUAL_REVIEW")),
    )


class ExecutionAction(IdMixin, OrgMixin, Base):
    """Independent state per action, so a restart never repeats finished work (PRD 6.98, 14.10)."""
    __tablename__ = "execution_actions"

    run_id = Column(Uuid, ForeignKey("execution_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_action_id = Column(Uuid, ForeignKey("recovery_plan_actions.id", ondelete="RESTRICT"), nullable=False)
    status = Column(String(16), nullable=False, default="PENDING", index=True)
    idempotency_key = Column(String(128), nullable=False, unique=True)
    attempts = Column(Integer, nullable=False, default=0)
    result = Column(JSONType)
    error = Column(Text)
    started_at = Column(TZDateTime)
    finished_at = Column(TZDateTime)

    __table_args__ = (
        UniqueConstraint("run_id", "plan_action_id", name="uq_execution_actions_once"),
        in_values("status", EXECUTION_ACTION_STATES),
    )
