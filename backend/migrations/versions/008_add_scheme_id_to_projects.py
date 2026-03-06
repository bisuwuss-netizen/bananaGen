"""add scheme_id to projects

Revision ID: 008_add_scheme_id
Revises: 4e9d8cb399cb
Create Date: 2026-02-04 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '008_add_scheme_id'
down_revision = '4e9d8cb399cb'
branch_labels = None
depends_on = None


def _column_exists(table_name: str, column_name: str) -> bool:
    """Check if column exists"""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    """
    Add scheme_id to projects table.
    """
    if not _column_exists('projects', 'scheme_id'):
        op.add_column('projects', sa.Column('scheme_id', sa.String(20), nullable=False, server_default='tech_blue'))


def downgrade() -> None:
    """
    Remove scheme_id from projects table.
    """
    op.drop_column('projects', 'scheme_id')
