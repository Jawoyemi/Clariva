"""add password reset fields to users table

Revision ID: 20260511_0004
Revises: 20260511_0003
Create Date: 2026-05-11
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260511_0004"
down_revision: Union[str, None] = "20260511_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("reset_password_code", sa.String(), nullable=True))
    op.add_column("users", sa.Column("reset_password_expires_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "reset_password_expires_at")
    op.drop_column("users", "reset_password_code")
