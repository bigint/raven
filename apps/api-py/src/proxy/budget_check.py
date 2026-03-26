from decimal import Decimal

from redis.asyncio import Redis
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.lib.errors import AppError
from src.models.budget import Budget, BudgetPeriod
from src.models.request_log import RequestLog


async def check_budgets(
    session: AsyncSession, redis: Redis, key_id: str
) -> None:
    result = await session.execute(select(Budget))
    budgets = result.scalars().all()

    for budget in budgets:
        if budget.entity_type.value == "key" and budget.entity_id != key_id:
            continue

        cache_key = f"raven:budget:spend:{budget.id}"
        cached_spend = await redis.get(cache_key)

        if cached_spend is not None:
            current_spend = Decimal(cached_spend)
        else:
            stmt = select(func.coalesce(func.sum(RequestLog.cost), 0))
            if budget.entity_type.value == "key":
                stmt = stmt.where(RequestLog.virtual_key_id == budget.entity_id)

            if budget.period == BudgetPeriod.DAILY:
                stmt = stmt.where(
                    RequestLog.created_at >= func.date_trunc("day", func.now())
                )
            else:
                stmt = stmt.where(
                    RequestLog.created_at >= func.date_trunc("month", func.now())
                )

            spend_result = await session.execute(stmt)
            current_spend = Decimal(str(spend_result.scalar()))
            await redis.set(cache_key, str(current_spend), ex=300)

        if current_spend >= budget.limit_amount:
            raise AppError(
                f"Budget limit of ${budget.limit_amount} exceeded",
                429,
                "BUDGET_EXCEEDED",
            )
