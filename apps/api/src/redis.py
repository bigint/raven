import json
from typing import Any

from redis.asyncio import ConnectionPool, Redis
from redis.backoff import ExponentialBackoff
from redis.retry import Retry

from src.config import settings

_pool: ConnectionPool | None = None


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool.from_url(
            settings.REDIS_URL,
            max_connections=50,
            decode_responses=True,
            socket_timeout=5.0,
            socket_connect_timeout=5.0,
            retry_on_timeout=True,
            retry=Retry(ExponentialBackoff(cap=10, base=1), retries=3),
            health_check_interval=30,
        )
    return _pool


def get_redis() -> Redis:
    return Redis(connection_pool=get_pool())


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.aclose()
        _pool = None


UPDATE_METRICS_LUA = """
local existing = redis.call('GET', KEYS[1])
local latency = tonumber(ARGV[1])
local alpha = tonumber(ARGV[2])
local newAvg
if existing == false then
  newAvg = latency
else
  newAvg = alpha * latency + (1 - alpha) * tonumber(existing)
end
redis.call('SET', KEYS[1], string.format('%.2f', newAvg), 'EX', tonumber(ARGV[3]))
local cost = tonumber(ARGV[4])
if cost > 0 then
  redis.call('INCRBYFLOAT', KEYS[2], cost)
  redis.call('EXPIRE', KEYS[2], tonumber(ARGV[5]))
end
return 1
"""


async def publish_event(event_type: str, data: dict[str, Any]) -> None:
    redis = get_redis()
    payload = json.dumps({"type": event_type, "data": data})
    await redis.publish("raven:events", payload)
