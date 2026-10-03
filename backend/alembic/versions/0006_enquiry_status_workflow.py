"""enquiry status workflow: new enum values and status history table

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-03
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Swap the enum type; existing rows are remapped (contacted->ack, closed->completed).
    op.execute("ALTER TYPE enquirystatus RENAME TO enquirystatus_old")
    op.execute(
        "CREATE TYPE enquirystatus AS ENUM "
        "('new', 'ack', 'confirmed', 'cancelled', 'completed')"
    )
    op.execute("ALTER TABLE enquiries ALTER COLUMN status DROP DEFAULT")
    op.execute(
        "ALTER TABLE enquiries ALTER COLUMN status TYPE enquirystatus USING ("
        "CASE status::text WHEN 'contacted' THEN 'ack' WHEN 'closed' THEN 'completed' "
        "ELSE status::text END)::enquirystatus"
    )
    op.execute("ALTER TABLE enquiries ALTER COLUMN status SET DEFAULT 'new'")
    op.execute("DROP TYPE enquirystatus_old")
    # ix_enquiries_status is rebuilt automatically by ALTER COLUMN TYPE.

    op.create_table(
        "enquiry_status_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("enquiry_id", sa.Integer(), nullable=False),
        sa.Column("from_status", sa.String(length=20), nullable=False),
        sa.Column("to_status", sa.String(length=20), nullable=False),
        sa.Column("changed_by_user_id", sa.Integer(), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["enquiry_id"], ["enquiries.id"],
            name="fk_enquiry_status_history_enquiry_id_enquiries", ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["changed_by_user_id"], ["users.id"],
            name="fk_enquiry_status_history_changed_by_user_id_users", ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_enquiry_status_history"),
    )
    op.create_index(
        "ix_enquiry_status_history_enquiry_id", "enquiry_status_history", ["enquiry_id"], unique=False
    )
    op.create_index(
        "ix_enquiry_status_history_changed_by_user_id",
        "enquiry_status_history",
        ["changed_by_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_enquiry_status_history_changed_by_user_id", table_name="enquiry_status_history")
    op.drop_index("ix_enquiry_status_history_enquiry_id", table_name="enquiry_status_history")
    op.drop_table("enquiry_status_history")

    op.execute("ALTER TYPE enquirystatus RENAME TO enquirystatus_new")
    op.execute(
        "CREATE TYPE enquirystatus AS ENUM "
        "('new', 'contacted', 'confirmed', 'cancelled', 'closed')"
    )
    op.execute("ALTER TABLE enquiries ALTER COLUMN status DROP DEFAULT")
    op.execute(
        "ALTER TABLE enquiries ALTER COLUMN status TYPE enquirystatus USING ("
        "CASE status::text WHEN 'ack' THEN 'contacted' WHEN 'completed' THEN 'closed' "
        "ELSE status::text END)::enquirystatus"
    )
    op.execute("ALTER TABLE enquiries ALTER COLUMN status SET DEFAULT 'new'")
    op.execute("DROP TYPE enquirystatus_new")
