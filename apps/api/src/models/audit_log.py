from datetime import datetime
from typing import Any

from cuid2 import cuid_wrapper
from sqlalchemy import DateTime, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("audit_logs_created_idx", "created_at"),
        Index("audit_logs_action_idx", "action"),
        Index("audit_logs_resource_type_idx", "resource_type"),
        Index("audit_logs_actor_idx", "actor_id"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=cuid_wrapper)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    resource_type: Mapped[str] = mapped_column(Text, nullable=False)
    resource_id: Mapped[str] = mapped_column(Text, nullable=False)
    actor_id: Mapped[str | None] = mapped_column(Text, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    metadata_: Mapped[dict[str, Any] | None] = mapped_column(
        "metadata", JSONB, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default="now()"
    )
