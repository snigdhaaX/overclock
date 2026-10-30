"""Audit trail and notifications (PRD modules 19, 20).

Blockchain transactions and events live in the existing tables in blockchain/database.py.
"""
from typing import List
from sqlalchemy import BigInteger, Boolean, Column, ForeignKey, Index, String, Text, UniqueConstraint, Uuid, event
from .base import Base, IdMixin, JSONType, OrgMixin, TZDateTime, in_values, utcnow

NOTIFICATION_CHANNELS = ("IN_APP", "WEB", "PUSH", "EMAIL", "SMS")
NOTIFICATION_SEVERITIES = ("INFO", "LOW", "MODERATE", "HIGH", "CRITICAL")


class AuditEvent(IdMixin, OrgMixin, Base):
    """Append-only, hash-chained record: H(n) = SHA256(H(n-1) || CanonicalEvent(n)) (PRD 6.105)."""
    __tablename__ = "audit_events"

    sequence = Column(BigInteger, nullable=False)
    actor_id = Column(Uuid, ForeignKey("users.id", ondelete="RESTRICT"))
    action_type = Column(String(64), nullable=False, index=True)
    entity_type = Column(String(40), nullable=False)
    entity_id = Column(String(64), nullable=False)
    plan_version = Column(BigInteger)
    correlation_id = Column(String(64), index=True)
    event_metadata = Column("metadata", JSONType, nullable=False, default=dict)
    previous_hash = Column(String(64))
    current_hash = Column(String(64), nullable=False)
    occurred_at = Column(TZDateTime, nullable=False, default=utcnow, index=True)

    __table_args__ = (
        UniqueConstraint("organization_id", "sequence", name="uq_audit_events_org_sequence"),
        UniqueConstraint("organization_id", "current_hash", name="uq_audit_events_org_hash"),
        Index("ix_audit_events_entity", "organization_id", "entity_type", "entity_id"),
    )


def _reject_audit_change(mapper, connection, target):
    raise ValueError("audit_events is append-only: records cannot be changed or deleted.")


event.listen(AuditEvent, "before_update", _reject_audit_change)
event.listen(AuditEvent, "before_delete", _reject_audit_change)


def audit_trigger_ddl(dialect: str) -> List[str]:
    """Blocks edits at the database too, so direct SQL can't rewrite the trail either."""
    if dialect == "postgresql":
        return [
            """CREATE OR REPLACE FUNCTION reject_audit_change() RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'audit_events is append-only';
            END;
            $$ LANGUAGE plpgsql""",
            """CREATE TRIGGER audit_events_append_only BEFORE UPDATE OR DELETE ON audit_events
            FOR EACH ROW EXECUTE FUNCTION reject_audit_change()""",
            """CREATE TRIGGER audit_events_no_truncate BEFORE TRUNCATE ON audit_events
            FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_change()""",
        ]
    if dialect == "sqlite":
        return [
            f"""CREATE TRIGGER audit_events_no_{op.lower()} BEFORE {op} ON audit_events
            BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END"""
            for op in ("UPDATE", "DELETE")
        ]
    return []


def drop_audit_trigger_ddl(dialect: str) -> List[str]:
    if dialect == "postgresql":
        return [
            "DROP TRIGGER IF EXISTS audit_events_no_truncate ON audit_events",
            "DROP TRIGGER IF EXISTS audit_events_append_only ON audit_events",
            "DROP FUNCTION IF EXISTS reject_audit_change()",
        ]
    if dialect == "sqlite":
        return ["DROP TRIGGER IF EXISTS audit_events_no_update", "DROP TRIGGER IF EXISTS audit_events_no_delete"]
    return []


@event.listens_for(AuditEvent.__table__, "after_create")
def _install_audit_triggers(target, connection, **kw):
    for statement in audit_trigger_ddl(connection.dialect.name):
        connection.exec_driver_sql(statement)


class Notification(IdMixin, OrgMixin, Base):
    __tablename__ = "notifications"

    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    notification_type = Column(String(40), nullable=False, index=True)
    severity = Column(String(12), nullable=False, default="INFO")
    channel = Column(String(8), nullable=False, default="IN_APP")
    title = Column(String(200), nullable=False)
    body = Column(Text)
    entity_type = Column(String(40))
    entity_id = Column(String(64))
    dedupe_key = Column(String(200), nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    read_at = Column(TZDateTime)
    created_at = Column(TZDateTime, nullable=False, default=utcnow, index=True)

    __table_args__ = (
        # The same alert can't reach the same person twice on a channel (PRD 6.101).
        UniqueConstraint("user_id", "channel", "dedupe_key", name="uq_notifications_dedupe"),
        in_values("severity", NOTIFICATION_SEVERITIES),
        in_values("channel", NOTIFICATION_CHANNELS),
    )
