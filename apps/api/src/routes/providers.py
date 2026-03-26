from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import require_admin, require_writer
from src.config import settings
from src.database import get_session
from src.lib.audit import audit_and_publish
from src.lib.crypto import decrypt_with_rotation, encrypt
from src.lib.errors import AppError
from src.models.provider import ProviderConfig
from src.models.user import User
from src.schemas.provider import ProviderCreate, ProviderResponse, ProviderUpdate

router = APIRouter(prefix="/v1/providers", tags=["providers"])

PROVIDER_TEST_URLS: dict[str, str] = {
    "openai": "https://api.openai.com/v1/models",
    "anthropic": "https://api.anthropic.com/v1/models",
    "google": "https://generativelanguage.googleapis.com/v1beta/models",
    "azure": "",
    "groq": "https://api.groq.com/openai/v1/models",
    "mistral": "https://api.mistral.ai/v1/models",
    "cohere": "https://api.cohere.ai/v1/models",
    "together": "https://api.together.xyz/v1/models",
    "fireworks": "https://api.fireworks.ai/inference/v1/models",
    "perplexity": "https://api.perplexity.ai/models",
    "deepseek": "https://api.deepseek.com/models",
}


def _mask_key(api_key: str) -> str:
    if len(api_key) <= 8:
        return "***"
    return api_key[:8] + "..."


@router.get("/")
async def list_providers(
    session: AsyncSession = Depends(get_session),
    _user: User = Depends(require_admin),
) -> dict:
    result = await session.execute(
        select(ProviderConfig).order_by(ProviderConfig.created_at.desc())
    )
    providers = result.scalars().all()

    items = []
    for p in providers:
        try:
            decrypted = decrypt_with_rotation(
                p.api_key, settings.ENCRYPTION_SECRET, settings.ENCRYPTION_SECRET_PREVIOUS
            )
            masked = _mask_key(decrypted)
        except Exception:
            masked = "***"

        resp = ProviderResponse.model_validate(p)
        item = resp.model_dump(by_alias=True)
        item["apiKey"] = masked
        items.append(item)

    return {"data": items}


@router.post("/", status_code=201)
async def create_provider(
    body: ProviderCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_writer),
) -> dict:
    encrypted_key = encrypt(body.api_key, settings.ENCRYPTION_SECRET)

    provider = ProviderConfig(
        provider=body.provider,
        api_key=encrypted_key,
        name=body.name,
        is_enabled=body.is_enabled,
    )
    session.add(provider)

    await audit_and_publish(
        session,
        actor_id=user.id,
        resource_type="provider",
        action="created",
        resource_id=provider.id,
        metadata={"provider": body.provider, "name": body.name},
    )

    await session.commit()
    await session.refresh(provider)

    resp = ProviderResponse.model_validate(provider)
    return {"data": resp.model_dump(by_alias=True)}


@router.put("/{id}")
async def update_provider(
    id: str,
    body: ProviderUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_writer),
) -> dict:
    result = await session.execute(
        select(ProviderConfig).where(ProviderConfig.id == id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise AppError("Provider not found", status_code=404, code="NOT_FOUND")

    updates = body.model_dump(exclude_unset=True)
    if "api_key" in updates and updates["api_key"] is not None:
        provider.api_key = encrypt(updates["api_key"], settings.ENCRYPTION_SECRET)
    if "is_enabled" in updates and updates["is_enabled"] is not None:
        provider.is_enabled = updates["is_enabled"]
    if "name" in updates:
        provider.name = updates["name"]

    provider.updated_at = datetime.now(UTC)

    await audit_and_publish(
        session,
        actor_id=user.id,
        resource_type="provider",
        action="updated",
        resource_id=provider.id,
        metadata={"fields": list(updates.keys())},
    )

    await session.commit()
    await session.refresh(provider)

    resp = ProviderResponse.model_validate(provider)
    return {"data": resp.model_dump(by_alias=True)}


@router.delete("/{id}")
async def delete_provider(
    id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_writer),
) -> dict:
    result = await session.execute(
        select(ProviderConfig).where(ProviderConfig.id == id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise AppError("Provider not found", status_code=404, code="NOT_FOUND")

    await audit_and_publish(
        session,
        actor_id=user.id,
        resource_type="provider",
        action="deleted",
        resource_id=provider.id,
        metadata={"provider": provider.provider, "name": provider.name},
    )

    await session.delete(provider)
    await session.commit()

    return {"data": {"id": id}}


@router.post("/{id}/test")
async def test_provider(
    id: str,
    session: AsyncSession = Depends(get_session),
    _user: User = Depends(require_admin),
) -> dict:
    result = await session.execute(
        select(ProviderConfig).where(ProviderConfig.id == id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise AppError("Provider not found", status_code=404, code="NOT_FOUND")

    try:
        api_key = decrypt_with_rotation(
            provider.api_key,
            settings.ENCRYPTION_SECRET,
            settings.ENCRYPTION_SECRET_PREVIOUS,
        )
    except Exception as exc:
        raise AppError(
            "Failed to decrypt API key", status_code=500, code="DECRYPTION_ERROR"
        ) from exc

    test_url = PROVIDER_TEST_URLS.get(provider.provider)
    if not test_url:
        raise AppError(
            f"Test not supported for provider: {provider.provider}",
            status_code=400,
            code="UNSUPPORTED_PROVIDER",
        )

    headers: dict[str, str] = {}
    if provider.provider == "anthropic":
        headers["x-api-key"] = api_key
        headers["anthropic-version"] = "2023-06-01"
    elif provider.provider == "google":
        test_url = f"{test_url}?key={api_key}"
    else:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(test_url, headers=headers)
            if resp.status_code >= 400:
                return {
                    "data": {
                        "success": False,
                        "status": resp.status_code,
                        "message": "API key validation failed",
                    }
                }
    except httpx.TimeoutException:
        return {
            "data": {
                "success": False,
                "message": "Request timed out",
            }
        }
    except httpx.RequestError as exc:
        return {
            "data": {
                "success": False,
                "message": f"Connection error: {exc!s}",
            }
        }

    return {"data": {"success": True, "message": "API key is valid"}}
