from datetime import datetime

from cuid2 import cuid_wrapper
from sqlalchemy import Boolean, DateTime, Index, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class RoutingRule(Base):
    __tablename__ = "routing_rules"
    __table_args__ = (Index("routing_rules_model_enabled_idx", "source_model", "is_enabled"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=cuid_wrapper())
    name: Mapped[str] = mapped_column(Text, nullable=False)
    source_model: Mapped[str] = mapped_column(Text, nullable=False)
    target_model: Mapped[str] = mapped_column(Text, nullable=False)
    condition: Mapped[str] = mapped_column(Text, nullable=False)
    condition_value: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )
