from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.audit_log import AuditLog
from src.redis import publish_event


async def audit_and_publish(
    session: AsyncSession,
    actor_id: str | None,
    resource_type: str,
    action: str,
    resource_id: str,
    metadata: dict[str, Any] | None = None,
    data: dict[str, Any] | None = None,
) -> None:
    log = AuditLog(
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        actor_id=actor_id,
        metadata_=metadata,
    )
    session.add(log)
    await session.flush()

    event_data: dict[str, Any] = {
        "resourceType": resource_type,
        "resourceId": resource_id,
        "action": action,
    }
    if data:
        event_data["data"] = data

    await publish_event(f"{resource_type}.{action}", event_data)
