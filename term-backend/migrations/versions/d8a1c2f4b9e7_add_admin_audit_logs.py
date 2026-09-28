"""add admin audit logs

Revision ID: d8a1c2f4b9e7
Revises: c4e8a9f2d105
"""

from alembic import op
import sqlalchemy as sa


revision = "d8a1c2f4b9e7"
down_revision = "c4e8a9f2d105"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "kb_admin_audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_id", sa.Integer(), nullable=True),
        sa.Column("actor_username", sa.String(80), nullable=False, server_default=""),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("target_type", sa.String(80), nullable=False, server_default=""),
        sa.Column("target_id", sa.String(80), nullable=False, server_default=""),
        sa.Column("summary", sa.String(255), nullable=False, server_default=""),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["actor_id"], ["kb_users.id"]),
    )
    op.create_index("ix_kb_admin_audit_logs_actor_id", "kb_admin_audit_logs", ["actor_id"])
    op.create_index("ix_kb_admin_audit_logs_action", "kb_admin_audit_logs", ["action"])
    op.create_index("ix_kb_admin_audit_logs_target_type", "kb_admin_audit_logs", ["target_type"])
    op.create_index("ix_kb_admin_audit_logs_target_id", "kb_admin_audit_logs", ["target_id"])
    op.create_index("ix_kb_admin_audit_logs_created_at", "kb_admin_audit_logs", ["created_at"])


def downgrade():
    op.drop_index("ix_kb_admin_audit_logs_created_at", table_name="kb_admin_audit_logs")
    op.drop_index("ix_kb_admin_audit_logs_target_id", table_name="kb_admin_audit_logs")
    op.drop_index("ix_kb_admin_audit_logs_target_type", table_name="kb_admin_audit_logs")
    op.drop_index("ix_kb_admin_audit_logs_action", table_name="kb_admin_audit_logs")
    op.drop_index("ix_kb_admin_audit_logs_actor_id", table_name="kb_admin_audit_logs")
    op.drop_table("kb_admin_audit_logs")
