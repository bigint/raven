import logging

from redis.asyncio import Redis

logger = logging.getLogger("raven.proxy.last_used")


async def update_last_used(redis: Redis, virtual_key_id: str) -> None:
    try:
        await redis.set(f"raven:lastused:{virtual_key_id}", "1", ex=60)
    except Exception:
        logger.debug("Failed to update last used", exc_info=True)
