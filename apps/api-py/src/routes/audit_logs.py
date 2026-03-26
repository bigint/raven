from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import require_admin
from src.database import get_session
from src.models.audit_log import AuditLog
from src.models.user import User

router = APIRouter(prefix="/v1/audit-logs", tags=["audit-logs"])

MAX_LIMIT = 200


@router.get("/")
async def list_audit_logs(
    session: AsyncSession = Depends(get_session),
    _user: User = Depends(require_admin),
    limit: int = 50,
    offset: int = 0,
) -> dict:
    limit = min(limit, MAX_LIMIT)

    stmt = (
        select(AuditLog, User.email, User.name)
        .outerjoin(User, AuditLog.actor_id == User.id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(stmt)
    rows = result.all()

    items = []
    for log, actor_email, actor_name in rows:
        items.append({
            "id": log.id,
            "action": log.action,
            "resourceType": log.resource_type,
            "resourceId": log.resource_id,
            "actorId": log.actor_id,
            "actorEmail": actor_email,
            "actorName": actor_name,
            "metadata": log.metadata_,
            "createdAt": log.created_at.isoformat(),
        })

    return {"data": items}
