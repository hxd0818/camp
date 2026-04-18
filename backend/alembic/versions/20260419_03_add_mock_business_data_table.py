"""add mock_business_data table

Revision ID: 20260419_03
Revises: 20260419_02
Create Date: 2026-04-19
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260419_03'
down_revision: Union[str, None] = '20260419_02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'mock_business_data',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('mall_id', sa.Integer(), nullable=False),
        sa.Column('unit_id', sa.Integer(), nullable=True),
        sa.Column('tenant_id_ref', sa.Integer(), nullable=True),
        sa.Column('data_date', sa.Date(), nullable=False),
        sa.Column('daily_traffic', sa.Integer(), nullable=True),
        sa.Column('daily_sales', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('monthly_sales', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('sales_per_sqm', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('rent_to_sales_ratio', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['mall_id'], ['malls.id']),
        sa.ForeignKeyConstraint(['tenant_id_ref'], ['tenants.id']),
        sa.ForeignKeyConstraint(['unit_id'], ['units.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_mock_business_data_data_date'), 'mock_business_data', ['data_date'], unique=False)
    op.create_index(op.f('ix_mock_business_data_mall_id'), 'mock_business_data', ['mall_id'], unique=False)
    op.create_index(op.f('ix_mock_business_data_tenant_id_ref'), 'mock_business_data', ['tenant_id_ref'], unique=False)
    op.create_index(op.f('ix_mock_business_data_unit_id'), 'mock_business_data', ['unit_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_mock_business_data_unit_id'), table_name='mock_business_data')
    op.drop_index(op.f('ix_mock_business_data_tenant_id_ref'), table_name='mock_business_data')
    op.drop_index(op.f('ix_mock_business_data_mall_id'), table_name='mock_business_data')
    op.drop_index(op.f('ix_mock_business_data_data_date'), table_name='mock_business_data')
    op.drop_table('mock_business_data')
