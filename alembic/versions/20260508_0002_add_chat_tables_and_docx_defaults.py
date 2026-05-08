"""add chat tables and docx defaults

Revision ID: 20260508_0002
Revises: 20260505_0001
Create Date: 2026-05-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260508_0002"
down_revision: Union[str, None] = "20260505_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _index_exists(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def upgrade() -> None:
    if not _table_exists("chat_sessions"):
        op.create_table(
            "chat_sessions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("guest_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("guest_sessions.id"), nullable=True),
            sa.Column("title", sa.String(), nullable=False, server_default="New chat"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        )

    if not _table_exists("chat_messages"):
        op.create_table(
            "chat_messages",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("chat_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chat_sessions.id"), nullable=False),
            sa.Column("role", sa.String(), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("message_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        )

    if _table_exists("chat_messages") and not _index_exists("chat_messages", "ix_chat_messages_chat_session_id"):
        op.create_index("ix_chat_messages_chat_session_id", "chat_messages", ["chat_session_id"])

    op.execute("UPDATE users SET export_format = 'docx' WHERE export_format IS NULL OR export_format IN ('pdf', 'markdown')")
    op.alter_column(
        "users",
        "export_format",
        existing_type=sa.String(),
        server_default="docx",
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "users",
        "export_format",
        existing_type=sa.String(),
        server_default="pdf",
        existing_nullable=False,
    )

    if _table_exists("chat_messages"):
        if _index_exists("chat_messages", "ix_chat_messages_chat_session_id"):
            op.drop_index("ix_chat_messages_chat_session_id", table_name="chat_messages")
        op.drop_table("chat_messages")

    if _table_exists("chat_sessions"):
        op.drop_table("chat_sessions")
