"""fix text column types - varchar(255) to TEXT/MEDIUMTEXT

Revision ID: 009_fix_text_columns
Revises: 008_add_scheme_id
Create Date: 2026-02-06 16:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text


# revision identifiers, used by Alembic.
revision = '009_fix_text_columns'
down_revision = '008_add_scheme_id'
branch_labels = None
depends_on = None


def _get_column_type(table_name: str, column_name: str) -> str:
    """Get the actual MySQL column type as a string"""
    bind = op.get_bind()
    result = bind.execute(
        text(f"SHOW COLUMNS FROM `{table_name}` WHERE Field = :col"),
        {"col": column_name}
    )
    row = result.fetchone()
    if row:
        return str(row[1]).lower()  # Type is the second column
    return ""


def upgrade() -> None:
    """
    Fix columns that should be TEXT but were created as varchar(255)
    by an older db.create_all() call.

    - pages.outline_content: varchar(255) -> MEDIUMTEXT
    - pages.description_content: varchar(255) -> MEDIUMTEXT
    - pages.html_model: check and fix if needed -> MEDIUMTEXT

    Also fix similar columns in other tables if needed:
    - projects.idea_prompt
    - projects.outline_text
    - projects.description_text
    - projects.extra_requirements
    """
    # --- pages table ---
    pages_text_columns = ['outline_content', 'description_content', 'html_model']
    for col in pages_text_columns:
        col_type = _get_column_type('pages', col)
        if col_type and 'text' not in col_type:
            # Column exists but is not a TEXT type (e.g. varchar), alter it
            op.alter_column('pages', col,
                            existing_type=sa.String(255),
                            type_=sa.Text(),
                            existing_nullable=True)

    # --- projects table ---
    projects_text_columns = ['idea_prompt', 'outline_text', 'description_text', 'extra_requirements']
    for col in projects_text_columns:
        col_type = _get_column_type('projects', col)
        if col_type and 'text' not in col_type:
            op.alter_column('projects', col,
                            existing_type=sa.String(255),
                            type_=sa.Text(),
                            existing_nullable=True)

    # --- reference_files table ---
    ref_text_columns = ['markdown_content', 'error_message']
    bind = op.get_bind()
    inspector = inspect(bind)
    if 'reference_files' in inspector.get_table_names():
        for col in ref_text_columns:
            col_type = _get_column_type('reference_files', col)
            if col_type and 'text' not in col_type:
                op.alter_column('reference_files', col,
                                existing_type=sa.String(255),
                                type_=sa.Text(),
                                existing_nullable=True)


def downgrade() -> None:
    """
    Downgrade is intentionally a no-op.
    Reverting TEXT back to varchar(255) would cause data loss.
    """
    pass
