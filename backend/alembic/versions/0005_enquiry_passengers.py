"""enquiry passengers, additional travellers count, nullable profile gender

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-03
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Organization accounts do not provide gender; existing rows keep their values.
    op.alter_column(
        "customer_profiles",
        "gender",
        existing_type=sa.String(length=20),
        nullable=True,
    )

    # Existing enquiries pick up the server default and become 0.
    op.add_column(
        "enquiries",
        sa.Column(
            "additional_travellers_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    # Short name: the metadata naming convention prepends ck_enquiries_.
    op.create_check_constraint(
        "additional_travellers_nonneg",
        "enquiries",
        "additional_travellers_count >= 0",
    )

    op.create_table(
        "enquiry_passengers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("enquiry_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.SmallInteger(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("mobile", sa.String(length=20), nullable=False),
        sa.Column("gender", sa.String(length=20), nullable=False),
        sa.Column("spoken_languages", postgresql.ARRAY(sa.String(length=50)), nullable=False),
        sa.Column("communication_mediums", postgresql.ARRAY(sa.String(length=20)), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["enquiry_id"], ["enquiries.id"],
            name="fk_enquiry_passengers_enquiry_id_enquiries", ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_enquiry_passengers"),
        sa.UniqueConstraint(
            "enquiry_id", "position", name="uq_enquiry_passengers_enquiry_id_position"
        ),
    )
    op.create_index(
        "ix_enquiry_passengers_enquiry_id", "enquiry_passengers", ["enquiry_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_enquiry_passengers_enquiry_id", table_name="enquiry_passengers")
    op.drop_table("enquiry_passengers")

    op.drop_constraint("additional_travellers_nonneg", "enquiries", type_="check")
    op.drop_column("enquiries", "additional_travellers_count")

    op.execute("UPDATE customer_profiles SET gender = 'other' WHERE gender IS NULL")
    op.alter_column(
        "customer_profiles",
        "gender",
        existing_type=sa.String(length=20),
        nullable=False,
    )
