from datetime import datetime

from cuid2 import cuid_wrapper
from sqlalchemy import DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base
from src.models.user import PlatformRole, platform_role_enum


class Invitation(Base):
    __tablename__ = "invitations"

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=cuid_wrapper())
    email: Mapped[str] = mapped_column(Text, nullable=False)
    token: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    role: Mapped[PlatformRole] = mapped_column(
        platform_role_enum, nullable=False, default=PlatformRole.MEMBER
    )
    invited_by: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )
