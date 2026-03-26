from fastapi import APIRouter
from sqlalchemy import select

from src.database import get_session
from src.models.provider import ProviderConfig

router = APIRouter(prefix="/v1/models", tags=["models"])


@router.get("/")
async def list_models(provider: str | None = None):
    async for db in get_session():
        query = select(ProviderConfig).where(ProviderConfig.is_enabled.is_(True))

        if provider:
            query = query.where(ProviderConfig.provider == provider)

        result = await db.execute(query)
        configs = result.scalars().all()

        models = []
        for config in configs:
            for model in config.models:
                models.append({
                    "id": f"{config.provider}/{model}",
                    "model": model,
                    "provider": config.provider,
                    "providerConfigId": config.id,
                })

        return {"data": models, "object": "list"}
