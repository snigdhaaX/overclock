"""Shared column types and mixins for the operational schema (PRD section 9)."""
import datetime
import uuid
from typing import Iterable
from sqlalchemy import JSON, CheckConstraint, Column, DateTime, ForeignKey, Integer, Numeric, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declared_attr
from ..blockchain.database import Base

__all__ = ["Base", "JSONType", "Money", "Quantity", "TZDateTime", "IdMixin", "OrgMixin", "TimestampMixin", "VersionedMixin", "in_values", "non_negative", "utcnow"]

JSONType = JSON().with_variant(JSONB(), "postgresql")
Money = Numeric(14, 2)
Quantity = Numeric(14, 3)
TZDateTime = DateTime(timezone=True)


def utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def in_values(column: str, values: Iterable[str], name: str = "") -> CheckConstraint:
    allowed = ", ".join(f"'{v}'" for v in values)
    return CheckConstraint(f"{column} IN ({allowed})", name=name or f"{column}_valid")


def non_negative(*columns: str) -> CheckConstraint:
    return CheckConstraint(" AND ".join(f"{c} >= 0" for c in columns), name=f"{columns[0]}_non_negative")


class IdMixin:
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)


class OrgMixin:
    """Every operational record belongs to an organization (PRD 6.3)."""

    @declared_attr
    def organization_id(cls):
        return Column(Uuid, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)


class TimestampMixin:
    created_at = Column(TZDateTime, default=utcnow, nullable=False)
    updated_at = Column(TZDateTime, default=utcnow, onupdate=utcnow, nullable=False)


class VersionedMixin:
    """Optimistic locking: a stale write raises StaleDataError instead of overwriting (PRD 9.2, 14.9)."""

    version = Column(Integer, nullable=False, default=1)

    @declared_attr
    def __mapper_args__(cls):
        return {"version_id_col": cls.version}
