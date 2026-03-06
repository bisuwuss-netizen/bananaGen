"""add html rendering mode fields

Revision ID: 007_html_rendering
Revises: 38292967f3ca
Create Date: 2026-02-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '007_html_rendering'
down_revision = '38292967f3ca'
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
    Add HTML rendering mode fields.

    Projects table:
    - render_mode: 'image' (traditional) or 'html' (HTML rendering mode)

    Pages table:
    - layout_id: Layout type for HTML mode (cover, toc, title_content, etc.)
    - html_model: JSON string containing structured data for HTML rendering

    Idempotent: checks if columns exist before adding.
    """
    # Add render_mode to projects table
    if not _column_exists('projects', 'render_mode'):
        op.add_column('projects', sa.Column('render_mode', sa.String(20), nullable=False, server_default='image'))

    # Add layout_id to pages table
    if not _column_exists('pages', 'layout_id'):
        op.add_column('pages', sa.Column('layout_id', sa.String(50), nullable=True))

    # Add html_model to pages table (JSON string for structured data)
    if not _column_exists('pages', 'html_model'):
        op.add_column('pages', sa.Column('html_model', sa.Text, nullable=True))


def downgrade() -> None:
    """
    Remove HTML rendering mode fields.
    """
    op.drop_column('pages', 'html_model')
    op.drop_column('pages', 'layout_id')
    op.drop_column('projects', 'render_mode')
