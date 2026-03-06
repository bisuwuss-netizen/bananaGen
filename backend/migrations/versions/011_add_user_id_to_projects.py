"""add user_id to projects table

Revision ID: 011_add_user_id
Revises: 010_fix_order_index
Create Date: 2026-03-06 18:10:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "011_add_user_id"
down_revision = "010_fix_order_index"
branch_labels = None
depends_on = None


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    return column_name in columns


def _index_exists(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    indexes = inspector.get_indexes(table_name)
    return any(idx.get("name") == index_name for idx in indexes)


def upgrade() -> None:
    """Add projects.user_id for multi-user isolation compatibility."""
    if not _column_exists("projects", "user_id"):
        op.add_column("projects", sa.Column("user_id", sa.String(length=100), nullable=True))

    if _column_exists("projects", "user_id") and not _index_exists("projects", "ix_projects_user_id"):
        op.create_index("ix_projects_user_id", "projects", ["user_id"], unique=False)


def downgrade() -> None:
    if _index_exists("projects", "ix_projects_user_id"):
        op.drop_index("ix_projects_user_id", table_name="projects")

    if _column_exists("projects", "user_id"):
        op.drop_column("projects", "user_id")

