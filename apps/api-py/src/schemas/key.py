from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class KeyCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    environment: str = "live"
    rate_limit_rpm: int | None = Field(default=None, alias="rateLimitRpm")
    rate_limit_rpd: int | None = Field(default=None, alias="rateLimitRpd")
    expires_at: datetime | None = Field(default=None, alias="expiresAt")


class KeyUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    is_active: bool | None = Field(default=None, alias="isActive")
    rate_limit_rpm: int | None = Field(default=None, alias="rateLimitRpm")
    rate_limit_rpd: int | None = Field(default=None, alias="rateLimitRpd")
    expires_at: datetime | None = Field(default=None, alias="expiresAt")


class KeyResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    name: str
    environment: str
    is_active: bool = Field(alias="isActive")
    key_prefix: str = Field(alias="keyPrefix")
    rate_limit_rpm: int | None = Field(alias="rateLimitRpm")
    rate_limit_rpd: int | None = Field(alias="rateLimitRpd")
    expires_at: datetime | None = Field(alias="expiresAt")
    last_used_at: datetime | None = Field(alias="lastUsedAt")
    created_at: datetime = Field(alias="createdAt")


class KeyCreateResponse(KeyResponse):
    key: str
