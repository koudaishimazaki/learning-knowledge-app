"""add topics and tags

Revision ID: 0002_add_topics_and_tags
Revises: 0001_create_users_and_notes
Create Date: 2026-04-08

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0002_add_topics_and_tags"
down_revision = "0001_create_users_and_notes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "topics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("color", sa.String(length=32), nullable=False),
        sa.Column("icon_type", sa.String(length=16), nullable=False),
        sa.Column("icon_emoji", sa.String(length=16), nullable=True),
        sa.Column("icon_image_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_topics_user_id", "topics", ["user_id"], unique=False)
    op.create_index("uq_topics_user_id_name", "topics", ["user_id", "name"], unique=True)

    op.create_table(
        "tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_tags_user_id", "tags", ["user_id"], unique=False)
    op.create_index("uq_tags_user_id_name", "tags", ["user_id", "name"], unique=True)

    op.create_table(
        "note_tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "note_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("notes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "tag_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tags.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_note_tags_note_id", "note_tags", ["note_id"], unique=False)
    op.create_index("ix_note_tags_tag_id", "note_tags", ["tag_id"], unique=False)
    op.create_index("uq_note_tags_note_id_tag_id", "note_tags", ["note_id", "tag_id"], unique=True)

    op.add_column("notes", sa.Column("topic_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index("ix_notes_topic_id", "notes", ["topic_id"], unique=False)
    op.create_foreign_key(
        "fk_notes_topic_id_topics",
        "notes",
        "topics",
        ["topic_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_notes_topic_id_topics", "notes", type_="foreignkey")
    op.drop_index("ix_notes_topic_id", table_name="notes")
    op.drop_column("notes", "topic_id")

    op.drop_index("uq_note_tags_note_id_tag_id", table_name="note_tags")
    op.drop_index("ix_note_tags_tag_id", table_name="note_tags")
    op.drop_index("ix_note_tags_note_id", table_name="note_tags")
    op.drop_table("note_tags")

    op.drop_index("uq_tags_user_id_name", table_name="tags")
    op.drop_index("ix_tags_user_id", table_name="tags")
    op.drop_table("tags")

    op.drop_index("uq_topics_user_id_name", table_name="topics")
    op.drop_index("ix_topics_user_id", table_name="topics")
    op.drop_table("topics")

