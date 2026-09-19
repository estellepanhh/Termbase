"""add knowledge core tables

Revision ID: 3d256e5c3d75
Revises:
Create Date: 2026-09-18
"""

from alembic import op
import sqlalchemy as sa


revision = "3d256e5c3d75"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "kb_contexts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name_zh", sa.String(length=100), nullable=False),
        sa.Column("audience", sa.String(length=100), nullable=False),
        sa.Column("style", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "kb_languages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("name_zh", sa.String(length=100), nullable=False),
        sa.Column("name_en", sa.String(length=100), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "kb_sources",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("organization", sa.String(length=255), nullable=True),
        sa.Column("published_at", sa.Date(), nullable=True),
        sa.Column("language_code", sa.String(length=20), nullable=True),
        sa.Column("source_type", sa.String(length=50), nullable=False),
        sa.Column("url", sa.String(length=500), nullable=True),
        sa.Column("citation", sa.Text(), nullable=True),
        sa.Column("authority_level", sa.String(length=30), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("legacy_value", sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "kb_terms",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("preferred_name_zh", sa.String(length=255), nullable=False),
        sa.Column("definition_zh", sa.Text(), nullable=False),
        sa.Column("cultural_connotation", sa.Text(), nullable=False),
        sa.Column("term_level", sa.String(length=50), nullable=False),
        sa.Column("culture_category", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("data_quality", sa.String(length=30), nullable=False),
        sa.Column("legacy_payload", sa.JSON(), nullable=False),
        sa.Column("legacy_table", sa.String(length=50), nullable=True),
        sa.Column("legacy_id", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("legacy_table", "legacy_id", name="uq_kb_term_legacy"),
    )
    op.create_index("ix_kb_terms_preferred_name_zh", "kb_terms", ["preferred_name_zh"])
    op.create_index("ix_kb_terms_status", "kb_terms", ["status"])
    op.create_table(
        "kb_topics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_table(
        "kb_cultural_notes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("term_id", sa.Integer(), nullable=False),
        sa.Column("target_culture", sa.String(length=100), nullable=False),
        sa.Column("difference_summary", sa.Text(), nullable=False),
        sa.Column("literal_risk", sa.Text(), nullable=False),
        sa.Column("misconception", sa.Text(), nullable=False),
        sa.Column("recommendation", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["term_id"], ["kb_terms.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_kb_cultural_notes_term_id", "kb_cultural_notes", ["term_id"])
    op.create_table(
        "kb_term_contexts",
        sa.Column("term_id", sa.Integer(), nullable=False),
        sa.Column("context_id", sa.Integer(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("example", sa.Text(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["context_id"], ["kb_contexts.id"]),
        sa.ForeignKeyConstraint(["term_id"], ["kb_terms.id"]),
        sa.PrimaryKeyConstraint("term_id", "context_id"),
    )
    op.create_index("ix_kb_term_contexts_context_id", "kb_term_contexts", ["context_id"])
    op.create_index("ix_kb_term_contexts_term_id", "kb_term_contexts", ["term_id"])
    op.create_table(
        "kb_term_names",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("term_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("name_type", sa.String(length=30), nullable=False),
        sa.ForeignKeyConstraint(["term_id"], ["kb_terms.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_kb_term_names_term_id", "kb_term_names", ["term_id"])
    op.create_table(
        "kb_term_relations",
        sa.Column("source_term_id", sa.Integer(), nullable=False),
        sa.Column("target_term_id", sa.Integer(), nullable=False),
        sa.Column("relation_type", sa.String(length=30), nullable=False),
        sa.ForeignKeyConstraint(["source_term_id"], ["kb_terms.id"]),
        sa.ForeignKeyConstraint(["target_term_id"], ["kb_terms.id"]),
        sa.PrimaryKeyConstraint("source_term_id", "target_term_id", "relation_type"),
    )
    op.create_index("ix_kb_term_relations_source_term_id", "kb_term_relations", ["source_term_id"])
    op.create_index("ix_kb_term_relations_target_term_id", "kb_term_relations", ["target_term_id"])
    op.create_table(
        "kb_term_sources",
        sa.Column("term_id", sa.Integer(), nullable=False),
        sa.Column("source_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["source_id"], ["kb_sources.id"]),
        sa.ForeignKeyConstraint(["term_id"], ["kb_terms.id"]),
        sa.PrimaryKeyConstraint("term_id", "source_id"),
    )
    op.create_index("ix_kb_term_sources_term_id", "kb_term_sources", ["term_id"])
    op.create_index("ix_kb_term_sources_source_id", "kb_term_sources", ["source_id"])
    op.create_table(
        "kb_topic_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("topic_id", sa.Integer(), nullable=False),
        sa.Column("term_id", sa.Integer(), nullable=True),
        sa.Column("entry_type", sa.String(length=30), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("legacy_table", sa.String(length=50), nullable=True),
        sa.Column("legacy_id", sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(["term_id"], ["kb_terms.id"]),
        sa.ForeignKeyConstraint(["topic_id"], ["kb_topics.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_kb_topic_items_term_id", "kb_topic_items", ["term_id"])
    op.create_index("ix_kb_topic_items_topic_id", "kb_topic_items", ["topic_id"])
    op.create_table(
        "kb_translations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("term_id", sa.Integer(), nullable=False),
        sa.Column("language_id", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("translation_type", sa.String(length=30), nullable=False),
        sa.Column("authority_level", sa.String(length=30), nullable=False),
        sa.Column("region", sa.String(length=100), nullable=True),
        sa.Column("review_status", sa.String(length=30), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["language_id"], ["kb_languages.id"]),
        sa.ForeignKeyConstraint(["term_id"], ["kb_terms.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_kb_translations_language_id", "kb_translations", ["language_id"])
    op.create_index("ix_kb_translations_term_id", "kb_translations", ["term_id"])
    op.create_table(
        "kb_term_evidence",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("term_id", sa.Integer(), nullable=False),
        sa.Column("translation_id", sa.Integer(), nullable=True),
        sa.Column("source_id", sa.Integer(), nullable=False),
        sa.Column("original_excerpt", sa.Text(), nullable=False),
        sa.Column("translated_excerpt", sa.Text(), nullable=False),
        sa.Column("locator", sa.String(length=255), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["source_id"], ["kb_sources.id"]),
        sa.ForeignKeyConstraint(["term_id"], ["kb_terms.id"]),
        sa.ForeignKeyConstraint(["translation_id"], ["kb_translations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_kb_term_evidence_source_id", "kb_term_evidence", ["source_id"])
    op.create_index("ix_kb_term_evidence_term_id", "kb_term_evidence", ["term_id"])
    op.create_index("ix_kb_term_evidence_translation_id", "kb_term_evidence", ["translation_id"])
    op.create_table(
        "kb_translation_contexts",
        sa.Column("translation_id", sa.Integer(), nullable=False),
        sa.Column("context_id", sa.Integer(), nullable=False),
        sa.Column("recommendation_level", sa.String(length=30), nullable=False),
        sa.Column("example", sa.Text(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["context_id"], ["kb_contexts.id"]),
        sa.ForeignKeyConstraint(["translation_id"], ["kb_translations.id"]),
        sa.PrimaryKeyConstraint("translation_id", "context_id"),
    )
    op.create_index(
        "ix_kb_translation_contexts_context_id", "kb_translation_contexts", ["context_id"]
    )
    op.create_index(
        "ix_kb_translation_contexts_translation_id",
        "kb_translation_contexts",
        ["translation_id"],
    )


def downgrade():
    for table_name in (
        "kb_translation_contexts",
        "kb_term_evidence",
        "kb_translations",
        "kb_topic_items",
        "kb_term_sources",
        "kb_term_relations",
        "kb_term_names",
        "kb_term_contexts",
        "kb_cultural_notes",
        "kb_topics",
        "kb_terms",
        "kb_sources",
        "kb_languages",
        "kb_contexts",
    ):
        op.drop_table(table_name)
