from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.lib.crypto import hash_sha256
from src.lib.errors import AppError
from src.models.key import VirtualKey


async def authenticate_key(
    session: AsyncSession, auth_header: str, redis: Redis
) -> dict:
    if not auth_header.startswith("Bearer "):
        raise AppError("Missing or invalid Authorization header", 401, "UNAUTHORIZED")

    api_key = auth_header[7:]
    key_hash = hash_sha256(api_key)

    # Check Redis cache first
    cached = await redis.get(f"raven:key:{key_hash}")
    if cached:
        import json
        return json.loads(cached)

    result = await session.execute(
        select(VirtualKey).where(
            VirtualKey.key_hash == key_hash,
            VirtualKey.is_active.is_(True),
        )
    )
    key = result.scalar_one_or_none()

    if not key:
        raise AppError("Invalid API key", 401, "INVALID_KEY")

    key_data = {
        "id": key.id,
        "name": key.name,
        "environment": key.environment.value,
        "rate_limit_rpm": key.rate_limit_rpm,
        "rate_limit_rpd": key.rate_limit_rpd,
    }

    # Cache for 5 minutes
    import json
    await redis.set(f"raven:key:{key_hash}", json.dumps(key_data), ex=300)

    return key_data
