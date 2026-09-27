"""add users

Revision ID: b3c7d2e9a104
Revises: 9f4c2a7b1d30
"""

from alembic import op
import sqlalchemy as sa


revision = "b3c7d2e9a104"
down_revision = "9f4c2a7b1d30"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "kb_users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(80), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="user"),
        sa.Column("display_name", sa.String(100), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("username", name="uq_kb_users_username"),
    )
    op.create_index("ix_kb_users_username", "kb_users", ["username"])
    op.create_index("ix_kb_users_role", "kb_users", ["role"])


def downgrade():
    op.drop_index("ix_kb_users_role", table_name="kb_users")
    op.drop_index("ix_kb_users_username", table_name="kb_users")
    op.drop_table("kb_users")
