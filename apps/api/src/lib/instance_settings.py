import json
from typing import Any

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.setting import Setting

CACHE_KEY = "raven:instance_settings"
CACHE_TTL = 60

DEFAULT_SETTINGS: dict[str, Any] = {
    "analytics_retention_days": 90,
    "default_max_tokens": 4096,
    "email_notifications_enabled": False,
    "global_rate_limit_rpm": 60,
    "global_rate_limit_rpd": 1000,
    "instance_name": "Raven",
    "log_request_bodies": False,
    "log_response_bodies": False,
    "max_request_body_size_mb": 10,
    "password_min_length": 8,
    "request_timeout_seconds": 30,
    "resend_api_key": "",
    "resend_from_email": "",
    "session_timeout_hours": 720,
    "signup_enabled": True,
    "webhook_retry_count": 3,
    "webhook_timeout_seconds": 10,
}

PUBLIC_SETTING_KEYS = {"instance_name", "signup_enabled"}


def _cast_value(key: str, raw: str) -> Any:
    default = DEFAULT_SETTINGS.get(key)
    if isinstance(default, bool):
        return raw.lower() in ("true", "1", "yes")
    if isinstance(default, int):
        try:
            return int(raw)
        except ValueError:
            return default
    if isinstance(default, float):
        try:
            return float(raw)
        except ValueError:
            return default
    return raw


async def get_instance_settings(session: AsyncSession, redis: Redis) -> dict[str, Any]:
    cached = await redis.get(CACHE_KEY)
    if cached:
        return json.loads(cached)

    result = await session.execute(select(Setting))
    rows = result.scalars().all()

    merged = dict(DEFAULT_SETTINGS)
    for row in rows:
        merged[row.key] = _cast_value(row.key, row.value)

    await redis.set(CACHE_KEY, json.dumps(merged), ex=CACHE_TTL)
    return merged


async def get_public_settings(session: AsyncSession, redis: Redis) -> dict[str, Any]:
    all_settings = await get_instance_settings(session, redis)
    return {k: v for k, v in all_settings.items() if k in PUBLIC_SETTING_KEYS}


async def invalidate_settings_cache(redis: Redis) -> None:
    await redis.delete(CACHE_KEY)
