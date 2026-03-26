import json
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import select

from src.auth.dependencies import get_current_user
from src.database import get_session
from src.models.provider import ProviderConfig
from src.models.user import User

router = APIRouter(tags=["models"])

_catalog_path = Path(__file__).resolve().parent.parent / "model_catalog.json"
_catalog: list[dict] = []
if _catalog_path.exists():
    _catalog = json.loads(_catalog_path.read_text())


@router.get("/v1/models")
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


@router.get("/v1/available-models")
async def list_available_models(
    _user: User = Depends(get_current_user),
):
    async for db in get_session():
        result = await db.execute(
            select(ProviderConfig.provider)
            .where(ProviderConfig.is_enabled.is_(True))
            .distinct()
        )
        enabled_providers = {row[0] for row in result.all()}

        filtered = [m for m in _catalog if m.get("provider") in enabled_providers]
        return {"data": filtered}
