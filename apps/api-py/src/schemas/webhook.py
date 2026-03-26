from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WebhookCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    url: str
    events: list[str]
    is_enabled: bool = Field(default=True, alias="isEnabled")


class WebhookUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    url: str | None = None
    events: list[str] | None = None
    is_enabled: bool | None = Field(default=None, alias="isEnabled")


class WebhookResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    url: str
    events: list[str]
    is_enabled: bool = Field(alias="isEnabled")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class WebhookCreateResponse(WebhookResponse):
    secret: str
