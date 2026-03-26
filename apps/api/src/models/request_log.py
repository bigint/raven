from datetime import datetime
from decimal import Decimal

from cuid2 import cuid_wrapper
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class RequestLog(Base):
    __tablename__ = "request_logs"
    __table_args__ = (
        Index("request_logs_created_idx", "created_at"),
        Index("request_logs_key_created_idx", "virtual_key_id", "created_at"),
        Index("request_logs_session_created_idx", "session_id", "created_at"),
        Index("request_logs_provider_model_created_idx", "provider", "model", "created_at"),
        Index("request_logs_status_created_idx", "status_code", "created_at"),
        Index("request_logs_model_created_idx", "model", "created_at"),
        Index("request_logs_enduser_created_idx", "end_user", "created_at"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=cuid_wrapper())
    cached_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cache_hit: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    cost: Mapped[Decimal] = mapped_column(
        Numeric(precision=12, scale=6), nullable=False, default=Decimal("0")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )
    end_user: Mapped[str | None] = mapped_column(Text, nullable=True)
    has_images: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    has_tool_use: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    image_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    input_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_starred: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    method: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(Text, nullable=False)
    output_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    path: Mapped[str] = mapped_column(Text, nullable=False)
    provider: Mapped[str] = mapped_column(Text, nullable=False)
    provider_config_id: Mapped[str | None] = mapped_column(
        Text,
        ForeignKey("provider_configs.id", ondelete="SET NULL"),
        nullable=True,
    )
    reasoning_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    request_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    response_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    session_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    tool_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tool_names: Mapped[list[str] | None] = mapped_column(JSONB, default=list)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    virtual_key_id: Mapped[str | None] = mapped_column(
        Text,
        ForeignKey("virtual_keys.id", ondelete="SET NULL"),
        nullable=True,
    )
