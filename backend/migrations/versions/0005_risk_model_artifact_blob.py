"""store fitted risk models in the database

Revision ID: 0005
Revises: 0004
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '0005'
down_revision: Union[str, None] = '0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('risk_model_versions', sa.Column('artifact_blob', sa.LargeBinary(), nullable=True))


def downgrade() -> None:
    op.drop_column('risk_model_versions', 'artifact_blob')
