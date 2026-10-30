import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String, Text, UniqueConstraint, Index
from ..blockchain.database import Base


class RiskExposure(Base):
    """One order line exposed to a disruption, as known at snapshot_at.

    missed_deadline stays NULL until the real outcome is reported. Resolved rows
    are the training data, so the model learns from what actually happened.
    """
    __tablename__ = "risk_exposures"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(String(128), nullable=False, index=True)
    exposure_id = Column(String(128), nullable=False)
    supplier_id = Column(String(128), nullable=False, index=True)
    carrier_id = Column(String(128), nullable=False, index=True)
    snapshot_at = Column(DateTime, nullable=False, index=True)
    hours_to_deadline = Column(Float, nullable=False)
    required_qty = Column(Float, nullable=False)
    shortage_qty = Column(Float, nullable=False)
    reported_delay_hours = Column(Float, nullable=False)
    priority_tier = Column(Integer, nullable=False)
    route_risk = Column(Float, nullable=True)
    weather_severity = Column(Float, nullable=True)
    customs_hours = Column(Float, nullable=True)
    missed_deadline = Column(Integer, nullable=True)
    outcome_at = Column(DateTime, nullable=True)
    data_source = Column(String(32), nullable=False, default="operational")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "exposure_id", name="uq_risk_exposure"),
        Index("ix_risk_exposure_org_outcome", "organization_id", "outcome_at"),
    )


class RiskModelVersion(Base):
    """Every training run, including rejected ones, so model changes stay auditable."""
    __tablename__ = "risk_model_versions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(String(128), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    # ACTIVE, RETIRED or REJECTED
    status = Column(String(16), nullable=False, index=True)
    decision_reason = Column(Text, nullable=False)
    trained_through = Column(DateTime, nullable=True)
    train_rows = Column(Integer, nullable=False)
    resolved_rows = Column(Integer, nullable=False)
    eval_rows = Column(Integer, nullable=False)
    metrics_json = Column(Text, nullable=False)
    artifact_path = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "version", name="uq_risk_model_version"),
    )
