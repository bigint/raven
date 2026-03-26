from redis.asyncio import Redis

from src.lib.errors import AppError


async def check_rate_limit(
    redis: Redis, key_id: str, rpm: int | None, rpd: int | None
) -> None:
    if rpm:
        rpm_key = f"raven:rl:rpm:{key_id}"
        current = await redis.incr(rpm_key)
        if current == 1:
            await redis.expire(rpm_key, 60)
        if current > rpm:
            raise AppError(
                f"Rate limit exceeded: {rpm} requests per minute",
                429,
                "RATE_LIMIT_EXCEEDED",
            )

    if rpd:
        rpd_key = f"raven:rl:rpd:{key_id}"
        current = await redis.incr(rpd_key)
        if current == 1:
            await redis.expire(rpd_key, 86400)
        if current > rpd:
            raise AppError(
                f"Rate limit exceeded: {rpd} requests per day",
                429,
                "RATE_LIMIT_EXCEEDED",
            )
