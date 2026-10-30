"""One identity rule for every API: a verified token, never a claim made in request headers."""
import os
import uuid
from dataclasses import dataclass
from typing import List, Optional
import jwt
from sqlalchemy.orm import Session
from .models.identity import Organization, Role, User, UserRole


@dataclass
class VerifiedIdentity:
    user_id: str
    organization_id: str  # the id the blockchain and supply chain modules use
    organization_slug: str  # the id the risk engine uses
    roles: List[str]


def header_auth_allowed() -> bool:
    """Only automated tests may identify themselves with headers. It's off unless explicitly enabled."""
    return os.getenv("TRUSTCHAIN_ALLOW_HEADER_AUTH") == "1"


def identity_from_jwt(db: Session, token: str) -> Optional[VerifiedIdentity]:
    from .auth import JWT_SECRET  # auth imports the models package, so this stays local

    try:
        claims = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = db.get(User, uuid.UUID(claims["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
    if user is None or user.status != "ACTIVE":
        return None
    organization = db.get(Organization, user.organization_id)
    roles = (
        db.query(Role.code).join(UserRole, UserRole.role_id == Role.id)
        .filter(UserRole.user_id == user.id, UserRole.revoked_at.is_(None)).all()
    )
    return VerifiedIdentity(
        user_id=str(user.id),
        organization_id=(organization.settings or {}).get("external_org_id") or organization.slug,
        organization_slug=organization.slug,
        roles=[r[0].lower() for r in roles],
    )


def bearer_token(authorization: Optional[str], x_auth_token: Optional[str] = None) -> Optional[str]:
    token = (authorization or x_auth_token or "").strip()
    if token.lower().startswith("bearer "):
        token = token[7:].strip()
    return token or None
