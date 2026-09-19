"""preserve legacy payloads and widen migration identities

Revision ID: 7b8f4e2a1c6d
Revises: 3d256e5c3d75
"""

from alembic import op
import sqlalchemy as sa


revision = "7b8f4e2a1c6d"
down_revision = "3d256e5c3d75"
branch_labels = None
depends_on = None


def upgrade():
    # Add nullable first so this works on populated MySQL and SQLite databases.
    op.add_column("kb_terms", sa.Column("legacy_payload", sa.JSON(), nullable=True))
    op.execute(sa.text("UPDATE kb_terms SET legacy_payload = :empty_payload").bindparams(empty_payload="{}"))

    # Batch mode provides SQLite's table-rebuild path while remaining a direct
    # ALTER on engines such as MySQL. No server-specific JSON default is used.
    with op.batch_alter_table("kb_terms") as batch:
        batch.alter_column("legacy_payload", existing_type=sa.JSON(), nullable=False)
        batch.alter_column("legacy_id", existing_type=sa.String(length=100), type_=sa.String(length=255))
    with op.batch_alter_table("kb_topic_items") as batch:
        batch.alter_column("legacy_id", existing_type=sa.String(length=100), type_=sa.String(length=255))


def downgrade():
    with op.batch_alter_table("kb_topic_items") as batch:
        batch.alter_column("legacy_id", existing_type=sa.String(length=255), type_=sa.String(length=100))
    with op.batch_alter_table("kb_terms") as batch:
        batch.alter_column("legacy_id", existing_type=sa.String(length=255), type_=sa.String(length=100))
        batch.drop_column("legacy_payload")
