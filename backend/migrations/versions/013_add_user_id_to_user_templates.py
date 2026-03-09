"""add user_id to user_templates table

Revision ID: 013_add_user_template_user_id
Revises: 012_add_material_user_id
Create Date: 2026-03-09 11:45:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "013_add_user_template_user_id"
down_revision = "012_add_material_user_id"
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
    """Add user_templates.user_id for multi-user template isolation."""
    if not _column_exists("user_templates", "user_id"):
        op.add_column("user_templates", sa.Column("user_id", sa.String(length=100), nullable=True))

    if _column_exists("user_templates", "user_id") and not _index_exists("user_templates", "ix_user_templates_user_id"):
        op.create_index("ix_user_templates_user_id", "user_templates", ["user_id"], unique=False)


def downgrade() -> None:
    if _index_exists("user_templates", "ix_user_templates_user_id"):
        op.drop_index("ix_user_templates_user_id", table_name="user_templates")

    if _column_exists("user_templates", "user_id"):
        op.drop_column("user_templates", "user_id")
