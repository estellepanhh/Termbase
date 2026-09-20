"""add review workspace

Revision ID: 9f4c2a7b1d30
Revises: 7b8f4e2a1c6d
"""

from alembic import op
import sqlalchemy as sa


revision = "9f4c2a7b1d30"
down_revision = "7b8f4e2a1c6d"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "review_cases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(32), nullable=False),
        sa.Column("source_request_id", sa.String(100), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("source_text", sa.Text(), nullable=False),
        sa.Column("target_language", sa.String(20), nullable=False),
        sa.Column("audience", sa.String(50), nullable=False),
        sa.Column("scenario", sa.String(50), nullable=False),
        sa.Column("style", sa.String(50), nullable=False),
        sa.Column("locale", sa.String(50), nullable=False),
        sa.Column("ai_snapshot", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
        sa.Column("current_revision_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("public_id", name="uq_review_cases_public_id"),
        sa.UniqueConstraint("source_request_id", name="uq_review_cases_source_request_id"),
    )
    op.create_index("ix_review_cases_public_id", "review_cases", ["public_id"])
    op.create_index("ix_review_cases_source_request_id", "review_cases", ["source_request_id"])
    op.create_index("ix_review_cases_status", "review_cases", ["status"])
    op.create_table(
        "review_case_terms",
        sa.Column("case_id", sa.Integer(), nullable=False),
        sa.Column("term_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["review_cases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["term_id"], ["kb_terms.id"]),
        sa.PrimaryKeyConstraint("case_id", "term_id"),
    )
    op.create_index("ix_review_case_terms_case_id", "review_case_terms", ["case_id"])
    op.create_index("ix_review_case_terms_term_id", "review_case_terms", ["term_id"])
    op.create_table(
        "review_revisions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("case_id", sa.Integer(), nullable=False),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("final_expression", sa.Text(), nullable=False),
        sa.Column("review_notes", sa.Text(), nullable=False),
        sa.Column("reviewer_name", sa.String(100), nullable=False, server_default=""),
        sa.Column("issue_tags", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["case_id"], ["review_cases.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("case_id", "revision_number", name="uq_review_revision_number"),
    )
    op.create_index("ix_review_revisions_case_id", "review_revisions", ["case_id"])
    op.create_table(
        "review_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("case_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(30), nullable=False),
        sa.Column("from_status", sa.String(30)),
        sa.Column("to_status", sa.String(30), nullable=False),
        sa.Column("reviewer_name", sa.String(100), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["case_id"], ["review_cases.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_review_events_case_id", "review_events", ["case_id"])


def downgrade():
    op.drop_index("ix_review_events_case_id", table_name="review_events")
    op.drop_table("review_events")
    op.drop_index("ix_review_revisions_case_id", table_name="review_revisions")
    op.drop_table("review_revisions")
    op.drop_index("ix_review_case_terms_term_id", table_name="review_case_terms")
    op.drop_index("ix_review_case_terms_case_id", table_name="review_case_terms")
    op.drop_table("review_case_terms")
    op.drop_index("ix_review_cases_status", table_name="review_cases")
    op.drop_index("ix_review_cases_source_request_id", table_name="review_cases")
    op.drop_index("ix_review_cases_public_id", table_name="review_cases")
    op.drop_table("review_cases")
