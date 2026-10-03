"""add customer_profiles.account_type and organization_name

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-03
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Existing rows pick up the server default and become 'personal'.
    op.add_column(
        "customer_profiles",
        sa.Column(
            "account_type",
            sa.String(length=20),
            nullable=False,
            server_default="personal",
        ),
    )
    # Existing rows get NULL, which satisfies the 'personal' branch of the check.
    op.add_column(
        "customer_profiles",
        sa.Column("organization_name", sa.String(length=200), nullable=True),
    )
    op.create_check_constraint(
        "ck_customer_profiles_account_type_valid",
        "customer_profiles",
        "account_type IN ('personal', 'organization')",
    )
    op.create_check_constraint(
        "ck_customer_profiles_organization_name_matches_type",
        "customer_profiles",
        "(account_type = 'organization' AND organization_name IS NOT NULL "
        "AND length(trim(organization_name)) > 0) "
        "OR (account_type = 'personal' AND organization_name IS NULL)",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_customer_profiles_organization_name_matches_type",
        "customer_profiles",
        type_="check",
    )
    op.drop_constraint(
        "ck_customer_profiles_account_type_valid",
        "customer_profiles",
        type_="check",
    )
    op.drop_column("customer_profiles", "organization_name")
    op.drop_column("customer_profiles", "account_type")
