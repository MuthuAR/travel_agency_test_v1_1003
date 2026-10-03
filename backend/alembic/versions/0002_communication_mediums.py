"""communication_medium (enum) -> communication_mediums (array)

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-03
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# create_type=False: the enum type is created/dropped explicitly below.
communicationmedium = postgresql.ENUM(
    "whatsapp", "sms", "email", name="communicationmedium", create_type=False
)


def upgrade() -> None:
    op.add_column(
        "customer_profiles",
        sa.Column("communication_mediums", postgresql.ARRAY(sa.String(length=20)), nullable=True),
    )
    # Preserve each existing single choice as a one-element array.
    op.execute(
        "UPDATE customer_profiles "
        "SET communication_mediums = ARRAY[communication_medium::text]"
    )
    op.alter_column("customer_profiles", "communication_mediums", nullable=False)
    op.drop_column("customer_profiles", "communication_medium")
    communicationmedium.drop(op.get_bind(), checkfirst=True)


def downgrade() -> None:
    communicationmedium.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "customer_profiles",
        sa.Column("communication_medium", communicationmedium, nullable=True),
    )
    # Keep only the first selected medium (lossy when several were chosen).
    op.execute(
        "UPDATE customer_profiles "
        "SET communication_medium = communication_mediums[1]::communicationmedium"
    )
    op.alter_column("customer_profiles", "communication_medium", nullable=False)
    op.drop_column("customer_profiles", "communication_mediums")
