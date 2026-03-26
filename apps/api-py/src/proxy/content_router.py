from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.routing_rule import RoutingRule


async def evaluate_routing_rules(
    session: AsyncSession, model: str, body: dict[str, Any]
) -> dict | None:
    result = await session.execute(
        select(RoutingRule)
        .where(
            RoutingRule.is_enabled.is_(True),
            RoutingRule.source_model == model,
        )
        .order_by(RoutingRule.priority.desc())
    )
    rules = result.scalars().all()

    for rule in rules:
        if _matches_condition(rule, body):
            return {
                "rule_applied": True,
                "model": rule.target_model,
                "rule_id": rule.id,
                "rule_name": rule.name,
            }

    return None


def _matches_condition(rule: RoutingRule, body: dict[str, Any]) -> bool:
    condition = rule.condition
    value = rule.condition_value

    if condition == "always":
        return True
    if condition == "has_tools":
        return bool(body.get("tools"))
    if condition == "has_images":
        messages = body.get("messages", [])
        for msg in messages:
            content = msg.get("content", "")
            if isinstance(content, list):
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "image_url":
                        return True
    if condition == "max_tokens_gt":
        max_tokens = body.get("max_tokens", 0)
        return isinstance(max_tokens, int) and max_tokens > int(value)

    return False
