"""add settings and credits

Revision ID: 20260505_0001
Revises: 
Create Date: 2026-05-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260505_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {item["name"] for item in inspector.get_columns(table_name)}
    if column.name not in columns:
        op.add_column(table_name, column)


def _drop_column_if_exists(table_name: str, column_name: str) -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {item["name"] for item in inspector.get_columns(table_name)}
    if column_name in columns:
        op.drop_column(table_name, column_name)


def upgrade() -> None:
    _add_column_if_missing("users", sa.Column("display_name", sa.String(), nullable=True))
    _add_column_if_missing("users", sa.Column("company_name", sa.String(), nullable=True))
    _add_column_if_missing("users", sa.Column("role", sa.String(), nullable=True))
    _add_column_if_missing("users", sa.Column("industry", sa.String(), nullable=True))
    _add_column_if_missing("users", sa.Column("default_output", sa.String(), nullable=False, server_default="both"))
    _add_column_if_missing("users", sa.Column("preferred_tone", sa.String(), nullable=False, server_default="formal"))
    _add_column_if_missing("users", sa.Column("export_format", sa.String(), nullable=False, server_default="pdf"))
    _add_column_if_missing("users", sa.Column("plan", sa.String(), nullable=False, server_default="free"))
    _add_column_if_missing("users", sa.Column("credits_balance", sa.Integer(), nullable=False, server_default="30"))
    _add_column_if_missing("users", sa.Column("credits_max", sa.Integer(), nullable=False, server_default="30"))
    _add_column_if_missing("users", sa.Column("last_refill_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    _add_column_if_missing("users", sa.Column("google_id", sa.String(), nullable=True))
    _add_column_if_missing("users", sa.Column("hashed_password", sa.String(), nullable=True))
    _add_column_if_missing("users", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))

    _add_column_if_missing("guest_sessions", sa.Column("credits_balance", sa.Integer(), nullable=False, server_default="10"))
    _add_column_if_missing("guest_sessions", sa.Column("credits_max", sa.Integer(), nullable=False, server_default="10"))
    _add_column_if_missing("guest_sessions", sa.Column("last_refill_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "credit_transactions" not in inspector.get_table_names():
        op.create_table(
            "credit_transactions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("guest_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("guest_sessions.id"), nullable=True),
            sa.Column("amount", sa.Integer(), nullable=False),
            sa.Column("type", sa.String(), nullable=False),
            sa.Column("description", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        )
        op.create_index("ix_credit_transactions_user_id", "credit_transactions", ["user_id"])
        op.create_index("ix_credit_transactions_guest_session_id", "credit_transactions", ["guest_session_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "credit_transactions" in inspector.get_table_names():
        op.drop_index("ix_credit_transactions_guest_session_id", table_name="credit_transactions")
        op.drop_index("ix_credit_transactions_user_id", table_name="credit_transactions")
        op.drop_table("credit_transactions")

    for column_name in ("last_refill_at", "credits_max", "credits_balance"):
        _drop_column_if_exists("guest_sessions", column_name)

    for column_name in (
        "deleted_at",
        "hashed_password",
        "google_id",
        "last_refill_at",
        "credits_max",
        "credits_balance",
        "plan",
        "export_format",
        "preferred_tone",
        "default_output",
        "industry",
        "role",
        "company_name",
        "display_name",
    ):
        _drop_column_if_exists("users", column_name)
