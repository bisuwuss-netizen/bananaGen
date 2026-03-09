"""create preset_styles table

Revision ID: 014_create_preset_styles
Revises: 013_add_user_template_user_id
Create Date: 2026-03-09 11:55:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "014_create_preset_styles"
down_revision = "013_add_user_template_user_id"
branch_labels = None
depends_on = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    """Create preset_styles table for image-mode text style presets."""
    if _table_exists("preset_styles"):
        return

    op.create_table(
        "preset_styles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=200), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("previewImage", sa.String(length=500), nullable=True),
        sa.Column("status", sa.Integer(), nullable=True, server_default="1"),
    )


def downgrade() -> None:
    if _table_exists("preset_styles"):
        op.drop_table("preset_styles")
