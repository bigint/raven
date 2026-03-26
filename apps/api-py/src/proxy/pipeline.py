import asyncio
import json
import time
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.lib.errors import AppError
from src.proxy.auth import authenticate_key
from src.proxy.budget_check import check_budgets
from src.proxy.cache import check_cache, serve_cache_hit
from src.proxy.content_router import evaluate_routing_rules
from src.proxy.execute import execute_buffered, execute_streaming
from src.proxy.guardrails import evaluate_guardrails
from src.proxy.provider_resolver import parse_provider_from_path, resolve_provider
from src.proxy.rate_limiter import check_rate_limit
from src.redis import get_redis


async def run_pipeline(
    request: Request,
    session: AsyncSession,
    auth_header: str,
    method: str,
    path: str,
    body_text: str | None,
    session_id: str | None,
    user_agent: str | None,
    user_id_header: str | None,
    provider_path: str,
    upstream_path_override: str | None = None,
    skip_routing: bool = False,
):
    start_time = time.time()
    redis = get_redis()

    # 1. Auth
    virtual_key = await authenticate_key(session, auth_header, redis)

    # 2. Parse body
    parsed_body: dict[str, Any] = {}
    if body_text:
        try:
            parsed_body = json.loads(body_text)
        except json.JSONDecodeError:
            raise AppError("Invalid JSON body", 400, "INVALID_JSON")

    # 3. Model validation
    requested_model = parsed_body.get("model", "unknown")
    messages = parsed_body.get("messages", [])
    has_messages = isinstance(messages, list) and len(messages) > 0
    is_streaming = parsed_body.get("stream", False)

    # 4. Gate checks in parallel
    rpm = virtual_key.get("rate_limit_rpm")
    rpd = virtual_key.get("rate_limit_rpd")

    checks = [
        check_rate_limit(redis, virtual_key["id"], rpm, rpd),
        check_budgets(session, redis, virtual_key["id"]),
    ]
    if has_messages:
        checks.append(evaluate_guardrails(session, messages, redis))
    if not skip_routing and requested_model != "unknown":
        checks.append(evaluate_routing_rules(session, requested_model, parsed_body))

    results = await asyncio.gather(*checks, return_exceptions=True)

    for r in results:
        if isinstance(r, AppError):
            raise r
        if isinstance(r, Exception):
            raise r

    # Extract guardrail/routing results
    guardrail_result = results[2] if has_messages and len(results) > 2 else None
    routing_result = results[-1] if not skip_routing and requested_model != "unknown" else None

    guardrail_warnings = []
    guardrail_matches = []
    if guardrail_result and isinstance(guardrail_result, dict):
        guardrail_warnings = guardrail_result.get("warnings", [])
        guardrail_matches = guardrail_result.get("matches", [])

    if routing_result and isinstance(routing_result, dict) and routing_result.get("rule_applied"):
        parsed_body["model"] = routing_result["model"]
        requested_model = routing_result["model"]

    # 5. End-user identity
    end_user = (
        user_id_header
        or (parsed_body.get("user") if isinstance(parsed_body.get("user"), str) else None)
        or None
    )

    # 6. Cache + provider resolution
    provider_name = parse_provider_from_path(provider_path)
    cache_result, provider_resolution = await asyncio.gather(
        check_cache(redis, provider_name, parsed_body),
        resolve_provider(session, provider_path, redis),
    )

    decrypted_api_key = provider_resolution["api_key"]
    provider_config_id = provider_resolution["config_id"]
    resolved_path = upstream_path_override or provider_resolution.get("upstream_path", path)

    if cache_result.get("hit"):
        return serve_cache_hit(
            session=session,
            cache_result=cache_result,
            start_time=start_time,
            virtual_key_id=virtual_key["id"],
            provider_name=provider_name,
            provider_config_id=provider_config_id,
            model=requested_model,
            method=method,
            path=resolved_path,
            end_user=end_user,
            user_agent=user_agent,
            session_id=session_id,
            redis=redis,
            guardrail_warnings=guardrail_warnings,
        )

    # 7. Execute
    execute_ctx = {
        "session": session,
        "redis": redis,
        "start_time": start_time,
        "parsed_body": parsed_body,
        "requested_model": requested_model,
        "provider_name": provider_name,
        "provider_config_id": provider_config_id,
        "decrypted_api_key": decrypted_api_key,
        "virtual_key_id": virtual_key["id"],
        "method": method,
        "path": resolved_path,
        "session_id": session_id,
        "end_user": end_user,
        "user_agent": user_agent,
        "guardrail_warnings": guardrail_warnings,
        "guardrail_matches": guardrail_matches,
        "body_text": body_text,
    }

    if is_streaming:
        return await execute_streaming(request, **execute_ctx)
    return await execute_buffered(**execute_ctx)
