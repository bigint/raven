import re
from typing import Any

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.lib.errors import AppError
from src.models.guardrail import GuardrailAction, GuardrailRule


async def evaluate_guardrails(
    session: AsyncSession, messages: list[dict[str, Any]], redis: Redis
) -> dict | None:
    result = await session.execute(
        select(GuardrailRule)
        .where(GuardrailRule.is_enabled.is_(True))
        .order_by(GuardrailRule.priority.desc())
    )
    rules = result.scalars().all()

    if not rules:
        return None

    warnings: list[str] = []
    matches: list[dict] = []

    content_text = _extract_text(messages)

    for rule in rules:
        match = _evaluate_rule(rule, content_text)
        if match:
            matches.append({"rule_id": rule.id, "rule_name": rule.name, "type": rule.type.value})
            if rule.action == GuardrailAction.BLOCK:
                raise AppError(
                    f"Request blocked by guardrail: {rule.name}",
                    403,
                    "GUARDRAIL_BLOCKED",
                )
            elif rule.action == GuardrailAction.WARN:
                warnings.append(f"Guardrail warning: {rule.name}")

    return {"warnings": warnings, "matches": matches}


def _extract_text(messages: list[dict[str, Any]]) -> str:
    parts = []
    for msg in messages:
        content = msg.get("content", "")
        if isinstance(content, str):
            parts.append(content)
        elif isinstance(content, list):
            for part in content:
                if isinstance(part, dict) and part.get("type") == "text":
                    parts.append(part.get("text", ""))
    return " ".join(parts)


def _evaluate_rule(rule: GuardrailRule, text: str) -> bool:
    config = rule.config or {}
    rule_type = rule.type.value

    if rule_type == "custom_regex":
        pattern = config.get("pattern", "")
        if pattern and re.search(pattern, text, re.IGNORECASE):
            return True

    elif rule_type == "block_topics":
        topics = config.get("topics", [])
        text_lower = text.lower()
        for topic in topics:
            if topic.lower() in text_lower:
                return True

    elif rule_type == "content_filter":
        keywords = config.get("keywords", [])
        text_lower = text.lower()
        for kw in keywords:
            if kw.lower() in text_lower:
                return True

    elif rule_type == "pii_detection":
        patterns = config.get("patterns", [])
        for pattern in patterns:
            if re.search(pattern, text):
                return True

    return False
