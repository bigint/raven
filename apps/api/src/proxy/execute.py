import asyncio
import json
import logging
import time
from typing import Any

import litellm
from fastapi import Request
from fastapi.responses import JSONResponse, StreamingResponse
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.proxy.cache import store_cache
from src.proxy.last_used import update_last_used
from src.proxy.latency_tracker import update_metrics
from src.proxy.logger import log_request

logger = logging.getLogger("raven.proxy")


async def execute_streaming(
    request: Request,
    *,
    session: AsyncSession,
    redis: Redis,
    start_time: float,
    parsed_body: dict[str, Any],
    requested_model: str,
    provider_name: str,
    provider_config_id: str,
    decrypted_api_key: str,
    virtual_key_id: str,
    method: str,
    path: str,
    session_id: str | None,
    end_user: str | None,
    user_agent: str | None,
    guardrail_warnings: list[str],
    guardrail_matches: list,
    body_text: str | None,
) -> StreamingResponse:
    async def stream_generator():
        usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        try:
            response = await litellm.acompletion(
                model=f"{provider_name}/{requested_model}",
                messages=parsed_body.get("messages", []),
                stream=True,
                api_key=decrypted_api_key,
                timeout=120,
                num_retries=2,
                temperature=parsed_body.get("temperature"),
                max_tokens=parsed_body.get("max_tokens"),
                top_p=parsed_body.get("top_p"),
                stop=parsed_body.get("stop"),
                tools=parsed_body.get("tools"),
                tool_choice=parsed_body.get("tool_choice"),
                seed=parsed_body.get("seed"),
                frequency_penalty=parsed_body.get("frequency_penalty"),
                presence_penalty=parsed_body.get("presence_penalty"),
            )

            async for chunk in response:
                if await request.is_disconnected():
                    break
                chunk_json = chunk.model_dump_json(exclude_none=True)
                yield f"data: {chunk_json}\n\n"

                # Track usage from final chunk
                if hasattr(chunk, "usage") and chunk.usage:
                    usage = {
                        "prompt_tokens": chunk.usage.prompt_tokens or 0,
                        "completion_tokens": chunk.usage.completion_tokens or 0,
                        "total_tokens": chunk.usage.total_tokens or 0,
                    }

            yield "data: [DONE]\n\n"

        except Exception as e:
            error_data = {
                "error": {
                    "message": str(e),
                    "type": "proxy_error",
                    "code": "UPSTREAM_ERROR",
                }
            }
            yield f"data: {json.dumps(error_data)}\n\n"
            yield "data: [DONE]\n\n"

        finally:
            latency_ms = int((time.time() - start_time) * 1000)
            cost = _estimate_cost(requested_model, usage)
            asyncio.create_task(
                _finalize_log(
                    session=session,
                    redis=redis,
                    usage=usage,
                    cost=cost,
                    latency_ms=latency_ms,
                    virtual_key_id=virtual_key_id,
                    provider_name=provider_name,
                    provider_config_id=provider_config_id,
                    requested_model=requested_model,
                    method=method,
                    path=path,
                    status_code=200,
                    session_id=session_id,
                    end_user=end_user,
                    user_agent=user_agent,
                )
            )

    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    if guardrail_warnings:
        headers["X-Guardrail-Warnings"] = "; ".join(guardrail_warnings)

    return StreamingResponse(stream_generator(), headers=headers)


async def execute_buffered(
    *,
    session: AsyncSession,
    redis: Redis,
    start_time: float,
    parsed_body: dict[str, Any],
    requested_model: str,
    provider_name: str,
    provider_config_id: str,
    decrypted_api_key: str,
    virtual_key_id: str,
    method: str,
    path: str,
    session_id: str | None,
    end_user: str | None,
    user_agent: str | None,
    guardrail_warnings: list[str],
    guardrail_matches: list,
    body_text: str | None,
) -> JSONResponse:
    try:
        response = await litellm.acompletion(
            model=f"{provider_name}/{requested_model}",
            messages=parsed_body.get("messages", []),
            stream=False,
            api_key=decrypted_api_key,
            timeout=120,
            num_retries=2,
            temperature=parsed_body.get("temperature"),
            max_tokens=parsed_body.get("max_tokens"),
            top_p=parsed_body.get("top_p"),
            stop=parsed_body.get("stop"),
            tools=parsed_body.get("tools"),
            tool_choice=parsed_body.get("tool_choice"),
            seed=parsed_body.get("seed"),
            frequency_penalty=parsed_body.get("frequency_penalty"),
            presence_penalty=parsed_body.get("presence_penalty"),
        )

        response_json = response.model_dump_json(exclude_none=True)
        usage = {
            "prompt_tokens": response.usage.prompt_tokens or 0,
            "completion_tokens": response.usage.completion_tokens or 0,
            "total_tokens": response.usage.total_tokens or 0,
        }

        latency_ms = int((time.time() - start_time) * 1000)
        cost = _estimate_cost(requested_model, usage)

        asyncio.create_task(
            _finalize_log(
                session=session,
                redis=redis,
                usage=usage,
                cost=cost,
                latency_ms=latency_ms,
                virtual_key_id=virtual_key_id,
                provider_name=provider_name,
                provider_config_id=provider_config_id,
                requested_model=requested_model,
                method=method,
                path=path,
                status_code=200,
                session_id=session_id,
                end_user=end_user,
                user_agent=user_agent,
            )
        )

        # Cache non-streaming responses
        asyncio.create_task(
            store_cache(redis, provider_name, parsed_body, response_json)
        )

        headers = {"Content-Type": "application/json"}
        if guardrail_warnings:
            headers["X-Guardrail-Warnings"] = "; ".join(guardrail_warnings)

        return JSONResponse(content=json.loads(response_json), headers=headers)

    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        logger.error("Execution failed: %s", e)

        asyncio.create_task(
            _finalize_log(
                session=session,
                redis=redis,
                usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                cost=0,
                latency_ms=latency_ms,
                virtual_key_id=virtual_key_id,
                provider_name=provider_name,
                provider_config_id=provider_config_id,
                requested_model=requested_model,
                method=method,
                path=path,
                status_code=500,
                session_id=session_id,
                end_user=end_user,
                user_agent=user_agent,
            )
        )

        return JSONResponse(
            status_code=502,
            content={
                "error": {
                    "message": str(e),
                    "type": "proxy_error",
                    "code": "UPSTREAM_ERROR",
                }
            },
        )


def _estimate_cost(model: str, usage: dict[str, int]) -> float:
    try:
        return litellm.completion_cost(
            model=model,
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
        )
    except Exception:
        return 0.0


async def _finalize_log(
    *,
    session: AsyncSession,
    redis: Redis,
    usage: dict[str, int],
    cost: float,
    latency_ms: int,
    virtual_key_id: str,
    provider_name: str,
    provider_config_id: str,
    requested_model: str,
    method: str,
    path: str,
    status_code: int,
    session_id: str | None,
    end_user: str | None,
    user_agent: str | None,
) -> None:
    try:
        await log_request(
            session=session,
            virtual_key_id=virtual_key_id,
            provider=provider_name,
            provider_config_id=provider_config_id,
            model=requested_model,
            method=method,
            path=path,
            status_code=status_code,
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
            cost=cost,
            latency_ms=latency_ms,
            session_id=session_id,
            end_user=end_user,
            user_agent=user_agent,
        )
        await update_last_used(redis, virtual_key_id)
        await update_metrics(redis, provider_config_id, latency_ms, cost)
    except Exception:
        logger.exception("Failed to finalize request log")
