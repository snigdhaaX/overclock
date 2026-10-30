"""Login, tokens and role checks (PRD module 1). Roles always come from the database, never the client."""
import datetime
import hashlib
import os
import secrets
import uuid
from dataclasses import dataclass
from typing import List, Optional, Set
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import Argon2Error, InvalidHashError
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from .blockchain.database import get_db
from .models.identity import AuthSession, Organization, Role, User, UserRole
from .models.base import utcnow

ACCESS_MINUTES = 120
REFRESH_DAYS = 14
_hasher = PasswordHasher()
# A random fallback means tokens stop working after a restart, which is safe for local use.
JWT_SECRET = os.getenv("TRUSTCHAIN_JWT_SECRET") or secrets.token_urlsafe(48)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

APP_ROLE = {
    "OPERATIONS_ANALYST": "operations-analyst",
    "SUPPLY_CHAIN_MANAGER": "supply-chain-manager",
    "WAREHOUSE_OPERATOR": "warehouse-operator",
    "PROCUREMENT_APPROVER": "procurement-approver",
    "ADMINISTRATOR": "administrator",
}


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@dataclass
class Principal:
    user: User
    organization: Organization
    roles: Set[str]

    def require(self, *allowed: str) -> None:
        if not self.roles.intersection(allowed):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "ROLE_NOT_AUTHORIZED", "message": "Your role can't do this."})


def active_roles(db: Session, user: User) -> Set[str]:
    rows = (
        db.query(Role.code).join(UserRole, UserRole.role_id == Role.id)
        .filter(UserRole.user_id == user.id, UserRole.revoked_at.is_(None)).all()
    )
    return {r[0] for r in rows}


def _access_token(user: User) -> str:
    now = utcnow()
    claims = {"sub": str(user.id), "iat": now, "exp": now + datetime.timedelta(minutes=ACCESS_MINUTES)}
    return jwt.encode(claims, JWT_SECRET, algorithm="HS256")


def get_principal(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> Principal:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "UNAUTHENTICATED", "message": "Please sign in."})
    if not authorization or not authorization.lower().startswith("bearer "):
        raise unauthorized
    try:
        claims = jwt.decode(authorization[7:], JWT_SECRET, algorithms=["HS256"])
        user = db.get(User, uuid.UUID(claims["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized
    if user is None or user.status != "ACTIVE":
        raise unauthorized
    return Principal(user=user, organization=db.get(Organization, user.organization_id), roles=active_roles(db, user))


class LoginRequest(BaseModel):
    email: str
    password: str
    requested_role: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str


def _app_role(roles: Set[str]) -> str:
    for code in APP_ROLE:
        if code in roles:
            return APP_ROLE[code]
    return "operations-analyst"


def _session_response(db: Session, user: User, roles: Set[str]) -> dict:
    refresh = secrets.token_urlsafe(48)
    db.add(AuthSession(user_id=user.id, refresh_token_hash=_token_hash(refresh), expires_at=utcnow() + datetime.timedelta(days=REFRESH_DAYS)))
    user.last_login_at = utcnow()
    db.commit()
    return {
        "user": {
            "id": str(user.id), "email": user.email, "name": user.full_name, "organization": db.get(Organization, user.organization_id).name,
            "assignedRole": _app_role(roles), "status": "active", "createdAt": user.created_at.isoformat(),
        },
        "tokens": {"accessToken": _access_token(user), "refreshToken": refresh, "expiresIn": ACCESS_MINUTES * 60},
    }


@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    invalid = HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "INVALID_CREDENTIALS", "message": "Invalid work email or password."})
    user = db.query(User).filter(User.email == request.email.strip().lower()).first()
    if user is None:
        raise invalid
    try:
        _hasher.verify(user.password_hash, request.password)
    except (Argon2Error, InvalidHashError):
        raise invalid
    if user.status != "ACTIVE":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "ACCOUNT_SUSPENDED", "message": "This account isn't active."})
    roles = active_roles(db, user)
    if request.requested_role and request.requested_role != _app_role(roles):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "ROLE_NOT_AUTHORIZED", "message": "This account can't use that role's portal."})
    return _session_response(db, user, roles)


@router.post("/refresh")
def refresh(request: RefreshRequest, db: Session = Depends(get_db)):
    session = db.query(AuthSession).filter(AuthSession.refresh_token_hash == _token_hash(request.refresh_token)).first()
    expired = HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "UNAUTHENTICATED", "message": "Please sign in again."})
    if session is None or session.revoked_at is not None:
        raise expired
    expires_at = session.expires_at if session.expires_at.tzinfo else session.expires_at.replace(tzinfo=datetime.timezone.utc)
    if expires_at < utcnow():
        raise expired
    session.revoked_at = utcnow()
    user = db.get(User, session.user_id)
    return _session_response(db, user, active_roles(db, user))


@router.post("/logout")
def logout(request: RefreshRequest, db: Session = Depends(get_db)):
    session = db.query(AuthSession).filter(AuthSession.refresh_token_hash == _token_hash(request.refresh_token)).first()
    if session is not None:
        session.revoked_at = utcnow()
        db.commit()
    return {"status": "SIGNED_OUT"}


@router.get("/me")
def me(principal: Principal = Depends(get_principal)):
    return {"id": str(principal.user.id), "email": principal.user.email, "roles": sorted(principal.roles), "organization": principal.organization.name}
