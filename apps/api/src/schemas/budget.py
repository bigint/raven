from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BudgetCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    entity_type: str = Field(alias="entityType")
    entity_id: str = Field(alias="entityId")
    limit_amount: float = Field(alias="limitAmount")
    period: str = "monthly"
    alert_threshold: float = Field(default=0.80, alias="alertThreshold")


class BudgetUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    limit_amount: float | None = Field(default=None, alias="limitAmount")
    period: str | None = None
    alert_threshold: float | None = Field(default=None, alias="alertThreshold")


class BudgetResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    entity_type: str = Field(alias="entityType")
    entity_id: str = Field(alias="entityId")
    limit_amount: float = Field(alias="limitAmount")
    period: str
    alert_threshold: float = Field(alias="alertThreshold")
    created_at: datetime = Field(alias="createdAt")
