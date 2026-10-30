"""Disruptions, impact and risk results (PRD modules 10, 11, 12, 14)."""
from sqlalchemy import CheckConstraint, Column, Float, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from .base import Base, IdMixin, JSONType, Money, OrgMixin, Quantity, TimestampMixin, TZDateTime, in_values, non_negative, utcnow

DISRUPTION_TYPES = (
    "LATE_SHIPMENT", "SUPPLIER_DELAY", "INVENTORY_SHORTAGE", "SUPPLIER_PRODUCTION_FAILURE", "SHIPMENT_CANCELLATION",
    "CARRIER_DISRUPTION", "WAREHOUSE_CLOSURE", "WAREHOUSE_CAPACITY_SHORTAGE", "DAMAGED_STOCK", "QUALITY_REJECTION", "DEMAND_SURGE",
)
DISRUPTION_STATUSES = (
    "DETECTED", "VALIDATING", "CONFIRMED", "IMPACT_ASSESSED", "RECOVERY_REQUIRED", "RESOLVING",
    "RESOLVED", "CLOSED", "FALSE_POSITIVE", "REOPENED", "UNDER_REVIEW",
)
SEVERITIES = ("LOW", "MODERATE", "HIGH", "CRITICAL")


class Disruption(IdMixin, OrgMixin, TimestampMixin, Base):
    __tablename__ = "disruptions"

    code = Column(String(64), nullable=False)
    disruption_type = Column(String(32), nullable=False, index=True)
    severity = Column(String(12), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="DETECTED", index=True)
    affected_entity_type = Column(String(40), nullable=False)
    affected_entity_id = Column(Uuid, nullable=False, index=True)
    detected_at = Column(TZDateTime, nullable=False, default=utcnow, index=True)
    evidence = Column(JSONType, nullable=False, default=dict)
    owner_id = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    # Events about the same underlying problem share a key, so they form one incident (PRD 6.51).
    consolidation_key = Column(String(200), index=True)
    resolution_history = Column(JSONType, nullable=False, default=list)

    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_disruptions_org_code"),
        in_values("disruption_type", DISRUPTION_TYPES),
        in_values("status", DISRUPTION_STATUSES),
        in_values("severity", SEVERITIES),
    )


class DependencySnapshot(IdMixin, OrgMixin, Base):
    """Saved dependency graph behind an assessment. PostgreSQL stays the source of truth (PRD 6.14)."""
    __tablename__ = "dependency_snapshots"

    disruption_id = Column(Uuid, ForeignKey("disruptions.id", ondelete="CASCADE"), index=True)
    graph = Column(JSONType, nullable=False)
    content_hash = Column(String(64), nullable=False)
    taken_at = Column(TZDateTime, nullable=False, default=utcnow)


class ImpactAssessment(IdMixin, OrgMixin, Base):
    __tablename__ = "impact_assessments"

    disruption_id = Column(Uuid, ForeignKey("disruptions.id", ondelete="CASCADE"), nullable=False, index=True)
    dependency_snapshot_id = Column(Uuid, ForeignKey("dependency_snapshots.id", ondelete="SET NULL"))
    assessment_number = Column(Integer, nullable=False, default=1)
    affected_entities = Column(JSONType, nullable=False, default=dict)
    total_shortage_quantity = Column(Quantity, nullable=False, default=0)
    expected_delay_hours = Column(Float, nullable=False, default=0)
    contractual_exposure = Column(Money, nullable=False, default=0)
    evidence = Column(JSONType, nullable=False, default=dict)
    assessed_at = Column(TZDateTime, nullable=False, default=utcnow)

    __table_args__ = (
        UniqueConstraint("disruption_id", "assessment_number", name="uq_impact_assessments_number"),
        non_negative("total_shortage_quantity", "expected_delay_hours", "contractual_exposure"),
    )


class ImpactAssessmentLine(IdMixin, OrgMixin, Base):
    """One row per affected order line, so a shortage can't be counted twice in an assessment (PRD 6.55, 14.4)."""
    __tablename__ = "impact_assessment_lines"

    assessment_id = Column(Uuid, ForeignKey("impact_assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    order_item_id = Column(Uuid, ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False, index=True)
    shortage_quantity = Column(Quantity, nullable=False)
    expected_delay_hours = Column(Float, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("assessment_id", "order_item_id", name="uq_impact_assessment_lines_line"),
        non_negative("shortage_quantity", "expected_delay_hours"),
    )


class RiskAssessment(IdMixin, OrgMixin, Base):
    """One score per order line and time, recording which method made it (PRD 6.60)."""
    __tablename__ = "risk_assessments"

    order_item_id = Column(Uuid, ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False, index=True)
    disruption_id = Column(Uuid, ForeignKey("disruptions.id", ondelete="SET NULL"), index=True)
    method = Column(String(12), nullable=False)
    score = Column(Float, nullable=False)
    category = Column(String(12), nullable=False, index=True)
    miss_probability = Column(Float)
    priority_weight = Column(Float)
    components = Column(JSONType, nullable=False, default=dict)
    factor_effects = Column(JSONType)
    source_records = Column(JSONType, nullable=False, default=dict)
    policy_version = Column(String(32), nullable=False)
    model_version = Column(Integer)
    calculated_at = Column(TZDateTime, nullable=False, default=utcnow, index=True)

    __table_args__ = (
        in_values("method", ("ml", "formula")),
        in_values("category", SEVERITIES),
        CheckConstraint("score >= 0 AND score <= 100", name="score_range"),
        CheckConstraint("miss_probability IS NULL OR (miss_probability >= 0 AND miss_probability <= 1)", name="probability_range"),
        CheckConstraint("method <> 'ml' OR model_version IS NOT NULL", name="ml_needs_model_version"),
    )


class SimulationSnapshot(IdMixin, OrgMixin, Base):
    """Isolated, versioned input and output, so simulations never touch live records (PRD 6.76, 6.77)."""
    __tablename__ = "simulation_snapshots"

    disruption_id = Column(Uuid, ForeignKey("disruptions.id", ondelete="CASCADE"), index=True)
    created_by = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    optimization_mode = Column(String(24), nullable=False)
    inputs = Column(JSONType, nullable=False)
    entity_versions = Column(JSONType, nullable=False, default=dict)
    outputs = Column(JSONType)
    constraint_violations = Column(JSONType, nullable=False, default=list)
    is_feasible = Column(String(12), nullable=False, default="UNKNOWN")
    status = Column(String(12), nullable=False, default="CURRENT", index=True)
    stale_reason = Column(Text)
    content_hash = Column(String(64), nullable=False)
    created_at = Column(TZDateTime, nullable=False, default=utcnow)

    __table_args__ = (
        in_values("optimization_mode", ("LOWEST_COST", "MAX_ON_TIME", "BALANCED")),
        in_values("is_feasible", ("FEASIBLE", "INFEASIBLE", "UNKNOWN")),
        in_values("status", ("CURRENT", "STALE", "INVALIDATED")),
    )
