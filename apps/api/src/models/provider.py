from datetime import datetime

from cuid2 import cuid_wrapper
from sqlalchemy import Boolean, DateTime, Index, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class ProviderConfig(Base):
    __tablename__ = "provider_configs"
    __table_args__ = (Index("provider_configs_provider_enabled_idx", "provider", "is_enabled"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=cuid_wrapper())
    provider: Mapped[str] = mapped_column(Text, nullable=False)
    api_key: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    models: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )
