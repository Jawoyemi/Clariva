"""add document edit context fields

Revision ID: 20260515_0003
Revises: 20260508_0002
Create Date: 2026-05-15
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260515_0003"
down_revision: Union[str, None] = "20260508_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def _foreign_key_exists(table_name: str, foreign_key_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(fk["name"] == foreign_key_name for fk in inspector.get_foreign_keys(table_name))


def upgrade() -> None:
    if not _table_exists("documents"):
        return

    if not _column_exists("documents", "chat_session_id"):
        op.add_column("documents", sa.Column("chat_session_id", postgresql.UUID(as_uuid=True), nullable=True))

    if not _column_exists("documents", "prd_content"):
        op.add_column("documents", sa.Column("prd_content", sa.Text(), nullable=True))

    if not _column_exists("documents", "sow_content"):
        op.add_column("documents", sa.Column("sow_content", sa.Text(), nullable=True))

    if (
        _table_exists("chat_sessions")
        and _column_exists("documents", "chat_session_id")
        and not _foreign_key_exists("documents", "fk_documents_chat_session_id_chat_sessions")
    ):
        op.create_foreign_key(
            "fk_documents_chat_session_id_chat_sessions",
            "documents",
            "chat_sessions",
            ["chat_session_id"],
            ["id"],
        )

    op.execute(
        """
        UPDATE documents
        SET prd_content = content
        WHERE type = 'PRD' AND (prd_content IS NULL OR prd_content = '')
        """
    )
    op.execute(
        """
        UPDATE documents
        SET sow_content = content
        WHERE type = 'SOW' AND (sow_content IS NULL OR sow_content = '')
        """
    )


def downgrade() -> None:
    if not _table_exists("documents"):
        return

    if _foreign_key_exists("documents", "fk_documents_chat_session_id_chat_sessions"):
        op.drop_constraint("fk_documents_chat_session_id_chat_sessions", "documents", type_="foreignkey")

    if _column_exists("documents", "sow_content"):
        op.drop_column("documents", "sow_content")

    if _column_exists("documents", "prd_content"):
        op.drop_column("documents", "prd_content")

    if _column_exists("documents", "chat_session_id"):
        op.drop_column("documents", "chat_session_id")
