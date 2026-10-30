"""allow SHIPMENT_REROUTE as a recovery action

Revision ID: 0002
Revises: 0001
"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

BASE = "'INVENTORY_REALLOCATION', 'STOCK_TRANSFER', 'SHIPMENT_EXPEDITE', {extra}'ALTERNATIVE_SUPPLIER', 'SPLIT_FULFILMENT', 'PARTIAL_FULFILMENT', 'PROCUREMENT_ADJUSTMENT'"
NAME = "ck_recovery_plan_actions_action_type_valid"


def _swap(extra: str) -> None:
    with op.batch_alter_table("recovery_plan_actions") as batch:
        batch.drop_constraint(NAME, type_="check")
        batch.create_check_constraint(NAME, f"action_type IN ({BASE.format(extra=extra)})")


def upgrade() -> None:
    _swap("'SHIPMENT_REROUTE', ")


def downgrade() -> None:
    _swap("")
