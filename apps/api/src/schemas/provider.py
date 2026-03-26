from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProviderCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    provider: str
    api_key: str = Field(alias="apiKey")
    name: str | None = None
    is_enabled: bool = Field(default=True, alias="isEnabled")


class ProviderUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    api_key: str | None = Field(default=None, alias="apiKey")
    is_enabled: bool | None = Field(default=None, alias="isEnabled")


class ProviderResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    provider: str
    name: str | None
    models: list[str]
    is_enabled: bool = Field(alias="isEnabled")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
