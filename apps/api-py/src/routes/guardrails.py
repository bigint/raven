from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import require_admin, require_writer
from src.database import get_session
from src.lib.audit import audit_and_publish
from src.lib.errors import AppError
from src.models.guardrail import GuardrailRule
from src.models.user import User
from src.schemas.guardrail import GuardrailCreate, GuardrailResponse, GuardrailUpdate

router = APIRouter(prefix="/v1/guardrails", tags=["guardrails"])


@router.get("/")
async def list_guardrails(
    session: AsyncSession = Depends(get_session),
    _user: User = Depends(require_admin),
) -> dict:
    result = await session.execute(
        select(GuardrailRule).order_by(GuardrailRule.priority.desc())
    )
    rules = result.scalars().all()
    items = [
        GuardrailResponse.model_validate(r).model_dump(by_alias=True) for r in rules
    ]
    return {"data": items}


@router.post("/", status_code=201)
async def create_guardrail(
    body: GuardrailCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_writer),
) -> dict:
    rule = GuardrailRule(
        name=body.name,
        type=body.type,
        config=body.config,
        action=body.action,
        is_enabled=body.is_enabled,
        priority=body.priority,
    )
    session.add(rule)

    await audit_and_publish(
        session,
        actor_id=user.id,
        resource_type="guardrail",
        action="created",
        resource_id=rule.id,
        metadata={"name": body.name, "type": body.type},
    )

    await session.commit()
    await session.refresh(rule)

    resp = GuardrailResponse.model_validate(rule)
    return {"data": resp.model_dump(by_alias=True)}


@router.put("/{id}")
async def update_guardrail(
    id: str,
    body: GuardrailUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_writer),
) -> dict:
    result = await session.execute(
        select(GuardrailRule).where(GuardrailRule.id == id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise AppError("Guardrail not found", status_code=404, code="NOT_FOUND")

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if value is not None:
            setattr(rule, field, value)

    rule.updated_at = datetime.now(UTC)

    await audit_and_publish(
        session,
        actor_id=user.id,
        resource_type="guardrail",
        action="updated",
        resource_id=rule.id,
        metadata={"fields": list(updates.keys())},
    )

    await session.commit()
    await session.refresh(rule)

    resp = GuardrailResponse.model_validate(rule)
    return {"data": resp.model_dump(by_alias=True)}


@router.delete("/{id}")
async def delete_guardrail(
    id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_writer),
) -> dict:
    result = await session.execute(
        select(GuardrailRule).where(GuardrailRule.id == id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise AppError("Guardrail not found", status_code=404, code="NOT_FOUND")

    await audit_and_publish(
        session,
        actor_id=user.id,
        resource_type="guardrail",
        action="deleted",
        resource_id=rule.id,
        metadata={"name": rule.name, "type": rule.type},
    )

    await session.delete(rule)
    await session.commit()

    return {"data": {"id": id}}
