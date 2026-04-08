"""add notes search vector

Revision ID: 0003_add_notes_search_vector
Revises: 0002_add_topics_and_tags
Create Date: 2026-04-08

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0003_add_notes_search_vector"
down_revision = "0002_add_topics_and_tags"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Generated column: keep in sync without app-side triggers
    op.add_column(
        "notes",
        sa.Column(
            "search_vector",
            postgresql.TSVECTOR(),
            sa.Computed(
                "to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(search_text,''))",
                persisted=True,
            ),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_notes_search_vector",
        "notes",
        ["search_vector"],
        unique=False,
        postgresql_using="gin",
    )


def downgrade() -> None:
    op.drop_index("ix_notes_search_vector", table_name="notes")
    op.drop_column("notes", "search_vector")

