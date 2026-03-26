from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.lib.crypto import decrypt_with_rotation
from src.lib.errors import AppError
from src.models.provider import ProviderConfig


def parse_provider_from_path(path: str) -> str:
    parts = path.strip("/").split("/")
    if parts:
        return parts[0]
    raise AppError("Invalid provider path", 400, "INVALID_PATH")


async def resolve_provider(
    session: AsyncSession, provider_path: str, redis: Redis
) -> dict:
    provider_name = parse_provider_from_path(provider_path)

    result = await session.execute(
        select(ProviderConfig).where(
            ProviderConfig.provider == provider_name,
            ProviderConfig.is_enabled.is_(True),
        )
    )
    config = result.scalar_one_or_none()

    if not config:
        raise AppError(
            f"No active provider configuration found for '{provider_name}'",
            404,
            "PROVIDER_NOT_FOUND",
        )

    decrypted_key = decrypt_with_rotation(
        config.api_key,
        settings.ENCRYPTION_SECRET,
        settings.ENCRYPTION_SECRET_PREVIOUS,
    )

    return {
        "api_key": decrypted_key,
        "config_id": config.id,
        "config_name": config.name,
        "provider_name": provider_name,
        "upstream_path": provider_path,
    }
