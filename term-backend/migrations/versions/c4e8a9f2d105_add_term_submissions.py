"""add term submissions

Revision ID: c4e8a9f2d105
Revises: b3c7d2e9a104
"""

from alembic import op
import sqlalchemy as sa


revision = "c4e8a9f2d105"
down_revision = "b3c7d2e9a104"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "kb_term_submissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(64), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=False),
        sa.Column("term_id", sa.Integer(), nullable=True),
        sa.Column("preferred_name_zh", sa.String(255), nullable=False),
        sa.Column("definition_zh", sa.Text(), nullable=False, server_default=""),
        sa.Column("recommended_translation", sa.Text(), nullable=False, server_default=""),
        sa.Column("cultural_connotation", sa.Text(), nullable=False, server_default=""),
        sa.Column("source_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("review_note", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["created_by_id"], ["kb_users.id"]),
        sa.ForeignKeyConstraint(["term_id"], ["kb_terms.id"]),
        sa.UniqueConstraint("public_id", name="uq_kb_term_submissions_public_id"),
    )
    op.create_index("ix_kb_term_submissions_public_id", "kb_term_submissions", ["public_id"])
    op.create_index("ix_kb_term_submissions_created_by_id", "kb_term_submissions", ["created_by_id"])
    op.create_index("ix_kb_term_submissions_term_id", "kb_term_submissions", ["term_id"])
    op.create_index("ix_kb_term_submissions_status", "kb_term_submissions", ["status"])


def downgrade():
    op.drop_index("ix_kb_term_submissions_status", table_name="kb_term_submissions")
    op.drop_index("ix_kb_term_submissions_term_id", table_name="kb_term_submissions")
    op.drop_index("ix_kb_term_submissions_created_by_id", table_name="kb_term_submissions")
    op.drop_index("ix_kb_term_submissions_public_id", table_name="kb_term_submissions")
    op.drop_table("kb_term_submissions")
