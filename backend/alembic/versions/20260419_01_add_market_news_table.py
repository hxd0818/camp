"""add market_news table

Revision ID: 20260419_01
Revises:
Create Date: 2026-04-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260419_01'
down_revision: Union[str, None] = '9fcf0bf255f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create market_news table
    op.create_table(
        'market_news',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.String(length=64), nullable=True),
        sa.Column('mall_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(length=300), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('source', sa.String(length=200), nullable=True),
        sa.Column('category', sa.String(length=20), nullable=True),
        sa.Column('cover_image_url', sa.String(length=500), nullable=True),
        sa.Column('is_published', sa.Boolean(), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['mall_id'], ['malls.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_market_news_category'), 'market_news', ['category'], unique=False)
    op.create_index(op.f('ix_market_news_is_published'), 'market_news', ['is_published'], unique=False)
    op.create_index(op.f('ix_market_news_mall_id'), 'market_news', ['mall_id'], unique=False)
    op.create_index(op.f('ix_market_news_tenant_id'), 'market_news', ['tenant_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_market_news_tenant_id'), table_name='market_news')
    op.drop_index(op.f('ix_market_news_mall_id'), table_name='market_news')
    op.drop_index(op.f('ix_market_news_is_published'), table_name='market_news')
    op.drop_index(op.f('ix_market_news_category'), table_name='market_news')
    op.drop_table('market_news')
