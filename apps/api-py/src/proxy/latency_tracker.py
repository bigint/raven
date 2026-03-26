import logging

from redis.asyncio import Redis

from src.redis import UPDATE_METRICS_LUA

logger = logging.getLogger("raven.proxy.latency")

ALPHA = 0.3
LATENCY_TTL = 86400
COST_TTL = 2592000  # 30 days

_script = None


async def update_metrics(
    redis: Redis, provider_config_id: str, latency_ms: int, cost: float
) -> None:
    global _script
    try:
        if _script is None:
            _script = redis.register_script(UPDATE_METRICS_LUA)

        latency_key = f"raven:latency:{provider_config_id}"
        cost_key = f"raven:cost:{provider_config_id}"

        await _script(
            keys=[latency_key, cost_key],
            args=[latency_ms, ALPHA, LATENCY_TTL, cost, COST_TTL],
        )
    except Exception:
        logger.debug("Failed to update metrics", exc_info=True)
