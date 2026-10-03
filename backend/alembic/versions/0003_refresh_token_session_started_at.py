"""add refresh_tokens.session_started_at

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-03
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "refresh_tokens",
        sa.Column("session_started_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Existing rows: treat each token's creation as the session start.
    op.execute("UPDATE refresh_tokens SET session_started_at = created_at")
    op.alter_column(
        "refresh_tokens",
        "session_started_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text("now()"),
    )


def downgrade() -> None:
    op.drop_column("refresh_tokens", "session_started_at")
