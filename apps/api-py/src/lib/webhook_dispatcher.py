import asyncio
import json
import time
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.lib.crypto import hmac_sha256
from src.models.webhook import Webhook
from src.redis import get_redis

CACHE_TTL = 30
MAX_CONCURRENT = 10
_semaphore = asyncio.Semaphore(MAX_CONCURRENT)


async def _get_webhooks(session: AsyncSession) -> list[Webhook]:
    redis = get_redis()
    cached = await redis.get("raven:webhooks:config")
    if cached:
        return json.loads(cached)

    result = await session.execute(
        select(Webhook).where(Webhook.is_enabled.is_(True))
    )
    hooks = result.scalars().all()
    data = [
        {"id": h.id, "url": h.url, "secret": h.secret, "events": h.events}
        for h in hooks
    ]
    await redis.set("raven:webhooks:config", json.dumps(data), ex=CACHE_TTL)
    return data


async def _deliver(url: str, payload: str, signature: str) -> None:
    async with _semaphore:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                url,
                content=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Raven-Signature": signature,
                },
            )


async def dispatch_webhook(
    session: AsyncSession,
    event_type: str,
    data: dict[str, Any],
) -> None:
    webhooks = await _get_webhooks(session)
    payload_dict = {
        "event": event_type,
        "data": data,
        "timestamp": int(time.time()),
    }

    tasks = []
    for hook in webhooks:
        if event_type not in hook["events"]:
            continue
        payload_dict["webhookId"] = hook["id"]
        payload = json.dumps(payload_dict)
        signature = hmac_sha256(payload, hook["secret"])
        tasks.append(_deliver(hook["url"], payload, signature))

    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
