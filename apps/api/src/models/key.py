import enum
from datetime import datetime

from cuid2 import cuid_wrapper
from sqlalchemy import Boolean, DateTime, Enum, Index, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class KeyEnvironment(enum.StrEnum):
    LIVE = "live"
    TEST = "test"


key_environment_enum = Enum(
    KeyEnvironment,
    name="key_environment",
    values_callable=lambda e: [m.value for m in e],
    create_constraint=False,
    native_enum=True,
    schema=None,
)


class VirtualKey(Base):
    __tablename__ = "virtual_keys"
    __table_args__ = (
        Index("virtual_keys_key_hash_idx", "key_hash"),
        Index("virtual_keys_active_idx", "is_active"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=cuid_wrapper)
    key_hash: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    key_prefix: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    environment: Mapped[KeyEnvironment] = mapped_column(
        key_environment_enum, nullable=False, default=KeyEnvironment.LIVE
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True
    )
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True
    )
    rate_limit_rpm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rate_limit_rpd: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default="now()"
    )
