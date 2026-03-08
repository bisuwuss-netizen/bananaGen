"""add user_id to materials table

Revision ID: 012_add_material_user_id
Revises: 011_add_user_id
Create Date: 2026-03-07 15:45:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "012_add_material_user_id"
down_revision = "011_add_user_id"
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
    """Add materials.user_id for per-user material isolation."""
    if not _column_exists("materials", "user_id"):
        op.add_column("materials", sa.Column("user_id", sa.String(length=100), nullable=True))

    if _column_exists("materials", "user_id") and not _index_exists("materials", "ix_materials_user_id"):
        op.create_index("ix_materials_user_id", "materials", ["user_id"], unique=False)


def downgrade() -> None:
    if _index_exists("materials", "ix_materials_user_id"):
        op.drop_index("ix_materials_user_id", table_name="materials")

    if _column_exists("materials", "user_id"):
        op.drop_column("materials", "user_id")
