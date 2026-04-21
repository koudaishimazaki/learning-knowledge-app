"""add notes automation fields

Revision ID: 0004_add_notes_automation_fields
Revises: 0003_add_notes_search_vector
Create Date: 2026-04-22

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0004_add_notes_automation_fields"
down_revision = "0003_add_notes_search_vector"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("notes", sa.Column("external_id", sa.String(length=200), nullable=True))
    op.add_column("notes", sa.Column("source", sa.String(length=50), nullable=True))
    op.create_index("ix_notes_external_id", "notes", ["external_id"], unique=False)
    op.create_index(
        "uq_notes_user_id_external_id",
        "notes",
        ["user_id", "external_id"],
        unique=True,
        postgresql_where=sa.text("external_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_notes_user_id_external_id", table_name="notes")
    op.drop_index("ix_notes_external_id", table_name="notes")
    op.drop_column("notes", "source")
    op.drop_column("notes", "external_id")

