from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class GuardrailCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    type: str
    config: dict[str, Any]
    action: str = "log"
    is_enabled: bool = Field(default=True, alias="isEnabled")
    priority: int = 0


class GuardrailUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    type: str | None = None
    config: dict[str, Any] | None = None
    action: str | None = None
    is_enabled: bool | None = Field(default=None, alias="isEnabled")
    priority: int | None = None


class GuardrailResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    name: str
    type: str
    config: dict[str, Any]
    action: str
    is_enabled: bool = Field(alias="isEnabled")
    priority: int
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
