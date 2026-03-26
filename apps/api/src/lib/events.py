import json
from typing import Any

from src.redis import get_redis

CHANNEL = "raven:events"


async def publish(event_type: str, data: dict[str, Any]) -> None:
    redis = get_redis()
    payload = json.dumps({"type": event_type, "data": data})
    await redis.publish(CHANNEL, payload)


async def subscribe():
    redis = get_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe(CHANNEL)
    return pubsub
