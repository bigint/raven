from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.lib.crypto import decrypt_with_rotation
from src.models.provider import ProviderConfig


async def get_fallback_providers(
    session: AsyncSession,
    current_config_id: str,
    provider_name: str,
) -> list[dict]:
    result = await session.execute(
        select(ProviderConfig).where(
            ProviderConfig.provider == provider_name,
            ProviderConfig.is_enabled.is_(True),
            ProviderConfig.id != current_config_id,
        )
    )
    configs = result.scalars().all()

    fallbacks = []
    for config in configs:
        try:
            decrypted_key = decrypt_with_rotation(
                config.api_key,
                settings.ENCRYPTION_SECRET,
                settings.ENCRYPTION_SECRET_PREVIOUS,
            )
            fallbacks.append({
                "provider_config_id": config.id,
                "provider_config_name": config.name,
                "provider_name": provider_name,
                "decrypted_api_key": decrypted_key,
            })
        except Exception:
            continue

    return fallbacks
