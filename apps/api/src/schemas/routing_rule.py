from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RoutingRuleCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    source_model: str = Field(alias="sourceModel")
    target_model: str = Field(alias="targetModel")
    condition: str
    condition_value: str = Field(alias="conditionValue")
    is_enabled: bool = Field(default=True, alias="isEnabled")
    priority: int = 0


class RoutingRuleUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    source_model: str | None = Field(default=None, alias="sourceModel")
    target_model: str | None = Field(default=None, alias="targetModel")
    condition: str | None = None
    condition_value: str | None = Field(default=None, alias="conditionValue")
    is_enabled: bool | None = Field(default=None, alias="isEnabled")
    priority: int | None = None


class RoutingRuleResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    name: str
    source_model: str = Field(alias="sourceModel")
    target_model: str = Field(alias="targetModel")
    condition: str
    condition_value: str = Field(alias="conditionValue")
    is_enabled: bool = Field(alias="isEnabled")
    priority: int
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
