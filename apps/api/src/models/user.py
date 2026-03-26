import enum
from datetime import datetime

from cuid2 import cuid_wrapper
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class PlatformRole(enum.StrEnum):
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


platform_role_enum = Enum(
    PlatformRole,
    name="platform_role",
    values_callable=lambda e: [m.value for m in e],
    create_constraint=False,
    native_enum=True,
    schema=None,
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=cuid_wrapper)
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column("avatarUrl", Text, nullable=True)
    role: Mapped[PlatformRole] = mapped_column(
        platform_role_enum, nullable=False, default=PlatformRole.VIEWER
    )
    email_verified: Mapped[bool] = mapped_column(
        "emailVerified", Boolean, nullable=False, default=False
    )
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), nullable=False, server_default="now()"
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updatedAt", DateTime(timezone=True), nullable=False, server_default="now()"
    )


class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = (
        Index("sessions_user_id_idx", "userId"),
        Index("sessions_expires_at_idx", "expiresAt"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    token: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    user_id: Mapped[str] = mapped_column(
        "userId", Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        "expiresAt", DateTime(timezone=True), nullable=False
    )
    ip_address: Mapped[str | None] = mapped_column("ipAddress", Text, nullable=True)
    user_agent: Mapped[str | None] = mapped_column("userAgent", Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), nullable=False, server_default="now()"
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updatedAt", DateTime(timezone=True), nullable=False, server_default="now()"
    )


class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = (Index("accounts_user_id_idx", "userId"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        "userId", Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    provider_id: Mapped[str] = mapped_column("providerId", Text, nullable=False)
    account_id: Mapped[str] = mapped_column("accountId", Text, nullable=False)
    password: Mapped[str | None] = mapped_column(Text, nullable=True)
    access_token: Mapped[str | None] = mapped_column("accessToken", Text, nullable=True)
    access_token_expires_at: Mapped[datetime | None] = mapped_column(
        "accessTokenExpiresAt", DateTime(timezone=True), nullable=True
    )
    refresh_token: Mapped[str | None] = mapped_column("refreshToken", Text, nullable=True)
    refresh_token_expires_at: Mapped[datetime | None] = mapped_column(
        "refreshTokenExpiresAt", DateTime(timezone=True), nullable=True
    )
    id_token: Mapped[str | None] = mapped_column("idToken", Text, nullable=True)
    scope: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), nullable=False, server_default="now()"
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updatedAt", DateTime(timezone=True), nullable=False, server_default="now()"
    )


class Verification(Base):
    __tablename__ = "verifications"
    __table_args__ = (
        Index("verifications_identifier_idx", "identifier"),
        Index("verifications_expires_at_idx", "expiresAt"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    identifier: Mapped[str] = mapped_column(Text, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        "expiresAt", DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), nullable=False, server_default="now()"
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updatedAt", DateTime(timezone=True), nullable=False, server_default="now()"
    )
