"""Tries to break each database rule. Set TRUSTCHAIN_TEST_DATABASE_URL to run these on PostgreSQL too."""
import datetime
import os
import uuid
from decimal import Decimal
from pathlib import Path
import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm.exc import StaleDataError
from backend.app.models import Base
from backend.app.supply_chain.models import Base as SupplyChainBase
from backend.app.models.governance import AuditEvent, Notification
from backend.app.models.identity import Organization, Role, User, UserRole
from backend.app.models.intelligence import Disruption, RiskAssessment
from backend.app.models.inventory import CustomerOrder, FulfilmentAllocation, Inventory, OrderItem, StockTransfer
from backend.app.models.recovery import Approval, ExecutionAction, ExecutionRun, RecoveryPlan, RecoveryPlanAction
from backend.app.models.supply_chain import CarrierEvent, Product, Warehouse

TEST_URL = os.getenv("TRUSTCHAIN_TEST_DATABASE_URL")
NOW = datetime.datetime(2026, 10, 30, tzinfo=datetime.timezone.utc)
# Tables that hang off a parent which already carries the organization.
NOT_DIRECTLY_SCOPED = {
    "organizations", "permissions", "role_permissions", "user_roles", "sessions", "user_warehouse_assignments",
    # Existing tables that predate this schema and still use string organization ids or none.
    "user_wallets", "wallet_nonces", "wallet_sessions", "blockchain_transactions", "blockchain_events", "operational_plans",
    "risk_exposures", "risk_model_versions",
}


def make_engine(tmp_path):
    if TEST_URL:
        engine = create_engine(TEST_URL)
        with engine.begin() as connection:
            connection.execute(text("DROP SCHEMA public CASCADE"))
            connection.execute(text("CREATE SCHEMA public"))
        return engine
    engine = create_engine(f"sqlite:///{tmp_path / 'schema.db'}")
    event.listen(engine, "connect", lambda conn, _: conn.execute("PRAGMA foreign_keys=ON"))
    return engine


@pytest.fixture
def engine(tmp_path):
    engine = make_engine(tmp_path)
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def db(engine):
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


def org(db, slug="acme"):
    item = Organization(name=slug, slug=slug)
    db.add(item)
    db.flush()
    return item


def user(db, organization, email="a@x.com"):
    item = User(organization_id=organization.id, email=email, full_name="Test", password_hash="argon2id$x")
    db.add(item)
    db.flush()
    return item


def stock(db, organization, on_hand=100, reserved=0, safety=0, damaged=0, quarantined=0):
    warehouse = Warehouse(organization_id=organization.id, code=uuid.uuid4().hex[:8], name="W")
    product = Product(organization_id=organization.id, sku=uuid.uuid4().hex[:8], name="P")
    db.add_all([warehouse, product])
    db.flush()
    item = Inventory(
        organization_id=organization.id, warehouse_id=warehouse.id, product_id=product.id, on_hand_quantity=on_hand,
        reserved_quantity=reserved, safety_stock_quantity=safety, damaged_quantity=damaged, quarantined_quantity=quarantined,
    )
    db.add(item)
    db.flush()
    return item


def plan(db, organization, creator, version=1, key="RP-1"):
    disruption = Disruption(
        organization_id=organization.id, code=uuid.uuid4().hex[:8], disruption_type="LATE_SHIPMENT",
        severity="HIGH", affected_entity_type="shipment", affected_entity_id=uuid.uuid4(),
    )
    db.add(disruption)
    db.flush()
    item = RecoveryPlan(
        organization_id=organization.id, plan_key=key, version=version, disruption_id=disruption.id,
        creator_id=creator.id, title="Plan",
    )
    db.add(item)
    db.flush()
    return item


def approval(organization, plan_item, approver, creator_id=None, stage=1, key=None):
    return Approval(
        organization_id=organization.id, plan_id=plan_item.id, plan_creator_id=creator_id or plan_item.creator_id,
        approver_id=approver.id, stage=stage, action_category="STOCK_TRANSFER", idempotency_key=key or uuid.uuid4().hex,
    )


def audit(organization, sequence=1):
    return AuditEvent(
        organization_id=organization.id, sequence=sequence, action_type="PLAN_APPROVED", entity_type="plan",
        entity_id="RP-1", current_hash=f"{sequence:064d}",
    )


def expect_rejected(db, *items):
    db.add_all(items)
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


# --- Schema shape ---

def test_every_prd_table_exists(engine):
    required = {
        "organizations", "users", "roles", "permissions", "user_roles", "role_permissions", "user_wallets", "sessions",
        "suppliers", "products", "warehouses", "carriers", "purchase_orders", "purchase_order_items", "shipments",
        "shipment_items", "carrier_events", "supplier_events", "inventory", "inventory_adjustments", "inventory_lots",
        "reservations", "stock_transfers", "customer_orders", "order_items", "fulfilment_allocations", "disruptions",
        "impact_assessments", "risk_assessments", "dependency_snapshots", "simulation_snapshots", "recovery_plans",
        "recovery_plan_actions", "approvals", "execution_runs", "execution_actions", "audit_events",
        "blockchain_transactions", "blockchain_events", "notifications", "integration_configs",
        "integration_event_logs", "import_jobs", "import_errors",
        "approval_authorities", "user_warehouse_assignments",
    }
    assert required <= set(inspect(engine).get_table_names())


def test_every_operational_table_is_scoped_to_an_organization():
    for name, table in Base.metadata.tables.items():
        if name not in NOT_DIRECTLY_SCOPED:
            assert "organization_id" in table.c, name
            assert any(fk.column.table.name == "organizations" for fk in table.c.organization_id.foreign_keys), name


def test_same_codes_can_exist_in_two_organizations_but_not_twice_in_one(db):
    first, second = org(db, "a"), org(db, "b")
    db.add_all([User(organization_id=o.id, email="same@x.com", full_name="T", password_hash="h") for o in (first, second)])
    db.flush()
    expect_rejected(db, User(organization_id=first.id, email="same@x.com", full_name="T", password_hash="h"))


# --- Inventory ---

def test_available_stock_is_calculated_by_the_database(db):
    item = stock(db, org(db), on_hand=100, reserved=20, safety=10, damaged=5, quarantined=5)
    db.commit()
    db.refresh(item)
    assert item.available_quantity == Decimal("60")


def test_stock_below_safety_level_shows_a_negative_available_quantity(db):
    item = stock(db, org(db), on_hand=10, safety=30)
    db.commit()
    db.refresh(item)
    assert item.available_quantity == Decimal("-20")


@pytest.mark.parametrize("kwargs", [{"on_hand": -1}, {"on_hand": 10, "reserved": 11}, {"on_hand": 10, "reserved": 5, "damaged": 3, "quarantined": 3}])
def test_inventory_rejects_impossible_quantities(db, kwargs):
    with pytest.raises(IntegrityError):
        stock(db, org(db), **kwargs)
    db.rollback()


def test_concurrent_stale_inventory_write_is_rejected(engine, db):
    item = stock(db, org(db))
    db.commit()
    other = sessionmaker(bind=engine)()
    stale = other.get(Inventory, item.id)
    item.reserved_quantity = 10
    db.commit()
    stale.reserved_quantity = 90
    with pytest.raises(StaleDataError):
        other.commit()
    other.close()


def test_allocation_must_have_exactly_one_source(db):
    organization = org(db)
    position = stock(db, organization)
    order = CustomerOrder(
        organization_id=organization.id, code="O1", customer_reference="C", order_date=NOW.date(), required_delivery_date=NOW,
    )
    db.add(order)
    db.flush()
    line = OrderItem(organization_id=organization.id, order_id=order.id, product_id=position.product_id, required_quantity=5)
    db.add(line)
    db.flush()
    expect_rejected(db, FulfilmentAllocation(organization_id=organization.id, order_item_id=line.id, quantity=1))


def test_order_line_cannot_be_over_fulfilled(db):
    organization = org(db)
    position = stock(db, organization)
    order = CustomerOrder(
        organization_id=organization.id, code="O1", customer_reference="C", order_date=NOW.date(), required_delivery_date=NOW,
    )
    db.add(order)
    db.flush()
    expect_rejected(db, OrderItem(
        organization_id=organization.id, order_id=order.id, product_id=position.product_id, required_quantity=5, fulfilled_quantity=6,
    ))


def test_transfer_needs_two_different_warehouses(db):
    organization = org(db)
    position = stock(db, organization)
    expect_rejected(db, StockTransfer(
        organization_id=organization.id, product_id=position.product_id, from_warehouse_id=position.warehouse_id,
        to_warehouse_id=position.warehouse_id, quantity=1,
    ))


# --- Events ---

def carrier_event(organization, event_id="EVT-1", event_type="SHIPMENT_DELAYED"):
    return CarrierEvent(
        organization_id=organization.id, source="FastTrack", event_id=event_id, event_type=event_type,
        event_timestamp=NOW, payload={"delay": 48},
    )


def test_duplicate_carrier_event_is_rejected_within_an_organization(db):
    first, second = org(db, "a"), org(db, "b")
    db.add_all([carrier_event(first), carrier_event(second)])
    db.flush()
    expect_rejected(db, carrier_event(first))


def test_unknown_carrier_event_type_is_rejected(db):
    expect_rejected(db, carrier_event(org(db), event_type="SOMETHING_ELSE"))


# --- Approvals ---

def test_plan_creator_cannot_approve_their_own_plan(db):
    organization = org(db)
    creator = user(db, organization)
    expect_rejected(db, approval(organization, plan(db, organization, creator), creator))


def test_lying_about_who_created_the_plan_is_also_rejected(db):
    organization = org(db)
    creator, approver = user(db, organization, "c@x.com"), user(db, organization, "d@x.com")
    # The approver names someone else as creator, then self-approves.
    expect_rejected(db, approval(organization, plan(db, organization, creator), creator, creator_id=approver.id))


def test_different_user_can_approve_but_only_once_per_stage(db):
    organization = org(db)
    creator, approver = user(db, organization, "c@x.com"), user(db, organization, "d@x.com")
    item = plan(db, organization, creator)
    db.add(approval(organization, item, approver))
    db.flush()
    expect_rejected(db, approval(organization, item, approver))


def test_a_new_plan_version_starts_with_no_approvals(db):
    organization = org(db)
    creator, approver = user(db, organization, "c@x.com"), user(db, organization, "d@x.com")
    first = plan(db, organization, creator, version=1)
    db.add(approval(organization, first, approver))
    db.flush()
    second = plan(db, organization, creator, version=2)
    assert db.query(Approval).filter_by(plan_id=second.id).count() == 0
    assert db.query(Approval).filter_by(plan_id=first.id).count() == 1


def test_same_plan_version_cannot_exist_twice(db):
    organization = org(db)
    creator = user(db, organization)
    plan(db, organization, creator, version=1)
    with pytest.raises(IntegrityError):
        plan(db, organization, creator, version=1)
    db.rollback()


# --- Execution ---

def test_execution_request_and_each_action_can_only_run_once(db):
    organization = org(db)
    creator, confirmer = user(db, organization, "c@x.com"), user(db, organization, "d@x.com")
    item = plan(db, organization, creator)
    step = RecoveryPlanAction(organization_id=organization.id, plan_id=item.id, sequence=1, action_type="STOCK_TRANSFER")
    db.add(step)
    db.flush()
    run = ExecutionRun(organization_id=organization.id, plan_id=item.id, execution_request_id="REQ-1", confirmed_by=confirmer.id)
    db.add(run)
    db.flush()
    db.add(ExecutionAction(organization_id=organization.id, run_id=run.id, plan_action_id=step.id, idempotency_key="A1"))
    db.flush()
    db.commit()
    expect_rejected(db, ExecutionAction(organization_id=organization.id, run_id=run.id, plan_action_id=step.id, idempotency_key="A2"))
    expect_rejected(db, ExecutionRun(organization_id=organization.id, plan_id=item.id, execution_request_id="REQ-1", confirmed_by=confirmer.id))


# --- Risk ---

def test_ml_score_must_name_its_model_version(db):
    organization = org(db)
    position = stock(db, organization)
    order = CustomerOrder(
        organization_id=organization.id, code="O1", customer_reference="C", order_date=NOW.date(), required_delivery_date=NOW,
    )
    db.add(order)
    db.flush()
    line = OrderItem(organization_id=organization.id, order_id=order.id, product_id=position.product_id, required_quantity=5)
    db.add(line)
    db.flush()
    expect_rejected(db, RiskAssessment(
        organization_id=organization.id, order_item_id=line.id, method="ml", score=50, category="HIGH", policy_version="formula-v1",
    ))


# --- Audit ---

def test_audit_records_cannot_be_changed_through_the_app(db):
    item = audit(org(db))
    db.add(item)
    db.commit()
    item.action_type = "TAMPERED"
    with pytest.raises(ValueError):
        db.commit()
    db.rollback()
    db.delete(item)
    with pytest.raises(ValueError):
        db.commit()
    db.rollback()


@pytest.mark.parametrize("statement", ["UPDATE audit_events SET action_type = 'TAMPERED'", "DELETE FROM audit_events"])
def test_audit_records_cannot_be_changed_with_direct_sql(db, statement):
    db.add(audit(org(db)))
    db.commit()
    with pytest.raises(DBAPIError):
        db.execute(text(statement))
    db.rollback()
    assert db.query(AuditEvent).one().action_type == "PLAN_APPROVED"


def test_audit_sequence_cannot_fork(db):
    organization = org(db)
    db.add(audit(organization, 1))
    db.flush()
    duplicate = audit(organization, 1)
    duplicate.current_hash = "f" * 64
    expect_rejected(db, duplicate)


# --- Access ---

def test_a_user_holds_one_active_copy_of_a_role_but_keeps_history(db):
    organization = org(db)
    person = user(db, organization)
    role = Role(organization_id=organization.id, code="OPERATIONS_ANALYST", name="Analyst")
    db.add(role)
    db.flush()
    db.add(UserRole(user_id=person.id, role_id=role.id, revoked_at=NOW))
    db.add(UserRole(user_id=person.id, role_id=role.id))
    db.flush()
    expect_rejected(db, UserRole(user_id=person.id, role_id=role.id))


def test_same_notification_is_not_delivered_twice(db):
    organization = org(db)
    person = user(db, organization)
    make = lambda: Notification(organization_id=organization.id, user_id=person.id, notification_type="APPROVAL", title="T", dedupe_key="plan-1")
    db.add(make())
    db.flush()
    expect_rejected(db, make())


# --- Migrations ---

def test_migration_matches_models_and_can_be_fully_undone(tmp_path):
    root = Path(__file__).resolve().parents[1]
    url = TEST_URL or f"sqlite:///{tmp_path / 'migrate.db'}"
    if TEST_URL:
        make_engine(tmp_path).dispose()
    config = Config(str(root / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", url.replace("%", "%%"))
    command.upgrade(config, "head")
    engine = create_engine(url)
    with engine.connect() as connection:
        assert set(Base.metadata.tables) | set(SupplyChainBase.metadata.tables) <= set(inspect(connection).get_table_names())
        differences = compare_metadata(MigrationContext.configure(connection, opts={"compare_type": True}), [Base.metadata, SupplyChainBase.metadata])
        assert differences == []
    if engine.dialect.name == "postgresql":
        with engine.connect() as connection:
            triggers = connection.execute(text("SELECT tgname FROM pg_trigger WHERE tgname LIKE 'audit_events%'")).scalars().all()
        assert len(triggers) == 2
    command.downgrade(config, "base")
    with engine.connect() as connection:
        assert set(inspect(connection).get_table_names()) <= {"alembic_version"}
    engine.dispose()
