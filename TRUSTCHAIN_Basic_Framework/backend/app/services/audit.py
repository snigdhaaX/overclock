from __future__ import annotations
import hashlib
import json
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..models import AuditLog


def record_audit(db: Session, actor: dict, action: str, entity_type: str, entity_id: str, details: dict | None = None):
    last = db.scalar(select(AuditLog).order_by(AuditLog.id.desc()).limit(1))
    previous_hash = last.record_hash if last else "0" * 64
    timestamp = datetime.now(timezone.utc)
    created_at = timestamp.isoformat()
    body = {
        "actor_id": actor["id"],
        "actor_role": actor["role"],
        "action": action,
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "details": details or {},
        "previous_hash": previous_hash,
        "created_at": created_at,
    }
    record_hash = hashlib.sha256(json.dumps(body, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    row = AuditLog(
        actor_id=actor["id"], actor_role=actor["role"], action=action,
        entity_type=entity_type, entity_id=str(entity_id),
        details=json.dumps(details or {}, sort_keys=True), previous_hash=previous_hash,
        record_hash=record_hash, created_at=timestamp,
    )
    db.add(row)
    return row
