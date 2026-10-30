"""Outside connections and file imports (PRD module 4, section 9.1)."""
from sqlalchemy import Column, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from .base import Base, IdMixin, JSONType, OrgMixin, TimestampMixin, TZDateTime, in_values, non_negative, utcnow


class IntegrationConfig(IdMixin, OrgMixin, TimestampMixin, Base):
    __tablename__ = "integration_configs"

    provider = Column(String(64), nullable=False)
    integration_type = Column(String(32), nullable=False)
    status = Column(String(16), nullable=False, default="ACTIVE")
    settings = Column(JSONType, nullable=False, default=dict)
    # A pointer to a secret manager or env var name. The secret itself is never stored here.
    secret_ref = Column(String(200))
    last_success_at = Column(TZDateTime)

    __table_args__ = (
        UniqueConstraint("organization_id", "provider", "integration_type", name="uq_integration_configs_provider"),
        in_values("status", ("ACTIVE", "DISABLED", "ERROR")),
    )


class IntegrationEventLog(IdMixin, OrgMixin, Base):
    __tablename__ = "integration_event_logs"

    integration_id = Column(Uuid, ForeignKey("integration_configs.id", ondelete="CASCADE"), nullable=False, index=True)
    direction = Column(String(8), nullable=False)
    event_type = Column(String(64), nullable=False)
    status = Column(String(16), nullable=False)
    payload = Column(JSONType)
    error = Column(Text)
    created_at = Column(TZDateTime, nullable=False, default=utcnow, index=True)

    __table_args__ = (
        in_values("direction", ("INBOUND", "OUTBOUND")),
        in_values("status", ("SUCCESS", "REJECTED", "FAILED")),
    )


class ImportJob(IdMixin, OrgMixin, TimestampMixin, Base):
    __tablename__ = "import_jobs"

    entity_type = Column(String(40), nullable=False)
    file_format = Column(String(8), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_hash = Column(String(64), nullable=False)
    mode = Column(String(8), nullable=False)
    status = Column(String(16), nullable=False, default="UPLOADED", index=True)
    column_mapping = Column(JSONType)
    total_rows = Column(Integer, nullable=False, default=0)
    accepted_rows = Column(Integer, nullable=False, default=0)
    rejected_rows = Column(Integer, nullable=False, default=0)
    created_by = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    confirmed_at = Column(TZDateTime)

    __table_args__ = (
        in_values("file_format", ("CSV", "JSON")),
        in_values("mode", ("STRICT", "PARTIAL")),
        in_values("status", ("UPLOADED", "VALIDATED", "CONFIRMED", "COMPLETED", "REJECTED", "FAILED")),
        non_negative("total_rows", "accepted_rows", "rejected_rows"),
    )


class ImportRowError(IdMixin, OrgMixin, Base):
    """Every error traces back to its input row or JSON record (PRD 6.20)."""
    __tablename__ = "import_errors"

    import_job_id = Column(Uuid, ForeignKey("import_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    row_number = Column(Integer, nullable=False)
    field = Column(String(120))
    error_code = Column(String(40), nullable=False)
    message = Column(Text, nullable=False)
    raw_record = Column(JSONType)
