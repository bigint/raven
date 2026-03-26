from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import require_admin, require_writer
from src.database import get_session
from src.lib.audit import audit_and_publish
from src.lib.crypto import generate_key
from src.lib.errors import AppError
from src.models.key import VirtualKey
from src.models.user import User
from src.schemas.key import KeyCreate, KeyCreateResponse, KeyResponse, KeyUpdate

router = APIRouter(prefix="/v1/keys", tags=["keys"])


@router.get("/")
async def list_keys(
    session: AsyncSession = Depends(get_session),
    _user: User = Depends(require_admin),
) -> dict:
    result = await session.execute(
        select(VirtualKey).order_by(VirtualKey.created_at.desc())
    )
    keys = result.scalars().all()
    items = [KeyResponse.model_validate(k).model_dump(by_alias=True) for k in keys]
    return {"data": items}


@router.post("/", status_code=201)
async def create_key(
    body: KeyCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_writer),
) -> dict:
    key_data = generate_key(body.environment)

    virtual_key = VirtualKey(
        key_hash=key_data["hash"],
        key_prefix=key_data["prefix"],
        name=body.name,
        environment=body.environment,
        rate_limit_rpm=body.rate_limit_rpm,
        rate_limit_rpd=body.rate_limit_rpd,
        expires_at=body.expires_at,
    )
    session.add(virtual_key)

    await audit_and_publish(
        session,
        actor_id=user.id,
        resource_type="virtual_key",
        action="created",
        resource_id=virtual_key.id,
        metadata={"name": body.name, "environment": body.environment},
    )

    await session.commit()
    await session.refresh(virtual_key)

    resp = KeyCreateResponse.model_validate(virtual_key)
    data = resp.model_dump(by_alias=True)
    data["key"] = key_data["key"]
    return {"data": data}


@router.put("/{id}")
async def update_key(
    id: str,
    body: KeyUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_writer),
) -> dict:
    result = await session.execute(
        select(VirtualKey).where(VirtualKey.id == id)
    )
    key = result.scalar_one_or_none()
    if not key:
        raise AppError("Virtual key not found", status_code=404, code="NOT_FOUND")

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if value is not None:
            setattr(key, field, value)

    await audit_and_publish(
        session,
        actor_id=user.id,
        resource_type="virtual_key",
        action="updated",
        resource_id=key.id,
        metadata={"fields": list(updates.keys())},
    )

    await session.commit()
    await session.refresh(key)

    resp = KeyResponse.model_validate(key)
    return {"data": resp.model_dump(by_alias=True)}


@router.delete("/{id}")
async def delete_key(
    id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_writer),
) -> dict:
    result = await session.execute(
        select(VirtualKey).where(VirtualKey.id == id)
    )
    key = result.scalar_one_or_none()
    if not key:
        raise AppError("Virtual key not found", status_code=404, code="NOT_FOUND")

    await audit_and_publish(
        session,
        actor_id=user.id,
        resource_type="virtual_key",
        action="deleted",
        resource_id=key.id,
        metadata={"name": key.name, "environment": key.environment},
    )

    await session.delete(key)
    await session.commit()

    return {"data": {"id": id}}
