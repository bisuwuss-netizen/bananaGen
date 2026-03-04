"""fix order_index column type - ensure INTEGER not VARCHAR

Revision ID: 010_fix_order_index
Revises: 009_fix_text_columns
Create Date: 2026-02-06 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text


# revision identifiers, used by Alembic.
revision = '010_fix_order_index'
down_revision = '009_fix_text_columns'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Fix pages.order_index column type.
    
    In some installations, db.create_all() may have created this column
    as VARCHAR instead of INTEGER, causing ORDER BY to use lexicographic
    sorting ("0","1","10","11",...,"2","3",...) instead of numeric sorting.
    """
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == 'mysql':
        # Check actual column type
        result = bind.execute(
            text("SHOW COLUMNS FROM `pages` WHERE Field = 'order_index'")
        )
        row = result.fetchone()
        if row:
            col_type = str(row[1]).lower()
            if 'int' not in col_type:
                # Column is not INTEGER – convert it
                # MySQL CAST will convert string "0","1",... to integers
                op.alter_column('pages', 'order_index',
                                existing_type=sa.String(255),
                                type_=sa.Integer(),
                                existing_nullable=False)
    elif dialect == 'sqlite':
        # SQLite is typeless / type-affinity based; INTEGER affinity
        # already handles numeric sorting correctly in most cases.
        # No action needed.
        pass
    else:
        # For other dialects, try a safe alter
        try:
            op.alter_column('pages', 'order_index',
                            existing_type=sa.String(255),
                            type_=sa.Integer(),
                            existing_nullable=False)
        except Exception:
            pass  # Best effort


def downgrade() -> None:
    """No-op: reverting INTEGER back to VARCHAR would break sorting."""
    pass
