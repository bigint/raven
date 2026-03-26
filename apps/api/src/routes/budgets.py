from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import require_admin, require_writer
from src.database import get_session
from src.lib.audit import audit_and_publish
from src.lib.errors import AppError
from src.models.budget import Budget
from src.models.user import User
from src.schemas.budget import BudgetCreate, BudgetResponse, BudgetUpdate

router = APIRouter(prefix="/v1/budgets", tags=["budgets"])


@router.get("/")
async def list_budgets(
    session: AsyncSession = Depends(get_session),
    _user: User = Depends(require_admin),
) -> dict:
    result = await session.execute(
        select(Budget).order_by(Budget.created_at.desc())
    )
    budgets = result.scalars().all()
    items = [
        BudgetResponse.model_validate(b).model_dump(by_alias=True) for b in budgets
    ]
    return {"data": items}


@router.post("/", status_code=201)
async def create_budget(
    body: BudgetCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_writer),
) -> dict:
    budget = Budget(
        entity_type=body.entity_type,
        entity_id=body.entity_id,
        limit_amount=body.limit_amount,
        period=body.period,
        alert_threshold=body.alert_threshold,
    )
    session.add(budget)

    await audit_and_publish(
        session,
        actor_id=user.id,
        resource_type="budget",
        action="created",
        resource_id=budget.id,
        metadata={
            "entityType": body.entity_type,
            "entityId": body.entity_id,
            "limitAmount": body.limit_amount,
        },
    )

    await session.commit()
    await session.refresh(budget)

    resp = BudgetResponse.model_validate(budget)
    return {"data": resp.model_dump(by_alias=True)}


@router.put("/{id}")
async def update_budget(
    id: str,
    body: BudgetUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_writer),
) -> dict:
    result = await session.execute(
        select(Budget).where(Budget.id == id)
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise AppError("Budget not found", status_code=404, code="NOT_FOUND")

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if value is not None:
            setattr(budget, field, value)

    await audit_and_publish(
        session,
        actor_id=user.id,
        resource_type="budget",
        action="updated",
        resource_id=budget.id,
        metadata={"fields": list(updates.keys())},
    )

    await session.commit()
    await session.refresh(budget)

    resp = BudgetResponse.model_validate(budget)
    return {"data": resp.model_dump(by_alias=True)}


@router.delete("/{id}")
async def delete_budget(
    id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_writer),
) -> dict:
    result = await session.execute(
        select(Budget).where(Budget.id == id)
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise AppError("Budget not found", status_code=404, code="NOT_FOUND")

    await audit_and_publish(
        session,
        actor_id=user.id,
        resource_type="budget",
        action="deleted",
        resource_id=budget.id,
        metadata={
            "entityType": budget.entity_type,
            "entityId": budget.entity_id,
        },
    )

    await session.delete(budget)
    await session.commit()

    return {"data": {"id": id}}
