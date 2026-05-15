"""merge document edit and auth heads

Revision ID: 20260515_0004
Revises: 20260511_0004, 20260515_0003
Create Date: 2026-05-15
"""
from typing import Sequence, Union


revision: str = "20260515_0004"
down_revision: Union[str, tuple[str, str], None] = ("20260511_0004", "20260515_0003")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
