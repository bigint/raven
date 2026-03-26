from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import require_admin, require_writer
from src.database import get_session
from src.lib.audit import audit_and_publish
from src.lib.errors import AppError
from src.models.routing_rule import RoutingRule
from src.models.user import User
from src.schemas.routing_rule import (
    RoutingRuleCreate,
    RoutingRuleResponse,
    RoutingRuleUpdate,
)

router = APIRouter(prefix="/v1/routing-rules", tags=["routing-rules"])


@router.get("/")
async def list_routing_rules(
    session: AsyncSession = Depends(get_session),
    _user: User = Depends(require_admin),
) -> dict:
    result = await session.execute(
        select(RoutingRule).order_by(RoutingRule.priority.desc())
    )
    rules = result.scalars().all()
    items = [
        RoutingRuleResponse.model_validate(r).model_dump(by_alias=True) for r in rules
    ]
    return {"data": items}


@router.post("/", status_code=201)
async def create_routing_rule(
    body: RoutingRuleCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_writer),
) -> dict:
    rule = RoutingRule(
        name=body.name,
        source_model=body.source_model,
        target_model=body.target_model,
        condition=body.condition,
        condition_value=body.condition_value,
        is_enabled=body.is_enabled,
        priority=body.priority,
    )
    session.add(rule)

    await audit_and_publish(
        session,
        actor_id=user.id,
        resource_type="routing_rule",
        action="created",
        resource_id=rule.id,
        metadata={"name": body.name, "sourceModel": body.source_model},
    )

    await session.commit()
    await session.refresh(rule)

    resp = RoutingRuleResponse.model_validate(rule)
    return {"data": resp.model_dump(by_alias=True)}


@router.put("/{id}")
async def update_routing_rule(
    id: str,
    body: RoutingRuleUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_writer),
) -> dict:
    result = await session.execute(
        select(RoutingRule).where(RoutingRule.id == id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise AppError("Routing rule not found", status_code=404, code="NOT_FOUND")

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if value is not None:
            setattr(rule, field, value)

    rule.updated_at = datetime.now(UTC)

    await audit_and_publish(
        session,
        actor_id=user.id,
        resource_type="routing_rule",
        action="updated",
        resource_id=rule.id,
        metadata={"fields": list(updates.keys())},
    )

    await session.commit()
    await session.refresh(rule)

    resp = RoutingRuleResponse.model_validate(rule)
    return {"data": resp.model_dump(by_alias=True)}


@router.delete("/{id}")
async def delete_routing_rule(
    id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_writer),
) -> dict:
    result = await session.execute(
        select(RoutingRule).where(RoutingRule.id == id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise AppError("Routing rule not found", status_code=404, code="NOT_FOUND")

    await audit_and_publish(
        session,
        actor_id=user.id,
        resource_type="routing_rule",
        action="deleted",
        resource_id=rule.id,
        metadata={"name": rule.name, "sourceModel": rule.source_model},
    )

    await session.delete(rule)
    await session.commit()

    return {"data": {"id": id}}
