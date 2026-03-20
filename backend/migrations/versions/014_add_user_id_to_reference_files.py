"""add user_id to reference_files table

Revision ID: 014_add_reference_file_user_id
Revises: 013_create_smart_ppt_logs
Create Date: 2026-03-20 10:36:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "014_add_reference_file_user_id"
down_revision = "013_create_smart_ppt_logs"
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
    if not _column_exists("reference_files", "user_id"):
        op.add_column("reference_files", sa.Column("user_id", sa.String(length=100), nullable=True))

    if _column_exists("reference_files", "user_id") and not _index_exists(
        "reference_files",
        "ix_reference_files_user_id",
    ):
        op.create_index("ix_reference_files_user_id", "reference_files", ["user_id"], unique=False)


def downgrade() -> None:
    if _index_exists("reference_files", "ix_reference_files_user_id"):
        op.drop_index("ix_reference_files_user_id", table_name="reference_files")

    if _column_exists("reference_files", "user_id"):
        op.drop_column("reference_files", "user_id")
