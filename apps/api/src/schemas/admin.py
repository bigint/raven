from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="allow")


class UserRoleUpdate(BaseModel):
    role: str


class InvitationCreate(BaseModel):
    email: str
    role: str = "member"


class StatsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    total_users: int = Field(alias="totalUsers")
    total_requests: int = Field(alias="totalRequests")
    total_cost: float = Field(alias="totalCost")
    total_tokens: int = Field(alias="totalTokens")
    total_providers: int = Field(alias="totalProviders")
    total_keys: int = Field(alias="totalKeys")
    cache_hits: int = Field(alias="cacheHits")
    avg_latency_ms: float = Field(alias="avgLatencyMs")


class SettingsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    settings: dict[str, Any]
