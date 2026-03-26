from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DateRange(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_date: datetime | None = Field(default=None, alias="from")
    to_date: datetime | None = Field(default=None, alias="to")


class PaginationParams(BaseModel):
    page: int = 1
    limit: int = Field(default=50, le=100)


class StatsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    total_requests: int = Field(alias="totalRequests")
    total_cost: float = Field(alias="totalCost")
    total_tokens: int = Field(alias="totalTokens")
    avg_latency_ms: float = Field(alias="avgLatencyMs")
    cache_hit_rate: float = Field(alias="cacheHitRate")
    error_rate: float = Field(alias="errorRate")


class UsageDataPoint(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    date: str
    requests: int
    tokens: int
    cost: float


class UsageResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    data: list[UsageDataPoint]
    total_requests: int = Field(alias="totalRequests")
    total_tokens: int = Field(alias="totalTokens")
    total_cost: float = Field(alias="totalCost")


class ModelUsage(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    model: str
    provider: str
    requests: int
    tokens: int
    cost: float
    avg_latency_ms: float = Field(alias="avgLatencyMs")


class CacheResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    total_requests: int = Field(alias="totalRequests")
    cache_hits: int = Field(alias="cacheHits")
    cache_hit_rate: float = Field(alias="cacheHitRate")
    tokens_saved: int = Field(alias="tokensSaved")
    cost_saved: float = Field(alias="costSaved")


class LatencyResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    avg_latency_ms: float = Field(alias="avgLatencyMs")
    p50_latency_ms: float = Field(alias="p50LatencyMs")
    p95_latency_ms: float = Field(alias="p95LatencyMs")
    p99_latency_ms: float = Field(alias="p99LatencyMs")
