"""initial schema

Revision ID: 0001
Revises: 
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from backend.app.models.governance import audit_trigger_ddl, drop_audit_trigger_ddl

revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('blockchain_events',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('chain_id', sa.Integer(), nullable=False),
    sa.Column('tx_hash', sa.String(length=66), nullable=False),
    sa.Column('log_index', sa.Integer(), nullable=False),
    sa.Column('event_name', sa.String(length=64), nullable=False),
    sa.Column('contract_address', sa.String(length=42), nullable=False),
    sa.Column('plan_id', sa.String(length=64), nullable=True),
    sa.Column('plan_version', sa.Integer(), nullable=True),
    sa.Column('wallet_address', sa.String(length=42), nullable=True),
    sa.Column('event_data_json', sa.Text(), nullable=False),
    sa.Column('block_number', sa.Integer(), nullable=False),
    sa.Column('indexed_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_blockchain_events')),
    sa.UniqueConstraint('chain_id', 'tx_hash', 'log_index', name='uq_chain_tx_log')
    )
    with op.batch_alter_table('blockchain_events', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_blockchain_events_event_name'), ['event_name'], unique=False)
        batch_op.create_index(batch_op.f('ix_blockchain_events_plan_id'), ['plan_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_blockchain_events_tx_hash'), ['tx_hash'], unique=False)
        batch_op.create_index(batch_op.f('ix_blockchain_events_wallet_address'), ['wallet_address'], unique=False)

    op.create_table('blockchain_transactions',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('tx_hash', sa.String(length=66), nullable=False),
    sa.Column('chain_id', sa.Integer(), nullable=False),
    sa.Column('contract_address', sa.String(length=42), nullable=False),
    sa.Column('function_name', sa.String(length=64), nullable=True),
    sa.Column('plan_id', sa.String(length=64), nullable=True),
    sa.Column('plan_version', sa.Integer(), nullable=True),
    sa.Column('submitter_wallet', sa.String(length=42), nullable=False),
    sa.Column('block_number', sa.Integer(), nullable=True),
    sa.Column('gas_used', sa.Integer(), nullable=True),
    sa.Column('status', sa.String(length=32), nullable=False),
    sa.Column('receipt_status', sa.Integer(), nullable=True),
    sa.Column('confirmations', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('confirmed_at', sa.DateTime(), nullable=True),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_blockchain_transactions'))
    )
    with op.batch_alter_table('blockchain_transactions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_blockchain_transactions_plan_id'), ['plan_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_blockchain_transactions_status'), ['status'], unique=False)
        batch_op.create_index(batch_op.f('ix_blockchain_transactions_submitter_wallet'), ['submitter_wallet'], unique=False)
        batch_op.create_index(batch_op.f('ix_blockchain_transactions_tx_hash'), ['tx_hash'], unique=True)

    op.create_table('operational_plans',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('plan_id', sa.String(length=64), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('organization_id', sa.String(length=128), nullable=False),
    sa.Column('plan_data_json', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_operational_plans')),
    sa.UniqueConstraint('plan_id', 'version', name='uq_plan_version')
    )
    with op.batch_alter_table('operational_plans', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_operational_plans_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_operational_plans_plan_id'), ['plan_id'], unique=False)

    op.create_table('organizations',
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('slug', sa.String(length=64), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('settings', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("status IN ('ACTIVE', 'SUSPENDED')", name=op.f('ck_organizations_status_valid')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_organizations')),
    sa.UniqueConstraint('slug', name=op.f('uq_organizations_slug'))
    )
    op.create_table('permissions',
    sa.Column('code', sa.String(length=120), nullable=False),
    sa.Column('resource', sa.String(length=64), nullable=False),
    sa.Column('action', sa.String(length=64), nullable=False),
    sa.Column('is_restricted', sa.Boolean(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_permissions')),
    sa.UniqueConstraint('code', name=op.f('uq_permissions_code'))
    )
    op.create_table('risk_exposures',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('organization_id', sa.String(length=128), nullable=False),
    sa.Column('exposure_id', sa.String(length=128), nullable=False),
    sa.Column('supplier_id', sa.String(length=128), nullable=False),
    sa.Column('carrier_id', sa.String(length=128), nullable=False),
    sa.Column('snapshot_at', sa.DateTime(), nullable=False),
    sa.Column('hours_to_deadline', sa.Float(), nullable=False),
    sa.Column('required_qty', sa.Float(), nullable=False),
    sa.Column('shortage_qty', sa.Float(), nullable=False),
    sa.Column('reported_delay_hours', sa.Float(), nullable=False),
    sa.Column('priority_tier', sa.Integer(), nullable=False),
    sa.Column('route_risk', sa.Float(), nullable=True),
    sa.Column('weather_severity', sa.Float(), nullable=True),
    sa.Column('customs_hours', sa.Float(), nullable=True),
    sa.Column('missed_deadline', sa.Integer(), nullable=True),
    sa.Column('outcome_at', sa.DateTime(), nullable=True),
    sa.Column('data_source', sa.String(length=32), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_risk_exposures')),
    sa.UniqueConstraint('organization_id', 'exposure_id', name='uq_risk_exposure')
    )
    with op.batch_alter_table('risk_exposures', schema=None) as batch_op:
        batch_op.create_index('ix_risk_exposure_org_outcome', ['organization_id', 'outcome_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_risk_exposures_carrier_id'), ['carrier_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_risk_exposures_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_risk_exposures_snapshot_at'), ['snapshot_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_risk_exposures_supplier_id'), ['supplier_id'], unique=False)

    op.create_table('risk_model_versions',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('organization_id', sa.String(length=128), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('decision_reason', sa.Text(), nullable=False),
    sa.Column('trained_through', sa.DateTime(), nullable=True),
    sa.Column('train_rows', sa.Integer(), nullable=False),
    sa.Column('resolved_rows', sa.Integer(), nullable=False),
    sa.Column('eval_rows', sa.Integer(), nullable=False),
    sa.Column('metrics_json', sa.Text(), nullable=False),
    sa.Column('artifact_path', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_risk_model_versions')),
    sa.UniqueConstraint('organization_id', 'version', name='uq_risk_model_version')
    )
    with op.batch_alter_table('risk_model_versions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_risk_model_versions_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_risk_model_versions_status'), ['status'], unique=False)

    op.create_table('user_wallets',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.String(length=128), nullable=False),
    sa.Column('organization_id', sa.String(length=128), nullable=False),
    sa.Column('wallet_address', sa.String(length=42), nullable=False),
    sa.Column('linked_at', sa.DateTime(), nullable=False),
    sa.Column('active', sa.Boolean(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_user_wallets')),
    sa.UniqueConstraint('user_id', 'wallet_address', name='uq_user_wallet')
    )
    with op.batch_alter_table('user_wallets', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_user_wallets_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_user_wallets_user_id'), ['user_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_user_wallets_wallet_address'), ['wallet_address'], unique=False)

    op.create_table('wallet_nonces',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('nonce', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=128), nullable=False),
    sa.Column('organization_id', sa.String(length=128), nullable=False),
    sa.Column('issued_at', sa.DateTime(), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.Column('consumed', sa.Boolean(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_wallet_nonces'))
    )
    with op.batch_alter_table('wallet_nonces', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_wallet_nonces_nonce'), ['nonce'], unique=True)

    op.create_table('carriers',
    sa.Column('code', sa.String(length=64), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('capacity', sa.Numeric(precision=14, scale=3), nullable=True),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("status IN ('ACTIVE', 'INACTIVE')", name=op.f('ck_carriers_status_valid')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_carriers_organization_id_organizations'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_carriers')),
    sa.UniqueConstraint('organization_id', 'code', name='uq_carriers_org_code')
    )
    with op.batch_alter_table('carriers', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_carriers_organization_id'), ['organization_id'], unique=False)

    op.create_table('customer_orders',
    sa.Column('code', sa.String(length=64), nullable=False),
    sa.Column('customer_reference', sa.String(length=200), nullable=False),
    sa.Column('order_date', sa.Date(), nullable=False),
    sa.Column('required_delivery_date', sa.DateTime(timezone=True), nullable=False),
    sa.Column('priority_tier', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=24), nullable=False),
    sa.Column('delivery_destination', sa.Text(), nullable=True),
    sa.Column('sla_terms', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.CheckConstraint("status IN ('OPEN', 'PARTIALLY_FULFILLED', 'FULFILLED', 'DELAYED', 'CANCELLED', 'CLOSED', 'REINSTATED')", name=op.f('ck_customer_orders_status_valid')),
    sa.CheckConstraint('priority_tier BETWEEN 1 AND 4', name=op.f('ck_customer_orders_priority_tier_range')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_customer_orders_organization_id_organizations'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_customer_orders')),
    sa.UniqueConstraint('organization_id', 'code', name='uq_customer_orders_org_code')
    )
    with op.batch_alter_table('customer_orders', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_customer_orders_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_customer_orders_required_delivery_date'), ['required_delivery_date'], unique=False)
        batch_op.create_index(batch_op.f('ix_customer_orders_status'), ['status'], unique=False)

    op.create_table('integration_configs',
    sa.Column('provider', sa.String(length=64), nullable=False),
    sa.Column('integration_type', sa.String(length=32), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('settings', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('secret_ref', sa.String(length=200), nullable=True),
    sa.Column('last_success_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("status IN ('ACTIVE', 'DISABLED', 'ERROR')", name=op.f('ck_integration_configs_status_valid')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_integration_configs_organization_id_organizations'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_integration_configs')),
    sa.UniqueConstraint('organization_id', 'provider', 'integration_type', name='uq_integration_configs_provider')
    )
    with op.batch_alter_table('integration_configs', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_integration_configs_organization_id'), ['organization_id'], unique=False)

    op.create_table('products',
    sa.Column('sku', sa.String(length=64), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('category', sa.String(length=120), nullable=True),
    sa.Column('unit_of_measure', sa.String(length=16), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("status IN ('ACTIVE', 'INACTIVE')", name=op.f('ck_products_status_valid')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_products_organization_id_organizations'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_products')),
    sa.UniqueConstraint('organization_id', 'sku', name='uq_products_org_sku')
    )
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_products_organization_id'), ['organization_id'], unique=False)

    op.create_table('roles',
    sa.Column('code', sa.String(length=64), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('is_system', sa.Boolean(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_roles_organization_id_organizations'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_roles')),
    sa.UniqueConstraint('organization_id', 'code', name='uq_roles_org_code')
    )
    with op.batch_alter_table('roles', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_roles_organization_id'), ['organization_id'], unique=False)

    op.create_table('suppliers',
    sa.Column('code', sa.String(length=64), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('category', sa.String(length=120), nullable=True),
    sa.Column('contact', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('country', sa.String(length=120), nullable=True),
    sa.Column('contract_info', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.CheckConstraint("status IN ('ACTIVE', 'INACTIVE')", name=op.f('ck_suppliers_status_valid')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_suppliers_organization_id_organizations'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_suppliers')),
    sa.UniqueConstraint('organization_id', 'code', name='uq_suppliers_org_code')
    )
    with op.batch_alter_table('suppliers', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_suppliers_organization_id'), ['organization_id'], unique=False)

    op.create_table('users',
    sa.Column('email', sa.String(length=320), nullable=False),
    sa.Column('full_name', sa.String(length=200), nullable=False),
    sa.Column('password_hash', sa.Text(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('mfa_enabled', sa.Boolean(), nullable=False),
    sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("status IN ('ACTIVE', 'PENDING_APPROVAL', 'SUSPENDED')", name=op.f('ck_users_status_valid')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_users_organization_id_organizations'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_users')),
    sa.UniqueConstraint('organization_id', 'email', name='uq_users_org_email')
    )
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_users_organization_id'), ['organization_id'], unique=False)

    op.create_table('warehouses',
    sa.Column('code', sa.String(length=64), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('latitude', sa.Float(), nullable=True),
    sa.Column('longitude', sa.Float(), nullable=True),
    sa.Column('operating_calendar', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('receiving_capacity', sa.Numeric(precision=14, scale=3), nullable=True),
    sa.Column('dispatch_capacity', sa.Numeric(precision=14, scale=3), nullable=True),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("status IN ('ACTIVE', 'INACTIVE', 'CLOSED')", name=op.f('ck_warehouses_status_valid')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_warehouses_organization_id_organizations'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_warehouses')),
    sa.UniqueConstraint('organization_id', 'code', name='uq_warehouses_org_code')
    )
    with op.batch_alter_table('warehouses', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_warehouses_organization_id'), ['organization_id'], unique=False)

    op.create_table('approval_authorities',
    sa.Column('role_id', sa.Uuid(), nullable=False),
    sa.Column('action_category', sa.String(length=64), nullable=False),
    sa.Column('stage', sa.Integer(), nullable=False),
    sa.Column('max_amount', sa.Numeric(precision=14, scale=2), nullable=True),
    sa.Column('currency', sa.String(length=3), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_approval_authorities_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['role_id'], ['roles.id'], name=op.f('fk_approval_authorities_role_id_roles'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_approval_authorities')),
    sa.UniqueConstraint('role_id', 'action_category', 'stage', name='uq_approval_authorities_role_action_stage')
    )
    with op.batch_alter_table('approval_authorities', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_approval_authorities_organization_id'), ['organization_id'], unique=False)

    op.create_table('audit_events',
    sa.Column('sequence', sa.BigInteger(), nullable=False),
    sa.Column('actor_id', sa.Uuid(), nullable=True),
    sa.Column('action_type', sa.String(length=64), nullable=False),
    sa.Column('entity_type', sa.String(length=40), nullable=False),
    sa.Column('entity_id', sa.String(length=64), nullable=False),
    sa.Column('plan_version', sa.BigInteger(), nullable=True),
    sa.Column('correlation_id', sa.String(length=64), nullable=True),
    sa.Column('metadata', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('previous_hash', sa.String(length=64), nullable=True),
    sa.Column('current_hash', sa.String(length=64), nullable=False),
    sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['actor_id'], ['users.id'], name=op.f('fk_audit_events_actor_id_users'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_audit_events_organization_id_organizations'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_audit_events')),
    sa.UniqueConstraint('organization_id', 'current_hash', name='uq_audit_events_org_hash'),
    sa.UniqueConstraint('organization_id', 'sequence', name='uq_audit_events_org_sequence')
    )
    with op.batch_alter_table('audit_events', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_audit_events_action_type'), ['action_type'], unique=False)
        batch_op.create_index(batch_op.f('ix_audit_events_correlation_id'), ['correlation_id'], unique=False)
        batch_op.create_index('ix_audit_events_entity', ['organization_id', 'entity_type', 'entity_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_audit_events_occurred_at'), ['occurred_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_audit_events_organization_id'), ['organization_id'], unique=False)

    op.create_table('disruptions',
    sa.Column('code', sa.String(length=64), nullable=False),
    sa.Column('disruption_type', sa.String(length=32), nullable=False),
    sa.Column('severity', sa.String(length=12), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('affected_entity_type', sa.String(length=40), nullable=False),
    sa.Column('affected_entity_id', sa.Uuid(), nullable=False),
    sa.Column('detected_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('evidence', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('owner_id', sa.Uuid(), nullable=True),
    sa.Column('consolidation_key', sa.String(length=200), nullable=True),
    sa.Column('resolution_history', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("disruption_type IN ('LATE_SHIPMENT', 'SUPPLIER_DELAY', 'INVENTORY_SHORTAGE', 'SUPPLIER_PRODUCTION_FAILURE', 'SHIPMENT_CANCELLATION', 'CARRIER_DISRUPTION', 'WAREHOUSE_CLOSURE', 'WAREHOUSE_CAPACITY_SHORTAGE', 'DAMAGED_STOCK', 'QUALITY_REJECTION', 'DEMAND_SURGE')", name=op.f('ck_disruptions_disruption_type_valid')),
    sa.CheckConstraint("severity IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')", name=op.f('ck_disruptions_severity_valid')),
    sa.CheckConstraint("status IN ('DETECTED', 'VALIDATING', 'CONFIRMED', 'IMPACT_ASSESSED', 'RECOVERY_REQUIRED', 'RESOLVING', 'RESOLVED', 'CLOSED', 'FALSE_POSITIVE', 'REOPENED', 'UNDER_REVIEW')", name=op.f('ck_disruptions_status_valid')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_disruptions_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['owner_id'], ['users.id'], name=op.f('fk_disruptions_owner_id_users'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_disruptions')),
    sa.UniqueConstraint('organization_id', 'code', name='uq_disruptions_org_code')
    )
    with op.batch_alter_table('disruptions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_disruptions_affected_entity_id'), ['affected_entity_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_disruptions_consolidation_key'), ['consolidation_key'], unique=False)
        batch_op.create_index(batch_op.f('ix_disruptions_detected_at'), ['detected_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_disruptions_disruption_type'), ['disruption_type'], unique=False)
        batch_op.create_index(batch_op.f('ix_disruptions_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_disruptions_severity'), ['severity'], unique=False)
        batch_op.create_index(batch_op.f('ix_disruptions_status'), ['status'], unique=False)

    op.create_table('import_jobs',
    sa.Column('entity_type', sa.String(length=40), nullable=False),
    sa.Column('file_format', sa.String(length=8), nullable=False),
    sa.Column('file_name', sa.String(length=255), nullable=False),
    sa.Column('file_hash', sa.String(length=64), nullable=False),
    sa.Column('mode', sa.String(length=8), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('column_mapping', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('total_rows', sa.Integer(), nullable=False),
    sa.Column('accepted_rows', sa.Integer(), nullable=False),
    sa.Column('rejected_rows', sa.Integer(), nullable=False),
    sa.Column('created_by', sa.Uuid(), nullable=True),
    sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("file_format IN ('CSV', 'JSON')", name=op.f('ck_import_jobs_file_format_valid')),
    sa.CheckConstraint("mode IN ('STRICT', 'PARTIAL')", name=op.f('ck_import_jobs_mode_valid')),
    sa.CheckConstraint("status IN ('UPLOADED', 'VALIDATED', 'CONFIRMED', 'COMPLETED', 'REJECTED', 'FAILED')", name=op.f('ck_import_jobs_status_valid')),
    sa.CheckConstraint('total_rows >= 0 AND accepted_rows >= 0 AND rejected_rows >= 0', name=op.f('ck_import_jobs_total_rows_non_negative')),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], name=op.f('fk_import_jobs_created_by_users'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_import_jobs_organization_id_organizations'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_import_jobs'))
    )
    with op.batch_alter_table('import_jobs', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_import_jobs_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_import_jobs_status'), ['status'], unique=False)

    op.create_table('integration_event_logs',
    sa.Column('integration_id', sa.Uuid(), nullable=False),
    sa.Column('direction', sa.String(length=8), nullable=False),
    sa.Column('event_type', sa.String(length=64), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('payload', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('error', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.CheckConstraint("direction IN ('INBOUND', 'OUTBOUND')", name=op.f('ck_integration_event_logs_direction_valid')),
    sa.CheckConstraint("status IN ('SUCCESS', 'REJECTED', 'FAILED')", name=op.f('ck_integration_event_logs_status_valid')),
    sa.ForeignKeyConstraint(['integration_id'], ['integration_configs.id'], name=op.f('fk_integration_event_logs_integration_id_integration_configs'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_integration_event_logs_organization_id_organizations'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_integration_event_logs'))
    )
    with op.batch_alter_table('integration_event_logs', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_integration_event_logs_created_at'), ['created_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_integration_event_logs_integration_id'), ['integration_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_integration_event_logs_organization_id'), ['organization_id'], unique=False)

    op.create_table('inventory',
    sa.Column('warehouse_id', sa.Uuid(), nullable=False),
    sa.Column('product_id', sa.Uuid(), nullable=False),
    sa.Column('on_hand_quantity', sa.Numeric(precision=14, scale=3), nullable=False),
    sa.Column('reserved_quantity', sa.Numeric(precision=14, scale=3), nullable=False),
    sa.Column('safety_stock_quantity', sa.Numeric(precision=14, scale=3), nullable=False),
    sa.Column('damaged_quantity', sa.Numeric(precision=14, scale=3), nullable=False),
    sa.Column('quarantined_quantity', sa.Numeric(precision=14, scale=3), nullable=False),
    sa.Column('available_quantity', sa.Numeric(precision=14, scale=3), sa.Computed('on_hand_quantity - reserved_quantity - safety_stock_quantity - damaged_quantity - quarantined_quantity', persisted=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.CheckConstraint('on_hand_quantity >= 0 AND reserved_quantity >= 0 AND safety_stock_quantity >= 0 AND damaged_quantity >= 0 AND quarantined_quantity >= 0', name=op.f('ck_inventory_on_hand_quantity_non_negative')),
    sa.CheckConstraint('on_hand_quantity >= reserved_quantity + damaged_quantity + quarantined_quantity', name=op.f('ck_inventory_stock_covers_claims')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_inventory_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], name=op.f('fk_inventory_product_id_products'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['warehouse_id'], ['warehouses.id'], name=op.f('fk_inventory_warehouse_id_warehouses'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_inventory')),
    sa.UniqueConstraint('warehouse_id', 'product_id', name='uq_inventory_position')
    )
    with op.batch_alter_table('inventory', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_inventory_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_inventory_product_id'), ['product_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_inventory_warehouse_id'), ['warehouse_id'], unique=False)

    op.create_table('notifications',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('notification_type', sa.String(length=40), nullable=False),
    sa.Column('severity', sa.String(length=12), nullable=False),
    sa.Column('channel', sa.String(length=8), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('body', sa.Text(), nullable=True),
    sa.Column('entity_type', sa.String(length=40), nullable=True),
    sa.Column('entity_id', sa.String(length=64), nullable=True),
    sa.Column('dedupe_key', sa.String(length=200), nullable=False),
    sa.Column('is_read', sa.Boolean(), nullable=False),
    sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.CheckConstraint("channel IN ('IN_APP', 'WEB', 'PUSH', 'EMAIL', 'SMS')", name=op.f('ck_notifications_channel_valid')),
    sa.CheckConstraint("severity IN ('INFO', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL')", name=op.f('ck_notifications_severity_valid')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_notifications_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_notifications_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_notifications')),
    sa.UniqueConstraint('user_id', 'channel', 'dedupe_key', name='uq_notifications_dedupe')
    )
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_notifications_created_at'), ['created_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_notifications_notification_type'), ['notification_type'], unique=False)
        batch_op.create_index(batch_op.f('ix_notifications_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_notifications_user_id'), ['user_id'], unique=False)

    op.create_table('order_items',
    sa.Column('order_id', sa.Uuid(), nullable=False),
    sa.Column('product_id', sa.Uuid(), nullable=False),
    sa.Column('required_quantity', sa.Numeric(precision=14, scale=3), nullable=False),
    sa.Column('allocated_quantity', sa.Numeric(precision=14, scale=3), nullable=False),
    sa.Column('fulfilled_quantity', sa.Numeric(precision=14, scale=3), nullable=False),
    sa.Column('remaining_quantity', sa.Numeric(precision=14, scale=3), sa.Computed('required_quantity - fulfilled_quantity', persisted=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.CheckConstraint('allocated_quantity >= 0 AND fulfilled_quantity >= 0', name=op.f('ck_order_items_allocated_quantity_non_negative')),
    sa.CheckConstraint('fulfilled_quantity <= required_quantity', name=op.f('ck_order_items_not_over_fulfilled')),
    sa.CheckConstraint('required_quantity > 0', name=op.f('ck_order_items_required_quantity_positive')),
    sa.ForeignKeyConstraint(['order_id'], ['customer_orders.id'], name=op.f('fk_order_items_order_id_customer_orders'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_order_items_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], name=op.f('fk_order_items_product_id_products'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_order_items')),
    sa.UniqueConstraint('order_id', 'product_id', name='uq_order_items_line')
    )
    with op.batch_alter_table('order_items', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_order_items_order_id'), ['order_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_order_items_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_order_items_product_id'), ['product_id'], unique=False)

    op.create_table('purchase_orders',
    sa.Column('code', sa.String(length=64), nullable=False),
    sa.Column('supplier_id', sa.Uuid(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('order_date', sa.Date(), nullable=False),
    sa.Column('committed_date', sa.Date(), nullable=True),
    sa.Column('expected_date', sa.Date(), nullable=True),
    sa.Column('total_cost', sa.Numeric(precision=14, scale=2), nullable=True),
    sa.Column('currency', sa.String(length=3), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.CheckConstraint("status IN ('OPEN', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')", name=op.f('ck_purchase_orders_status_valid')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_purchase_orders_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], name=op.f('fk_purchase_orders_supplier_id_suppliers'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_purchase_orders')),
    sa.UniqueConstraint('organization_id', 'code', name='uq_purchase_orders_org_code')
    )
    with op.batch_alter_table('purchase_orders', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_purchase_orders_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_purchase_orders_supplier_id'), ['supplier_id'], unique=False)

    op.create_table('role_permissions',
    sa.Column('role_id', sa.Uuid(), nullable=False),
    sa.Column('permission_id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], name=op.f('fk_role_permissions_permission_id_permissions'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['role_id'], ['roles.id'], name=op.f('fk_role_permissions_role_id_roles'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('role_id', 'permission_id', name=op.f('pk_role_permissions'))
    )
    op.create_table('sessions',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('refresh_token_hash', sa.String(length=128), nullable=False),
    sa.Column('device_info', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_sessions_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_sessions')),
    sa.UniqueConstraint('refresh_token_hash', name=op.f('uq_sessions_refresh_token_hash'))
    )
    with op.batch_alter_table('sessions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_sessions_user_id'), ['user_id'], unique=False)

    op.create_table('supplier_products',
    sa.Column('supplier_id', sa.Uuid(), nullable=False),
    sa.Column('product_id', sa.Uuid(), nullable=False),
    sa.Column('lead_time_days', sa.Integer(), nullable=False),
    sa.Column('minimum_order_quantity', sa.Numeric(precision=14, scale=3), nullable=False),
    sa.Column('production_capacity', sa.Numeric(precision=14, scale=3), nullable=True),
    sa.Column('unit_cost', sa.Numeric(precision=14, scale=2), nullable=True),
    sa.Column('is_preferred', sa.Boolean(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.CheckConstraint('lead_time_days >= 0 AND minimum_order_quantity >= 0', name=op.f('ck_supplier_products_lead_time_days_non_negative')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_supplier_products_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], name=op.f('fk_supplier_products_product_id_products'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], name=op.f('fk_supplier_products_supplier_id_suppliers'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_supplier_products')),
    sa.UniqueConstraint('supplier_id', 'product_id', name='uq_supplier_products_pair')
    )
    with op.batch_alter_table('supplier_products', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_supplier_products_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_supplier_products_product_id'), ['product_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_supplier_products_supplier_id'), ['supplier_id'], unique=False)

    op.create_table('user_roles',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('role_id', sa.Uuid(), nullable=False),
    sa.Column('assigned_by', sa.Uuid(), nullable=True),
    sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], name=op.f('fk_user_roles_assigned_by_users'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['role_id'], ['roles.id'], name=op.f('fk_user_roles_role_id_roles'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_roles_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_user_roles'))
    )
    with op.batch_alter_table('user_roles', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_user_roles_role_id'), ['role_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_user_roles_user_id'), ['user_id'], unique=False)
        batch_op.create_index('uq_user_roles_active', ['user_id', 'role_id'], unique=True, postgresql_where=sa.text('revoked_at IS NULL'), sqlite_where=sa.text('revoked_at IS NULL'))

    op.create_table('user_warehouse_assignments',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('warehouse_id', sa.Uuid(), nullable=False),
    sa.Column('valid_from', sa.DateTime(timezone=True), nullable=False),
    sa.Column('valid_to', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_warehouse_assignments_user_id_users'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['warehouse_id'], ['warehouses.id'], name=op.f('fk_user_warehouse_assignments_warehouse_id_warehouses'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_user_warehouse_assignments')),
    sa.UniqueConstraint('user_id', 'warehouse_id', 'valid_from', name='uq_user_warehouse_assignments_period')
    )
    with op.batch_alter_table('user_warehouse_assignments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_user_warehouse_assignments_user_id'), ['user_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_user_warehouse_assignments_warehouse_id'), ['warehouse_id'], unique=False)

    op.create_table('dependency_snapshots',
    sa.Column('disruption_id', sa.Uuid(), nullable=True),
    sa.Column('graph', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('content_hash', sa.String(length=64), nullable=False),
    sa.Column('taken_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['disruption_id'], ['disruptions.id'], name=op.f('fk_dependency_snapshots_disruption_id_disruptions'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_dependency_snapshots_organization_id_organizations'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_dependency_snapshots'))
    )
    with op.batch_alter_table('dependency_snapshots', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_dependency_snapshots_disruption_id'), ['disruption_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_dependency_snapshots_organization_id'), ['organization_id'], unique=False)

    op.create_table('import_errors',
    sa.Column('import_job_id', sa.Uuid(), nullable=False),
    sa.Column('row_number', sa.Integer(), nullable=False),
    sa.Column('field', sa.String(length=120), nullable=True),
    sa.Column('error_code', sa.String(length=40), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('raw_record', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['import_job_id'], ['import_jobs.id'], name=op.f('fk_import_errors_import_job_id_import_jobs'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_import_errors_organization_id_organizations'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_import_errors'))
    )
    with op.batch_alter_table('import_errors', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_import_errors_import_job_id'), ['import_job_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_import_errors_organization_id'), ['organization_id'], unique=False)

    op.create_table('inventory_adjustments',
    sa.Column('inventory_id', sa.Uuid(), nullable=False),
    sa.Column('adjustment_type', sa.String(length=20), nullable=False),
    sa.Column('quantity_delta', sa.Numeric(precision=14, scale=3), nullable=False),
    sa.Column('reason', sa.Text(), nullable=True),
    sa.Column('actor_id', sa.Uuid(), nullable=True),
    sa.Column('reference_type', sa.String(length=40), nullable=True),
    sa.Column('reference_id', sa.String(length=64), nullable=True),
    sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.CheckConstraint("adjustment_type IN ('RECEIVE', 'ADJUST', 'RESERVE', 'RELEASE', 'DAMAGE', 'QUARANTINE', 'TRANSFER_IN', 'TRANSFER_OUT', 'FULFIL')", name=op.f('ck_inventory_adjustments_adjustment_type_valid')),
    sa.ForeignKeyConstraint(['actor_id'], ['users.id'], name=op.f('fk_inventory_adjustments_actor_id_users'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['inventory_id'], ['inventory.id'], name=op.f('fk_inventory_adjustments_inventory_id_inventory'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_inventory_adjustments_organization_id_organizations'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_inventory_adjustments'))
    )
    with op.batch_alter_table('inventory_adjustments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_inventory_adjustments_inventory_id'), ['inventory_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_inventory_adjustments_occurred_at'), ['occurred_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_inventory_adjustments_organization_id'), ['organization_id'], unique=False)

    op.create_table('purchase_order_items',
    sa.Column('purchase_order_id', sa.Uuid(), nullable=False),
    sa.Column('product_id', sa.Uuid(), nullable=False),
    sa.Column('quantity', sa.Numeric(precision=14, scale=3), nullable=False),
    sa.Column('unit_cost', sa.Numeric(precision=14, scale=2), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.CheckConstraint('quantity > 0', name=op.f('ck_purchase_order_items_quantity_positive')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_purchase_order_items_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], name=op.f('fk_purchase_order_items_product_id_products'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['purchase_order_id'], ['purchase_orders.id'], name=op.f('fk_purchase_order_items_purchase_order_id_purchase_orders'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_purchase_order_items')),
    sa.UniqueConstraint('purchase_order_id', 'product_id', name='uq_purchase_order_items_line')
    )
    with op.batch_alter_table('purchase_order_items', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_purchase_order_items_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_purchase_order_items_product_id'), ['product_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_purchase_order_items_purchase_order_id'), ['purchase_order_id'], unique=False)

    op.create_table('risk_assessments',
    sa.Column('order_item_id', sa.Uuid(), nullable=False),
    sa.Column('disruption_id', sa.Uuid(), nullable=True),
    sa.Column('method', sa.String(length=12), nullable=False),
    sa.Column('score', sa.Float(), nullable=False),
    sa.Column('category', sa.String(length=12), nullable=False),
    sa.Column('miss_probability', sa.Float(), nullable=True),
    sa.Column('priority_weight', sa.Float(), nullable=True),
    sa.Column('components', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('factor_effects', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('source_records', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('policy_version', sa.String(length=32), nullable=False),
    sa.Column('model_version', sa.Integer(), nullable=True),
    sa.Column('calculated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.CheckConstraint("category IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')", name=op.f('ck_risk_assessments_category_valid')),
    sa.CheckConstraint("method <> 'ml' OR model_version IS NOT NULL", name=op.f('ck_risk_assessments_ml_needs_model_version')),
    sa.CheckConstraint("method IN ('ml', 'formula')", name=op.f('ck_risk_assessments_method_valid')),
    sa.CheckConstraint('miss_probability IS NULL OR (miss_probability >= 0 AND miss_probability <= 1)', name=op.f('ck_risk_assessments_probability_range')),
    sa.CheckConstraint('score >= 0 AND score <= 100', name=op.f('ck_risk_assessments_score_range')),
    sa.ForeignKeyConstraint(['disruption_id'], ['disruptions.id'], name=op.f('fk_risk_assessments_disruption_id_disruptions'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['order_item_id'], ['order_items.id'], name=op.f('fk_risk_assessments_order_item_id_order_items'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_risk_assessments_organization_id_organizations'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_risk_assessments'))
    )
    with op.batch_alter_table('risk_assessments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_risk_assessments_calculated_at'), ['calculated_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_risk_assessments_category'), ['category'], unique=False)
        batch_op.create_index(batch_op.f('ix_risk_assessments_disruption_id'), ['disruption_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_risk_assessments_order_item_id'), ['order_item_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_risk_assessments_organization_id'), ['organization_id'], unique=False)

    op.create_table('shipments',
    sa.Column('code', sa.String(length=64), nullable=False),
    sa.Column('purchase_order_id', sa.Uuid(), nullable=False),
    sa.Column('supplier_id', sa.Uuid(), nullable=False),
    sa.Column('carrier_id', sa.Uuid(), nullable=False),
    sa.Column('destination_warehouse_id', sa.Uuid(), nullable=False),
    sa.Column('origin', sa.String(length=200), nullable=True),
    sa.Column('status', sa.String(length=24), nullable=False),
    sa.Column('tracking_reference', sa.String(length=120), nullable=True),
    sa.Column('dispatched_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('expected_arrival_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('current_eta', sa.DateTime(timezone=True), nullable=True),
    sa.Column('physical_arrival_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('receiving_completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('quality_completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('usable_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('fulfilment_available_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.CheckConstraint("status IN ('CREATED', 'CONFIRMED', 'READY_FOR_DISPATCH', 'IN_TRANSIT', 'DELAYED', 'AT_DESTINATION', 'RECEIVING', 'RECEIVED', 'PARTIALLY_RECEIVED', 'CANCELLED', 'EXCEPTION')", name=op.f('ck_shipments_status_valid')),
    sa.ForeignKeyConstraint(['carrier_id'], ['carriers.id'], name=op.f('fk_shipments_carrier_id_carriers'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['destination_warehouse_id'], ['warehouses.id'], name=op.f('fk_shipments_destination_warehouse_id_warehouses'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_shipments_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['purchase_order_id'], ['purchase_orders.id'], name=op.f('fk_shipments_purchase_order_id_purchase_orders'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], name=op.f('fk_shipments_supplier_id_suppliers'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_shipments')),
    sa.UniqueConstraint('organization_id', 'code', name='uq_shipments_org_code')
    )
    with op.batch_alter_table('shipments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_shipments_carrier_id'), ['carrier_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_shipments_destination_warehouse_id'), ['destination_warehouse_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_shipments_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_shipments_purchase_order_id'), ['purchase_order_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_shipments_status'), ['status'], unique=False)
        batch_op.create_index(batch_op.f('ix_shipments_supplier_id'), ['supplier_id'], unique=False)

    op.create_table('simulation_snapshots',
    sa.Column('disruption_id', sa.Uuid(), nullable=True),
    sa.Column('created_by', sa.Uuid(), nullable=True),
    sa.Column('optimization_mode', sa.String(length=24), nullable=False),
    sa.Column('inputs', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('entity_versions', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('outputs', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('constraint_violations', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('is_feasible', sa.String(length=12), nullable=False),
    sa.Column('status', sa.String(length=12), nullable=False),
    sa.Column('stale_reason', sa.Text(), nullable=True),
    sa.Column('content_hash', sa.String(length=64), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.CheckConstraint("is_feasible IN ('FEASIBLE', 'INFEASIBLE', 'UNKNOWN')", name=op.f('ck_simulation_snapshots_is_feasible_valid')),
    sa.CheckConstraint("optimization_mode IN ('LOWEST_COST', 'MAX_ON_TIME', 'BALANCED')", name=op.f('ck_simulation_snapshots_optimization_mode_valid')),
    sa.CheckConstraint("status IN ('CURRENT', 'STALE', 'INVALIDATED')", name=op.f('ck_simulation_snapshots_status_valid')),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], name=op.f('fk_simulation_snapshots_created_by_users'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['disruption_id'], ['disruptions.id'], name=op.f('fk_simulation_snapshots_disruption_id_disruptions'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_simulation_snapshots_organization_id_organizations'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_simulation_snapshots'))
    )
    with op.batch_alter_table('simulation_snapshots', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_simulation_snapshots_disruption_id'), ['disruption_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_simulation_snapshots_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_simulation_snapshots_status'), ['status'], unique=False)

    op.create_table('supplier_events',
    sa.Column('supplier_id', sa.Uuid(), nullable=False),
    sa.Column('purchase_order_id', sa.Uuid(), nullable=True),
    sa.Column('source', sa.String(length=120), nullable=False),
    sa.Column('event_id', sa.String(length=128), nullable=False),
    sa.Column('event_type', sa.String(length=40), nullable=False),
    sa.Column('source_sequence', sa.BigInteger(), nullable=True),
    sa.Column('event_timestamp', sa.DateTime(timezone=True), nullable=False),
    sa.Column('received_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('payload', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('processing_status', sa.String(length=16), nullable=False),
    sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('processing_error', sa.Text(), nullable=True),
    sa.Column('retry_count', sa.Integer(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.CheckConstraint("processing_status IN ('RECEIVED', 'PROCESSED', 'DUPLICATE', 'OUT_OF_ORDER', 'CONFLICT', 'FAILED')", name=op.f('ck_supplier_events_processing_status_valid')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_supplier_events_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['purchase_order_id'], ['purchase_orders.id'], name=op.f('fk_supplier_events_purchase_order_id_purchase_orders'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], name=op.f('fk_supplier_events_supplier_id_suppliers'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_supplier_events')),
    sa.UniqueConstraint('organization_id', 'source', 'event_id', name='uq_supplier_events_source_event')
    )
    with op.batch_alter_table('supplier_events', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_supplier_events_event_type'), ['event_type'], unique=False)
        batch_op.create_index(batch_op.f('ix_supplier_events_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_supplier_events_processing_status'), ['processing_status'], unique=False)
        batch_op.create_index(batch_op.f('ix_supplier_events_purchase_order_id'), ['purchase_order_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_supplier_events_supplier_id'), ['supplier_id'], unique=False)

    op.create_table('carrier_events',
    sa.Column('shipment_id', sa.Uuid(), nullable=True),
    sa.Column('source', sa.String(length=120), nullable=False),
    sa.Column('event_id', sa.String(length=128), nullable=False),
    sa.Column('event_type', sa.String(length=40), nullable=False),
    sa.Column('source_sequence', sa.BigInteger(), nullable=True),
    sa.Column('event_timestamp', sa.DateTime(timezone=True), nullable=False),
    sa.Column('received_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('payload', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('processing_status', sa.String(length=16), nullable=False),
    sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('processing_error', sa.Text(), nullable=True),
    sa.Column('retry_count', sa.Integer(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.CheckConstraint("event_type IN ('SHIPMENT_DISPATCHED', 'SHIPMENT_IN_TRANSIT', 'SHIPMENT_DELAYED', 'ETA_UPDATED', 'SHIPMENT_ARRIVED', 'SHIPMENT_EXCEPTION', 'SHIPMENT_CANCELLED')", name=op.f('ck_carrier_events_event_type_valid')),
    sa.CheckConstraint("processing_status IN ('RECEIVED', 'PROCESSED', 'DUPLICATE', 'OUT_OF_ORDER', 'CONFLICT', 'FAILED')", name=op.f('ck_carrier_events_processing_status_valid')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_carrier_events_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['shipment_id'], ['shipments.id'], name=op.f('fk_carrier_events_shipment_id_shipments'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_carrier_events')),
    sa.UniqueConstraint('organization_id', 'source', 'event_id', name='uq_carrier_events_source_event')
    )
    with op.batch_alter_table('carrier_events', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_carrier_events_event_type'), ['event_type'], unique=False)
        batch_op.create_index(batch_op.f('ix_carrier_events_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_carrier_events_processing_status'), ['processing_status'], unique=False)
        batch_op.create_index(batch_op.f('ix_carrier_events_shipment_id'), ['shipment_id'], unique=False)

    op.create_table('impact_assessments',
    sa.Column('disruption_id', sa.Uuid(), nullable=False),
    sa.Column('dependency_snapshot_id', sa.Uuid(), nullable=True),
    sa.Column('assessment_number', sa.Integer(), nullable=False),
    sa.Column('affected_entities', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('total_shortage_quantity', sa.Numeric(precision=14, scale=3), nullable=False),
    sa.Column('expected_delay_hours', sa.Float(), nullable=False),
    sa.Column('contractual_exposure', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('evidence', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('assessed_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.CheckConstraint('total_shortage_quantity >= 0 AND expected_delay_hours >= 0 AND contractual_exposure >= 0', name=op.f('ck_impact_assessments_total_shortage_quantity_non_negative')),
    sa.ForeignKeyConstraint(['dependency_snapshot_id'], ['dependency_snapshots.id'], name=op.f('fk_impact_assessments_dependency_snapshot_id_dependency_snapshots'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['disruption_id'], ['disruptions.id'], name=op.f('fk_impact_assessments_disruption_id_disruptions'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_impact_assessments_organization_id_organizations'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_impact_assessments')),
    sa.UniqueConstraint('disruption_id', 'assessment_number', name='uq_impact_assessments_number')
    )
    with op.batch_alter_table('impact_assessments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_impact_assessments_disruption_id'), ['disruption_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_impact_assessments_organization_id'), ['organization_id'], unique=False)

    op.create_table('inventory_lots',
    sa.Column('inventory_id', sa.Uuid(), nullable=False),
    sa.Column('shipment_id', sa.Uuid(), nullable=True),
    sa.Column('lot_number', sa.String(length=64), nullable=False),
    sa.Column('quantity', sa.Numeric(precision=14, scale=3), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('received_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("status IN ('AVAILABLE', 'QUARANTINED', 'DAMAGED', 'DEPLETED')", name=op.f('ck_inventory_lots_status_valid')),
    sa.CheckConstraint('quantity >= 0', name=op.f('ck_inventory_lots_quantity_non_negative')),
    sa.ForeignKeyConstraint(['inventory_id'], ['inventory.id'], name=op.f('fk_inventory_lots_inventory_id_inventory'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_inventory_lots_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['shipment_id'], ['shipments.id'], name=op.f('fk_inventory_lots_shipment_id_shipments'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_inventory_lots')),
    sa.UniqueConstraint('inventory_id', 'lot_number', name='uq_inventory_lots_number')
    )
    with op.batch_alter_table('inventory_lots', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_inventory_lots_inventory_id'), ['inventory_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_inventory_lots_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_inventory_lots_shipment_id'), ['shipment_id'], unique=False)

    op.create_table('recovery_plans',
    sa.Column('plan_key', sa.String(length=64), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('supersedes_id', sa.Uuid(), nullable=True),
    sa.Column('disruption_id', sa.Uuid(), nullable=False),
    sa.Column('simulation_id', sa.Uuid(), nullable=True),
    sa.Column('creator_id', sa.Uuid(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('estimated_cost', sa.Numeric(precision=14, scale=2), nullable=True),
    sa.Column('feasibility_result', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('expected_outcome', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('approval_requirements', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('plan_hash', sa.String(length=66), nullable=True),
    sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("status IN ('DRAFT', 'SIMULATED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REVISION_REQUIRED', 'MODIFIED', 'RESUBMITTED', 'CANCELLED', 'EXPIRED', 'INVALIDATED', 'EXECUTION_PENDING', 'EXECUTING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'MANUAL_REVIEW')", name=op.f('ck_recovery_plans_status_valid')),
    sa.CheckConstraint('version >= 1', name=op.f('ck_recovery_plans_version_positive')),
    sa.ForeignKeyConstraint(['creator_id'], ['users.id'], name=op.f('fk_recovery_plans_creator_id_users'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['disruption_id'], ['disruptions.id'], name=op.f('fk_recovery_plans_disruption_id_disruptions'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_recovery_plans_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['simulation_id'], ['simulation_snapshots.id'], name=op.f('fk_recovery_plans_simulation_id_simulation_snapshots'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['supersedes_id'], ['recovery_plans.id'], name=op.f('fk_recovery_plans_supersedes_id_recovery_plans'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_recovery_plans')),
    sa.UniqueConstraint('id', 'creator_id', name='uq_recovery_plans_id_creator'),
    sa.UniqueConstraint('organization_id', 'plan_key', 'version', name='uq_recovery_plans_key_version')
    )
    with op.batch_alter_table('recovery_plans', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_recovery_plans_creator_id'), ['creator_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_recovery_plans_disruption_id'), ['disruption_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_recovery_plans_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_recovery_plans_plan_key'), ['plan_key'], unique=False)
        batch_op.create_index(batch_op.f('ix_recovery_plans_simulation_id'), ['simulation_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_recovery_plans_status'), ['status'], unique=False)

    op.create_table('shipment_items',
    sa.Column('shipment_id', sa.Uuid(), nullable=False),
    sa.Column('product_id', sa.Uuid(), nullable=False),
    sa.Column('quantity', sa.Numeric(precision=14, scale=3), nullable=False),
    sa.Column('received_quantity', sa.Numeric(precision=14, scale=3), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.CheckConstraint('quantity > 0', name=op.f('ck_shipment_items_quantity_positive')),
    sa.CheckConstraint('received_quantity >= 0', name=op.f('ck_shipment_items_received_quantity_non_negative')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_shipment_items_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], name=op.f('fk_shipment_items_product_id_products'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['shipment_id'], ['shipments.id'], name=op.f('fk_shipment_items_shipment_id_shipments'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_shipment_items')),
    sa.UniqueConstraint('shipment_id', 'product_id', name='uq_shipment_items_line')
    )
    with op.batch_alter_table('shipment_items', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_shipment_items_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_shipment_items_product_id'), ['product_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_shipment_items_shipment_id'), ['shipment_id'], unique=False)

    op.create_table('approvals',
    sa.Column('plan_id', sa.Uuid(), nullable=False),
    sa.Column('plan_creator_id', sa.Uuid(), nullable=False),
    sa.Column('approver_id', sa.Uuid(), nullable=False),
    sa.Column('stage', sa.Integer(), nullable=False),
    sa.Column('action_category', sa.String(length=64), nullable=False),
    sa.Column('decision', sa.String(length=20), nullable=False),
    sa.Column('comments', sa.Text(), nullable=True),
    sa.Column('wallet_address', sa.String(length=42), nullable=True),
    sa.Column('chain_status', sa.String(length=20), nullable=False),
    sa.Column('tx_hash', sa.String(length=66), nullable=True),
    sa.Column('idempotency_key', sa.String(length=128), nullable=False),
    sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("chain_status IN ('NOT_REQUIRED', 'CHAIN_PENDING', 'CHAIN_CONFIRMED', 'CHAIN_FAILED', 'CHAIN_REORG_REVIEW')", name=op.f('ck_approvals_chain_status_valid')),
    sa.CheckConstraint("decision IN ('PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUIRED', 'EXPIRED')", name=op.f('ck_approvals_decision_valid')),
    sa.CheckConstraint('approver_id <> plan_creator_id', name=op.f('ck_approvals_creator_cannot_approve')),
    sa.ForeignKeyConstraint(['approver_id'], ['users.id'], name=op.f('fk_approvals_approver_id_users'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_approvals_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['plan_id', 'plan_creator_id'], ['recovery_plans.id', 'recovery_plans.creator_id'], name='fk_approvals_plan_and_creator', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_approvals')),
    sa.UniqueConstraint('organization_id', 'idempotency_key', name='uq_approvals_idempotency'),
    sa.UniqueConstraint('plan_id', 'stage', 'approver_id', name='uq_approvals_one_decision')
    )
    with op.batch_alter_table('approvals', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_approvals_approver_id'), ['approver_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_approvals_chain_status'), ['chain_status'], unique=False)
        batch_op.create_index(batch_op.f('ix_approvals_decision'), ['decision'], unique=False)
        batch_op.create_index(batch_op.f('ix_approvals_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_approvals_plan_id'), ['plan_id'], unique=False)

    op.create_table('execution_runs',
    sa.Column('plan_id', sa.Uuid(), nullable=False),
    sa.Column('simulation_id', sa.Uuid(), nullable=True),
    sa.Column('execution_request_id', sa.String(length=128), nullable=False),
    sa.Column('confirmed_by', sa.Uuid(), nullable=False),
    sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("status IN ('EXECUTION_PENDING', 'EXECUTING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'MANUAL_REVIEW')", name=op.f('ck_execution_runs_status_valid')),
    sa.ForeignKeyConstraint(['confirmed_by'], ['users.id'], name=op.f('fk_execution_runs_confirmed_by_users'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_execution_runs_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['plan_id'], ['recovery_plans.id'], name=op.f('fk_execution_runs_plan_id_recovery_plans'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['simulation_id'], ['simulation_snapshots.id'], name=op.f('fk_execution_runs_simulation_id_simulation_snapshots'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_execution_runs')),
    sa.UniqueConstraint('organization_id', 'execution_request_id', name='uq_execution_runs_request')
    )
    with op.batch_alter_table('execution_runs', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_execution_runs_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_execution_runs_plan_id'), ['plan_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_execution_runs_status'), ['status'], unique=False)

    op.create_table('fulfilment_allocations',
    sa.Column('order_item_id', sa.Uuid(), nullable=False),
    sa.Column('inventory_id', sa.Uuid(), nullable=True),
    sa.Column('shipment_item_id', sa.Uuid(), nullable=True),
    sa.Column('quantity', sa.Numeric(precision=14, scale=3), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("status IN ('ACTIVE', 'FULFILLED', 'CANCELLED')", name=op.f('ck_fulfilment_allocations_status_valid')),
    sa.CheckConstraint('(inventory_id IS NOT NULL AND shipment_item_id IS NULL) OR (inventory_id IS NULL AND shipment_item_id IS NOT NULL)', name=op.f('ck_fulfilment_allocations_exactly_one_source')),
    sa.CheckConstraint('quantity > 0', name=op.f('ck_fulfilment_allocations_quantity_positive')),
    sa.ForeignKeyConstraint(['inventory_id'], ['inventory.id'], name=op.f('fk_fulfilment_allocations_inventory_id_inventory'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['order_item_id'], ['order_items.id'], name=op.f('fk_fulfilment_allocations_order_item_id_order_items'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_fulfilment_allocations_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['shipment_item_id'], ['shipment_items.id'], name=op.f('fk_fulfilment_allocations_shipment_item_id_shipment_items'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_fulfilment_allocations'))
    )
    with op.batch_alter_table('fulfilment_allocations', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_fulfilment_allocations_inventory_id'), ['inventory_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_fulfilment_allocations_order_item_id'), ['order_item_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_fulfilment_allocations_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_fulfilment_allocations_shipment_item_id'), ['shipment_item_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_fulfilment_allocations_status'), ['status'], unique=False)

    op.create_table('impact_assessment_lines',
    sa.Column('assessment_id', sa.Uuid(), nullable=False),
    sa.Column('order_item_id', sa.Uuid(), nullable=False),
    sa.Column('shortage_quantity', sa.Numeric(precision=14, scale=3), nullable=False),
    sa.Column('expected_delay_hours', sa.Float(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.CheckConstraint('shortage_quantity >= 0 AND expected_delay_hours >= 0', name=op.f('ck_impact_assessment_lines_shortage_quantity_non_negative')),
    sa.ForeignKeyConstraint(['assessment_id'], ['impact_assessments.id'], name=op.f('fk_impact_assessment_lines_assessment_id_impact_assessments'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['order_item_id'], ['order_items.id'], name=op.f('fk_impact_assessment_lines_order_item_id_order_items'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_impact_assessment_lines_organization_id_organizations'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_impact_assessment_lines')),
    sa.UniqueConstraint('assessment_id', 'order_item_id', name='uq_impact_assessment_lines_line')
    )
    with op.batch_alter_table('impact_assessment_lines', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_impact_assessment_lines_assessment_id'), ['assessment_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_impact_assessment_lines_order_item_id'), ['order_item_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_impact_assessment_lines_organization_id'), ['organization_id'], unique=False)

    op.create_table('recovery_plan_actions',
    sa.Column('plan_id', sa.Uuid(), nullable=False),
    sa.Column('sequence', sa.Integer(), nullable=False),
    sa.Column('action_type', sa.String(length=28), nullable=False),
    sa.Column('parameters', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('estimated_cost', sa.Numeric(precision=14, scale=2), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.CheckConstraint("action_type IN ('INVENTORY_REALLOCATION', 'STOCK_TRANSFER', 'SHIPMENT_EXPEDITE', 'ALTERNATIVE_SUPPLIER', 'SPLIT_FULFILMENT', 'PARTIAL_FULFILMENT', 'PROCUREMENT_ADJUSTMENT')", name=op.f('ck_recovery_plan_actions_action_type_valid')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_recovery_plan_actions_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['plan_id'], ['recovery_plans.id'], name=op.f('fk_recovery_plan_actions_plan_id_recovery_plans'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_recovery_plan_actions')),
    sa.UniqueConstraint('plan_id', 'sequence', name='uq_recovery_plan_actions_sequence')
    )
    with op.batch_alter_table('recovery_plan_actions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_recovery_plan_actions_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_recovery_plan_actions_plan_id'), ['plan_id'], unique=False)

    op.create_table('reservations',
    sa.Column('inventory_id', sa.Uuid(), nullable=False),
    sa.Column('order_item_id', sa.Uuid(), nullable=True),
    sa.Column('recovery_plan_id', sa.Uuid(), nullable=True),
    sa.Column('quantity', sa.Numeric(precision=14, scale=3), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("status IN ('ACTIVE', 'RELEASED', 'CONSUMED', 'EXPIRED')", name=op.f('ck_reservations_status_valid')),
    sa.CheckConstraint('quantity > 0', name=op.f('ck_reservations_quantity_positive')),
    sa.ForeignKeyConstraint(['inventory_id'], ['inventory.id'], name=op.f('fk_reservations_inventory_id_inventory'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['order_item_id'], ['order_items.id'], name=op.f('fk_reservations_order_item_id_order_items'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_reservations_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['recovery_plan_id'], ['recovery_plans.id'], name=op.f('fk_reservations_recovery_plan_id_recovery_plans'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_reservations'))
    )
    with op.batch_alter_table('reservations', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_reservations_inventory_id'), ['inventory_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_reservations_order_item_id'), ['order_item_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_reservations_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_reservations_recovery_plan_id'), ['recovery_plan_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_reservations_status'), ['status'], unique=False)

    op.create_table('execution_actions',
    sa.Column('run_id', sa.Uuid(), nullable=False),
    sa.Column('plan_action_id', sa.Uuid(), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('idempotency_key', sa.String(length=128), nullable=False),
    sa.Column('attempts', sa.Integer(), nullable=False),
    sa.Column('result', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('error', sa.Text(), nullable=True),
    sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.CheckConstraint("status IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'COMPENSATING', 'COMPENSATED', 'MANUAL_REVIEW')", name=op.f('ck_execution_actions_status_valid')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_execution_actions_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['plan_action_id'], ['recovery_plan_actions.id'], name=op.f('fk_execution_actions_plan_action_id_recovery_plan_actions'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['run_id'], ['execution_runs.id'], name=op.f('fk_execution_actions_run_id_execution_runs'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_execution_actions')),
    sa.UniqueConstraint('idempotency_key', name=op.f('uq_execution_actions_idempotency_key')),
    sa.UniqueConstraint('run_id', 'plan_action_id', name='uq_execution_actions_once')
    )
    with op.batch_alter_table('execution_actions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_execution_actions_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_execution_actions_run_id'), ['run_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_execution_actions_status'), ['status'], unique=False)

    op.create_table('stock_transfers',
    sa.Column('product_id', sa.Uuid(), nullable=False),
    sa.Column('from_warehouse_id', sa.Uuid(), nullable=False),
    sa.Column('to_warehouse_id', sa.Uuid(), nullable=False),
    sa.Column('recovery_action_id', sa.Uuid(), nullable=True),
    sa.Column('quantity', sa.Numeric(precision=14, scale=3), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('requested_by', sa.Uuid(), nullable=True),
    sa.Column('confirmed_by', sa.Uuid(), nullable=True),
    sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.CheckConstraint("status IN ('REQUESTED', 'AUTHORIZED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED')", name=op.f('ck_stock_transfers_status_valid')),
    sa.CheckConstraint('from_warehouse_id <> to_warehouse_id', name=op.f('ck_stock_transfers_different_warehouses')),
    sa.CheckConstraint('quantity > 0', name=op.f('ck_stock_transfers_quantity_positive')),
    sa.ForeignKeyConstraint(['confirmed_by'], ['users.id'], name=op.f('fk_stock_transfers_confirmed_by_users'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['from_warehouse_id'], ['warehouses.id'], name=op.f('fk_stock_transfers_from_warehouse_id_warehouses'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_stock_transfers_organization_id_organizations'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], name=op.f('fk_stock_transfers_product_id_products'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['recovery_action_id'], ['recovery_plan_actions.id'], name=op.f('fk_stock_transfers_recovery_action_id_recovery_plan_actions'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['requested_by'], ['users.id'], name=op.f('fk_stock_transfers_requested_by_users'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['to_warehouse_id'], ['warehouses.id'], name=op.f('fk_stock_transfers_to_warehouse_id_warehouses'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_stock_transfers'))
    )
    with op.batch_alter_table('stock_transfers', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_stock_transfers_from_warehouse_id'), ['from_warehouse_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_stock_transfers_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_stock_transfers_product_id'), ['product_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_stock_transfers_recovery_action_id'), ['recovery_action_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_stock_transfers_status'), ['status'], unique=False)
        batch_op.create_index(batch_op.f('ix_stock_transfers_to_warehouse_id'), ['to_warehouse_id'], unique=False)

    for statement in audit_trigger_ddl(op.get_context().dialect.name):
        op.execute(statement)


def downgrade() -> None:
    for statement in drop_audit_trigger_ddl(op.get_context().dialect.name):
        op.execute(statement)
    with op.batch_alter_table('stock_transfers', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_stock_transfers_to_warehouse_id'))
        batch_op.drop_index(batch_op.f('ix_stock_transfers_status'))
        batch_op.drop_index(batch_op.f('ix_stock_transfers_recovery_action_id'))
        batch_op.drop_index(batch_op.f('ix_stock_transfers_product_id'))
        batch_op.drop_index(batch_op.f('ix_stock_transfers_organization_id'))
        batch_op.drop_index(batch_op.f('ix_stock_transfers_from_warehouse_id'))

    op.drop_table('stock_transfers')
    with op.batch_alter_table('execution_actions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_execution_actions_status'))
        batch_op.drop_index(batch_op.f('ix_execution_actions_run_id'))
        batch_op.drop_index(batch_op.f('ix_execution_actions_organization_id'))

    op.drop_table('execution_actions')
    with op.batch_alter_table('reservations', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_reservations_status'))
        batch_op.drop_index(batch_op.f('ix_reservations_recovery_plan_id'))
        batch_op.drop_index(batch_op.f('ix_reservations_organization_id'))
        batch_op.drop_index(batch_op.f('ix_reservations_order_item_id'))
        batch_op.drop_index(batch_op.f('ix_reservations_inventory_id'))

    op.drop_table('reservations')
    with op.batch_alter_table('recovery_plan_actions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_recovery_plan_actions_plan_id'))
        batch_op.drop_index(batch_op.f('ix_recovery_plan_actions_organization_id'))

    op.drop_table('recovery_plan_actions')
    with op.batch_alter_table('impact_assessment_lines', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_impact_assessment_lines_organization_id'))
        batch_op.drop_index(batch_op.f('ix_impact_assessment_lines_order_item_id'))
        batch_op.drop_index(batch_op.f('ix_impact_assessment_lines_assessment_id'))

    op.drop_table('impact_assessment_lines')
    with op.batch_alter_table('fulfilment_allocations', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_fulfilment_allocations_status'))
        batch_op.drop_index(batch_op.f('ix_fulfilment_allocations_shipment_item_id'))
        batch_op.drop_index(batch_op.f('ix_fulfilment_allocations_organization_id'))
        batch_op.drop_index(batch_op.f('ix_fulfilment_allocations_order_item_id'))
        batch_op.drop_index(batch_op.f('ix_fulfilment_allocations_inventory_id'))

    op.drop_table('fulfilment_allocations')
    with op.batch_alter_table('execution_runs', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_execution_runs_status'))
        batch_op.drop_index(batch_op.f('ix_execution_runs_plan_id'))
        batch_op.drop_index(batch_op.f('ix_execution_runs_organization_id'))

    op.drop_table('execution_runs')
    with op.batch_alter_table('approvals', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_approvals_plan_id'))
        batch_op.drop_index(batch_op.f('ix_approvals_organization_id'))
        batch_op.drop_index(batch_op.f('ix_approvals_decision'))
        batch_op.drop_index(batch_op.f('ix_approvals_chain_status'))
        batch_op.drop_index(batch_op.f('ix_approvals_approver_id'))

    op.drop_table('approvals')
    with op.batch_alter_table('shipment_items', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_shipment_items_shipment_id'))
        batch_op.drop_index(batch_op.f('ix_shipment_items_product_id'))
        batch_op.drop_index(batch_op.f('ix_shipment_items_organization_id'))

    op.drop_table('shipment_items')
    with op.batch_alter_table('recovery_plans', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_recovery_plans_status'))
        batch_op.drop_index(batch_op.f('ix_recovery_plans_simulation_id'))
        batch_op.drop_index(batch_op.f('ix_recovery_plans_plan_key'))
        batch_op.drop_index(batch_op.f('ix_recovery_plans_organization_id'))
        batch_op.drop_index(batch_op.f('ix_recovery_plans_disruption_id'))
        batch_op.drop_index(batch_op.f('ix_recovery_plans_creator_id'))

    op.drop_table('recovery_plans')
    with op.batch_alter_table('inventory_lots', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_inventory_lots_shipment_id'))
        batch_op.drop_index(batch_op.f('ix_inventory_lots_organization_id'))
        batch_op.drop_index(batch_op.f('ix_inventory_lots_inventory_id'))

    op.drop_table('inventory_lots')
    with op.batch_alter_table('impact_assessments', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_impact_assessments_organization_id'))
        batch_op.drop_index(batch_op.f('ix_impact_assessments_disruption_id'))

    op.drop_table('impact_assessments')
    with op.batch_alter_table('carrier_events', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_carrier_events_shipment_id'))
        batch_op.drop_index(batch_op.f('ix_carrier_events_processing_status'))
        batch_op.drop_index(batch_op.f('ix_carrier_events_organization_id'))
        batch_op.drop_index(batch_op.f('ix_carrier_events_event_type'))

    op.drop_table('carrier_events')
    with op.batch_alter_table('supplier_events', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_supplier_events_supplier_id'))
        batch_op.drop_index(batch_op.f('ix_supplier_events_purchase_order_id'))
        batch_op.drop_index(batch_op.f('ix_supplier_events_processing_status'))
        batch_op.drop_index(batch_op.f('ix_supplier_events_organization_id'))
        batch_op.drop_index(batch_op.f('ix_supplier_events_event_type'))

    op.drop_table('supplier_events')
    with op.batch_alter_table('simulation_snapshots', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_simulation_snapshots_status'))
        batch_op.drop_index(batch_op.f('ix_simulation_snapshots_organization_id'))
        batch_op.drop_index(batch_op.f('ix_simulation_snapshots_disruption_id'))

    op.drop_table('simulation_snapshots')
    with op.batch_alter_table('shipments', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_shipments_supplier_id'))
        batch_op.drop_index(batch_op.f('ix_shipments_status'))
        batch_op.drop_index(batch_op.f('ix_shipments_purchase_order_id'))
        batch_op.drop_index(batch_op.f('ix_shipments_organization_id'))
        batch_op.drop_index(batch_op.f('ix_shipments_destination_warehouse_id'))
        batch_op.drop_index(batch_op.f('ix_shipments_carrier_id'))

    op.drop_table('shipments')
    with op.batch_alter_table('risk_assessments', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_risk_assessments_organization_id'))
        batch_op.drop_index(batch_op.f('ix_risk_assessments_order_item_id'))
        batch_op.drop_index(batch_op.f('ix_risk_assessments_disruption_id'))
        batch_op.drop_index(batch_op.f('ix_risk_assessments_category'))
        batch_op.drop_index(batch_op.f('ix_risk_assessments_calculated_at'))

    op.drop_table('risk_assessments')
    with op.batch_alter_table('purchase_order_items', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_purchase_order_items_purchase_order_id'))
        batch_op.drop_index(batch_op.f('ix_purchase_order_items_product_id'))
        batch_op.drop_index(batch_op.f('ix_purchase_order_items_organization_id'))

    op.drop_table('purchase_order_items')
    with op.batch_alter_table('inventory_adjustments', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_inventory_adjustments_organization_id'))
        batch_op.drop_index(batch_op.f('ix_inventory_adjustments_occurred_at'))
        batch_op.drop_index(batch_op.f('ix_inventory_adjustments_inventory_id'))

    op.drop_table('inventory_adjustments')
    with op.batch_alter_table('import_errors', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_import_errors_organization_id'))
        batch_op.drop_index(batch_op.f('ix_import_errors_import_job_id'))

    op.drop_table('import_errors')
    with op.batch_alter_table('dependency_snapshots', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_dependency_snapshots_organization_id'))
        batch_op.drop_index(batch_op.f('ix_dependency_snapshots_disruption_id'))

    op.drop_table('dependency_snapshots')
    with op.batch_alter_table('user_warehouse_assignments', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_user_warehouse_assignments_warehouse_id'))
        batch_op.drop_index(batch_op.f('ix_user_warehouse_assignments_user_id'))

    op.drop_table('user_warehouse_assignments')
    with op.batch_alter_table('user_roles', schema=None) as batch_op:
        batch_op.drop_index('uq_user_roles_active', postgresql_where=sa.text('revoked_at IS NULL'), sqlite_where=sa.text('revoked_at IS NULL'))
        batch_op.drop_index(batch_op.f('ix_user_roles_user_id'))
        batch_op.drop_index(batch_op.f('ix_user_roles_role_id'))

    op.drop_table('user_roles')
    with op.batch_alter_table('supplier_products', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_supplier_products_supplier_id'))
        batch_op.drop_index(batch_op.f('ix_supplier_products_product_id'))
        batch_op.drop_index(batch_op.f('ix_supplier_products_organization_id'))

    op.drop_table('supplier_products')
    with op.batch_alter_table('sessions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_sessions_user_id'))

    op.drop_table('sessions')
    op.drop_table('role_permissions')
    with op.batch_alter_table('purchase_orders', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_purchase_orders_supplier_id'))
        batch_op.drop_index(batch_op.f('ix_purchase_orders_organization_id'))

    op.drop_table('purchase_orders')
    with op.batch_alter_table('order_items', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_order_items_product_id'))
        batch_op.drop_index(batch_op.f('ix_order_items_organization_id'))
        batch_op.drop_index(batch_op.f('ix_order_items_order_id'))

    op.drop_table('order_items')
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_notifications_user_id'))
        batch_op.drop_index(batch_op.f('ix_notifications_organization_id'))
        batch_op.drop_index(batch_op.f('ix_notifications_notification_type'))
        batch_op.drop_index(batch_op.f('ix_notifications_created_at'))

    op.drop_table('notifications')
    with op.batch_alter_table('inventory', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_inventory_warehouse_id'))
        batch_op.drop_index(batch_op.f('ix_inventory_product_id'))
        batch_op.drop_index(batch_op.f('ix_inventory_organization_id'))

    op.drop_table('inventory')
    with op.batch_alter_table('integration_event_logs', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_integration_event_logs_organization_id'))
        batch_op.drop_index(batch_op.f('ix_integration_event_logs_integration_id'))
        batch_op.drop_index(batch_op.f('ix_integration_event_logs_created_at'))

    op.drop_table('integration_event_logs')
    with op.batch_alter_table('import_jobs', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_import_jobs_status'))
        batch_op.drop_index(batch_op.f('ix_import_jobs_organization_id'))

    op.drop_table('import_jobs')
    with op.batch_alter_table('disruptions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_disruptions_status'))
        batch_op.drop_index(batch_op.f('ix_disruptions_severity'))
        batch_op.drop_index(batch_op.f('ix_disruptions_organization_id'))
        batch_op.drop_index(batch_op.f('ix_disruptions_disruption_type'))
        batch_op.drop_index(batch_op.f('ix_disruptions_detected_at'))
        batch_op.drop_index(batch_op.f('ix_disruptions_consolidation_key'))
        batch_op.drop_index(batch_op.f('ix_disruptions_affected_entity_id'))

    op.drop_table('disruptions')
    with op.batch_alter_table('audit_events', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_audit_events_organization_id'))
        batch_op.drop_index(batch_op.f('ix_audit_events_occurred_at'))
        batch_op.drop_index('ix_audit_events_entity')
        batch_op.drop_index(batch_op.f('ix_audit_events_correlation_id'))
        batch_op.drop_index(batch_op.f('ix_audit_events_action_type'))

    op.drop_table('audit_events')
    with op.batch_alter_table('approval_authorities', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_approval_authorities_organization_id'))

    op.drop_table('approval_authorities')
    with op.batch_alter_table('warehouses', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_warehouses_organization_id'))

    op.drop_table('warehouses')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_organization_id'))

    op.drop_table('users')
    with op.batch_alter_table('suppliers', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_suppliers_organization_id'))

    op.drop_table('suppliers')
    with op.batch_alter_table('roles', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_roles_organization_id'))

    op.drop_table('roles')
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_products_organization_id'))

    op.drop_table('products')
    with op.batch_alter_table('integration_configs', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_integration_configs_organization_id'))

    op.drop_table('integration_configs')
    with op.batch_alter_table('customer_orders', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_customer_orders_status'))
        batch_op.drop_index(batch_op.f('ix_customer_orders_required_delivery_date'))
        batch_op.drop_index(batch_op.f('ix_customer_orders_organization_id'))

    op.drop_table('customer_orders')
    with op.batch_alter_table('carriers', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_carriers_organization_id'))

    op.drop_table('carriers')
    with op.batch_alter_table('wallet_nonces', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_wallet_nonces_nonce'))

    op.drop_table('wallet_nonces')
    with op.batch_alter_table('user_wallets', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_user_wallets_wallet_address'))
        batch_op.drop_index(batch_op.f('ix_user_wallets_user_id'))
        batch_op.drop_index(batch_op.f('ix_user_wallets_organization_id'))

    op.drop_table('user_wallets')
    with op.batch_alter_table('risk_model_versions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_risk_model_versions_status'))
        batch_op.drop_index(batch_op.f('ix_risk_model_versions_organization_id'))

    op.drop_table('risk_model_versions')
    with op.batch_alter_table('risk_exposures', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_risk_exposures_supplier_id'))
        batch_op.drop_index(batch_op.f('ix_risk_exposures_snapshot_at'))
        batch_op.drop_index(batch_op.f('ix_risk_exposures_organization_id'))
        batch_op.drop_index(batch_op.f('ix_risk_exposures_carrier_id'))
        batch_op.drop_index('ix_risk_exposure_org_outcome')

    op.drop_table('risk_exposures')
    op.drop_table('permissions')
    op.drop_table('organizations')
    with op.batch_alter_table('operational_plans', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_operational_plans_plan_id'))
        batch_op.drop_index(batch_op.f('ix_operational_plans_organization_id'))

    op.drop_table('operational_plans')
    with op.batch_alter_table('blockchain_transactions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_blockchain_transactions_tx_hash'))
        batch_op.drop_index(batch_op.f('ix_blockchain_transactions_submitter_wallet'))
        batch_op.drop_index(batch_op.f('ix_blockchain_transactions_status'))
        batch_op.drop_index(batch_op.f('ix_blockchain_transactions_plan_id'))

    op.drop_table('blockchain_transactions')
    with op.batch_alter_table('blockchain_events', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_blockchain_events_wallet_address'))
        batch_op.drop_index(batch_op.f('ix_blockchain_events_tx_hash'))
        batch_op.drop_index(batch_op.f('ix_blockchain_events_plan_id'))
        batch_op.drop_index(batch_op.f('ix_blockchain_events_event_name'))

    op.drop_table('blockchain_events')
