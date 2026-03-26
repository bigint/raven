import enum
from datetime import datetime
from typing import Any

from cuid2 import cuid_wrapper
from sqlalchemy import Boolean, DateTime, Enum, Index, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class GuardrailType(str, enum.Enum):
    BLOCK_TOPICS = "block_topics"
    PII_DETECTION = "pii_detection"
    CONTENT_FILTER = "content_filter"
    CUSTOM_REGEX = "custom_regex"


class GuardrailAction(str, enum.Enum):
    BLOCK = "block"
    WARN = "warn"
    LOG = "log"


guardrail_type_enum = Enum(
    GuardrailType,
    name="guardrail_type",
    values_callable=lambda e: [m.value for m in e],
    create_constraint=False,
    native_enum=True,
    schema=None,
)

guardrail_action_enum = Enum(
    GuardrailAction,
    name="guardrail_action",
    values_callable=lambda e: [m.value for m in e],
    create_constraint=False,
    native_enum=True,
    schema=None,
)


class GuardrailRule(Base):
    __tablename__ = "guardrail_rules"
    __table_args__ = (Index("guardrail_rules_enabled_idx", "isEnabled"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=cuid_wrapper)
    type: Mapped[GuardrailType] = mapped_column(guardrail_type_enum, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    action: Mapped[GuardrailAction] = mapped_column(
        guardrail_action_enum, nullable=False, default=GuardrailAction.LOG
    )
    is_enabled: Mapped[bool] = mapped_column("isEnabled", Boolean, nullable=False, default=True)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), nullable=False, server_default="now()"
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updatedAt", DateTime(timezone=True), nullable=False, server_default="now()"
    )
