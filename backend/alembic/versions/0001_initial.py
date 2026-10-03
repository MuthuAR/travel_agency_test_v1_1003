"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-10-03
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# create_type=False: enums are created/dropped explicitly below.
userrole = postgresql.ENUM("customer", "admin", name="userrole", create_type=False)
communicationmedium = postgresql.ENUM(
    "whatsapp", "sms", "email", name="communicationmedium", create_type=False
)
enquirystatus = postgresql.ENUM(
    "new", "contacted", "confirmed", "cancelled", "closed",
    name="enquirystatus", create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    userrole.create(bind, checkfirst=True)
    communicationmedium.create(bind, checkfirst=True)
    enquirystatus.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("mobile", sa.String(length=20), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", userrole, server_default="customer", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
    )
    op.create_index("ix_users_mobile", "users", ["mobile"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"],
            name="fk_refresh_tokens_user_id_users", ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_refresh_tokens"),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"], unique=False)
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=True)

    op.create_table(
        "customer_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("gender", sa.String(length=20), nullable=False),
        sa.Column("spoken_languages", postgresql.ARRAY(sa.String(length=50)), nullable=False),
        sa.Column("communication_medium", communicationmedium, nullable=False),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"],
            name="fk_customer_profiles_user_id_users", ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_customer_profiles"),
        sa.UniqueConstraint("user_id", name="uq_customer_profiles_user_id"),
    )

    op.create_table(
        "enquiries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("pickup_location", sa.String(length=255), nullable=False),
        sa.Column("drop_location", sa.String(length=255), nullable=False),
        sa.Column("travel_routes", sa.Text(), nullable=False),
        sa.Column("adults_count", sa.Integer(), nullable=False),
        sa.Column("kids_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("vehicle_preference", sa.String(length=100), nullable=False),
        sa.Column("others", sa.Text(), nullable=True),
        sa.Column("status", enquirystatus, server_default="new", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("end_date >= start_date", name="ck_enquiries_end_date_gte_start_date"),
        sa.CheckConstraint("adults_count >= 0", name="ck_enquiries_adults_count_non_negative"),
        sa.CheckConstraint("kids_count >= 0", name="ck_enquiries_kids_count_non_negative"),
        sa.CheckConstraint("adults_count + kids_count >= 1", name="ck_enquiries_min_one_traveller"),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"],
            name="fk_enquiries_user_id_users", ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_enquiries"),
    )
    op.create_index("ix_enquiries_user_id", "enquiries", ["user_id"], unique=False)
    op.create_index("ix_enquiries_status", "enquiries", ["status"], unique=False)
    op.create_index("ix_enquiries_user_id_created_at", "enquiries", ["user_id", "created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_enquiries_user_id_created_at", table_name="enquiries")
    op.drop_index("ix_enquiries_status", table_name="enquiries")
    op.drop_index("ix_enquiries_user_id", table_name="enquiries")
    op.drop_table("enquiries")

    op.drop_table("customer_profiles")

    op.drop_index("ix_refresh_tokens_token_hash", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_user_id", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_mobile", table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    enquirystatus.drop(bind, checkfirst=True)
    communicationmedium.drop(bind, checkfirst=True)
    userrole.drop(bind, checkfirst=True)
