from datetime import datetime

from cuid2 import cuid_wrapper
from sqlalchemy import Boolean, DateTime, Index, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class Webhook(Base):
    __tablename__ = "webhooks"
    __table_args__ = (Index("webhooks_enabled_idx", "is_enabled"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=cuid_wrapper())
    url: Mapped[str] = mapped_column(Text, nullable=False)
    secret: Mapped[str] = mapped_column(Text, nullable=False)
    events: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )
