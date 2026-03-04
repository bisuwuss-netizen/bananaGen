"""merge_heads

Revision ID: 4e9d8cb399cb
Revises: 006_add_export_settings, 007_html_rendering
Create Date: 2026-02-03 10:58:24.538762

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4e9d8cb399cb'
down_revision = ('006_add_export_settings', '007_html_rendering')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass



