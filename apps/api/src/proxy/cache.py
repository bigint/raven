import hashlib
import json
from typing import Any

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

DEFAULT_TTL_SECONDS = 3600


def _build_cache_key(provider: str, model: str, body: dict[str, Any]) -> str:
    content = body.get("messages") or body.get("input") or []
    temperature = body.get("temperature")
    system = body.get("system")
    tools = body.get("tools")
    parts = [provider, model, json.dumps(content), str(temperature)]
    parts.extend([json.dumps(system), json.dumps(tools)])
    payload = ":".join(parts)
    hash_hex = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return f"cache:resp:{hash_hex}"


async def check_cache(
    redis: Redis, provider: str, request_body: dict[str, Any]
) -> dict:
    if request_body.get("stream") is True:
        return {"hit": False}

    model = request_body.get("model", "unknown")
    key = _build_cache_key(provider, model, request_body)
    cached = await redis.get(key)

    if not cached:
        return {"hit": False}

    try:
        parsed = json.loads(cached)
    except (json.JSONDecodeError, TypeError):
        parsed = {}

    return {"hit": True, "body": cached, "parsed": parsed}


async def store_cache(
    redis: Redis,
    provider: str,
    request_body: dict[str, Any],
    response_body: str,
    ttl_seconds: int = DEFAULT_TTL_SECONDS,
) -> None:
    if request_body.get("stream") is True:
        return

    model = request_body.get("model", "unknown")
    key = _build_cache_key(provider, model, request_body)
    await redis.set(key, response_body, ex=ttl_seconds)


def serve_cache_hit(
    *,
    session: AsyncSession,
    cache_result: dict,
    start_time: float,
    virtual_key_id: str,
    provider_name: str,
    provider_config_id: str,
    model: str,
    method: str,
    path: str,
    end_user: str | None,
    user_agent: str | None,
    session_id: str | None,
    redis: Redis,
    guardrail_warnings: list[str],
):
    from fastapi.responses import Response

    headers = {"Content-Type": "application/json"}
    if guardrail_warnings:
        headers["X-Guardrail-Warnings"] = "; ".join(guardrail_warnings)

    return Response(
        content=cache_result["body"],
        status_code=200,
        headers=headers,
    )
