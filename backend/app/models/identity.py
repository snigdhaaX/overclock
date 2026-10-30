"""Tenancy, users and role-based access control (PRD module 1, Appendix A).

Wallet links live in the existing user_wallets table in blockchain/database.py.
"""
from sqlalchemy import Boolean, Column, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Uuid, text
from .base import Base, IdMixin, JSONType, Money, OrgMixin, TimestampMixin, TZDateTime, in_values, utcnow

USER_STATUSES = ("ACTIVE", "PENDING_APPROVAL", "SUSPENDED")
ROLE_CODES = ("OPERATIONS_ANALYST", "SUPPLY_CHAIN_MANAGER", "WAREHOUSE_OPERATOR", "PROCUREMENT_APPROVER", "ADMINISTRATOR", "AUDITOR")


class Organization(IdMixin, TimestampMixin, Base):
    __tablename__ = "organizations"

    name = Column(String(200), nullable=False)
    slug = Column(String(64), nullable=False, unique=True)
    status = Column(String(16), nullable=False, default="ACTIVE")
    settings = Column(JSONType, nullable=False, default=dict)

    __table_args__ = (in_values("status", ("ACTIVE", "SUSPENDED")),)


class User(IdMixin, OrgMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email = Column(String(320), nullable=False)
    full_name = Column(String(200), nullable=False)
    password_hash = Column(Text, nullable=False)  # Argon2id, never plain text
    status = Column(String(20), nullable=False, default="PENDING_APPROVAL")
    mfa_enabled = Column(Boolean, nullable=False, default=False)
    last_login_at = Column(TZDateTime)

    __table_args__ = (
        UniqueConstraint("organization_id", "email", name="uq_users_org_email"),
        in_values("status", USER_STATUSES),
    )


class Role(IdMixin, OrgMixin, Base):
    __tablename__ = "roles"

    code = Column(String(64), nullable=False)
    name = Column(String(120), nullable=False)
    is_system = Column(Boolean, nullable=False, default=True)

    __table_args__ = (UniqueConstraint("organization_id", "code", name="uq_roles_org_code"),)


class Permission(IdMixin, Base):
    """Global catalog of permission codes, such as recovery_plan:approve."""
    __tablename__ = "permissions"

    code = Column(String(120), nullable=False, unique=True)
    resource = Column(String(64), nullable=False)
    action = Column(String(64), nullable=False)
    is_restricted = Column(Boolean, nullable=False, default=False)  # separation-of-duties action
    description = Column(Text)


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id = Column(Uuid, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id = Column(Uuid, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)


class UserRole(IdMixin, Base):
    """Revoked rows are kept as history, so a user can hold one active copy of a role at a time."""
    __tablename__ = "user_roles"

    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id = Column(Uuid, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False, index=True)
    assigned_by = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    assigned_at = Column(TZDateTime, nullable=False, default=utcnow)
    revoked_at = Column(TZDateTime)

    __table_args__ = (
        Index(
            "uq_user_roles_active", "user_id", "role_id", unique=True,
            postgresql_where=text("revoked_at IS NULL"), sqlite_where=text("revoked_at IS NULL"),
        ),
    )


class AuthSession(IdMixin, Base):
    __tablename__ = "sessions"

    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    refresh_token_hash = Column(String(128), nullable=False, unique=True)
    device_info = Column(JSONType)
    created_at = Column(TZDateTime, nullable=False, default=utcnow)
    last_used_at = Column(TZDateTime)
    expires_at = Column(TZDateTime, nullable=False)
    revoked_at = Column(TZDateTime)


class ApprovalAuthority(IdMixin, OrgMixin, Base):
    """Which role may sign which action, at which stage, and up to what amount (PRD 3.2, 3.4, 6.90)."""
    __tablename__ = "approval_authorities"

    role_id = Column(Uuid, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    action_category = Column(String(64), nullable=False)
    stage = Column(Integer, nullable=False, default=1)
    max_amount = Column(Money)  # NULL means no limit
    currency = Column(String(3), nullable=False, default="USD")

    __table_args__ = (
        UniqueConstraint("role_id", "action_category", "stage", name="uq_approval_authorities_role_action_stage"),
    )


class UserWarehouseAssignment(IdMixin, Base):
    """Warehouse Operators can only reach warehouses assigned to them (PRD 3.3)."""
    __tablename__ = "user_warehouse_assignments"

    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    warehouse_id = Column(Uuid, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    valid_from = Column(TZDateTime, nullable=False, default=utcnow)
    valid_to = Column(TZDateTime)

    __table_args__ = (
        UniqueConstraint("user_id", "warehouse_id", "valid_from", name="uq_user_warehouse_assignments_period"),
    )
