"""add leasing_plans table

Revision ID: 20260419_02
Revises: 20260419_01
Create Date: 2026-04-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260419_02'
down_revision: Union[str, None] = '20260419_01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create leasing_plans table
    op.create_table(
        'leasing_plans',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.String(length=64), nullable=True),
        sa.Column('mall_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('plan_type', sa.String(length=20), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('target_area', sa.Float(), nullable=True),
        sa.Column('target_units', sa.Integer(), nullable=True),
        sa.Column('completed_area', sa.Float(), nullable=True),
        sa.Column('completed_units', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('owner', sa.String(length=100), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['mall_id'], ['malls.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_leasing_plans_mall_id'), 'leasing_plans', ['mall_id'], unique=False)
    op.create_index(op.f('ix_leasing_plans_tenant_id'), 'leasing_plans', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_leasing_plans_status'), 'leasing_plans', ['status'], unique=False)
    op.create_index(op.f('ix_leasing_plans_due_date'), 'leasing_plans', ['due_date'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_leasing_plans_due_date'), table_name='leasing_plans')
    op.drop_index(op.f('ix_leasing_plans_status'), table_name='leasing_plans')
    op.drop_index(op.f('ix_leasing_plans_tenant_id'), table_name='leasing_plans')
    op.drop_index(op.f('ix_leasing_plans_mall_id'), table_name='leasing_plans')
    op.drop_table('leasing_plans')
