import json
import logging
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.request_log import RequestLog
from src.redis import get_redis

logger = logging.getLogger("raven.proxy.logger")


async def log_request(
    *,
    session: AsyncSession,
    virtual_key_id: str,
    provider: str,
    provider_config_id: str,
    model: str,
    method: str,
    path: str,
    status_code: int,
    input_tokens: int = 0,
    output_tokens: int = 0,
    cached_tokens: int = 0,
    reasoning_tokens: int = 0,
    cost: float = 0,
    latency_ms: int = 0,
    cache_hit: bool = False,
    session_id: str | None = None,
    end_user: str | None = None,
    user_agent: str | None = None,
    request_body: str | None = None,
    response_body: str | None = None,
) -> None:
    try:
        log_entry = RequestLog(
            virtual_key_id=virtual_key_id,
            provider=provider,
            provider_config_id=provider_config_id,
            model=model,
            method=method,
            path=path,
            status_code=status_code,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cached_tokens=cached_tokens,
            reasoning_tokens=reasoning_tokens,
            cost=Decimal(str(cost)),
            latency_ms=latency_ms,
            cache_hit=cache_hit,
            session_id=session_id,
            end_user=end_user,
            user_agent=user_agent,
            request_body=request_body,
            response_body=response_body,
        )
        session.add(log_entry)
        await session.commit()

        # Publish event for real-time dashboard
        redis = get_redis()
        event_data = {
            "provider": provider,
            "model": model,
            "statusCode": status_code,
            "inputTokens": input_tokens,
            "outputTokens": output_tokens,
            "cost": cost,
            "latencyMs": latency_ms,
            "cacheHit": cache_hit,
        }
        await redis.publish("raven:events", json.dumps({"type": "request.completed", "data": event_data}))

    except Exception:
        logger.exception("Failed to log request")
