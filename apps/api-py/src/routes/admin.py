import secrets
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from cuid2 import cuid_wrapper
from fastapi import APIRouter, Depends
from sqlalchemy import func, select

from src.auth.dependencies import require_admin
from src.database import get_session
from src.lib.audit import audit_and_publish
from src.lib.errors import AppError
from src.lib.instance_settings import (
    DEFAULT_SETTINGS,
    get_instance_settings,
    get_public_settings,
    invalidate_settings_cache,
)
from src.models.audit_log import AuditLog
from src.models.invitation import Invitation
from src.models.key import VirtualKey
from src.models.provider import ProviderConfig
from src.models.request_log import RequestLog
from src.models.setting import Setting
from src.models.user import PlatformRole, User
from src.redis import get_redis
from src.schemas.admin import InvitationCreate, SettingsUpdate, UserRoleUpdate

router = APIRouter(prefix="/v1/admin", tags=["admin"])

cuid = cuid_wrapper()

VALID_SETTING_KEYS = set(DEFAULT_SETTINGS.keys())


# --- Settings ---


@router.get("/settings")
async def get_settings(
    _user: User = Depends(require_admin),
):
    redis = get_redis()
    async for db in get_session():
        all_settings = await get_instance_settings(db, redis)
        return {"data": all_settings}


@router.put("/settings")
async def update_settings(
    body: SettingsUpdate,
    user: User = Depends(require_admin),
):
    updates = body.model_dump(exclude_unset=True)
    invalid_keys = set(updates.keys()) - VALID_SETTING_KEYS
    if invalid_keys:
        raise AppError(
            f"Invalid setting keys: {', '.join(sorted(invalid_keys))}",
            status_code=400,
            code="INVALID_SETTINGS",
        )

    redis = get_redis()
    async for db in get_session():
        for key, value in updates.items():
            result = await db.execute(select(Setting).where(Setting.key == key))
            existing = result.scalar_one_or_none()

            if existing:
                existing.value = str(value)
                existing.updated_at = datetime.now(UTC)
            else:
                setting = Setting(
                    key=key,
                    value=str(value),
                    updated_at=datetime.now(UTC),
                )
                db.add(setting)

        await audit_and_publish(
            db,
            actor_id=user.id,
            resource_type="settings",
            action="updated",
            resource_id="instance",
            metadata={"keys": list(updates.keys())},
        )
        await db.commit()
        await invalidate_settings_cache(redis)

        all_settings = await get_instance_settings(db, redis)
        return {"data": all_settings}


@router.get("/settings/public")
async def get_public_settings_route():
    redis = get_redis()
    async for db in get_session():
        public = await get_public_settings(db, redis)
        return {"data": public}


# --- Users ---


@router.get("/users")
async def list_users(
    page: int = 1,
    limit: int = 50,
    _user: User = Depends(require_admin),
):
    async for db in get_session():
        count_result = await db.execute(select(func.count()).select_from(User))
        total = count_result.scalar_one()

        offset = (page - 1) * limit
        result = await db.execute(
            select(User)
            .order_by(User.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        users = result.scalars().all()

        data = [
            {
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "role": u.role.value if hasattr(u.role, "value") else u.role,
                "avatarUrl": u.avatar_url,
                "createdAt": u.created_at.isoformat(),
            }
            for u in users
        ]

        return {
            "data": data,
            "total": total,
            "page": page,
            "pageSize": limit,
            "hasNext": (page * limit) < total,
            "hasPrevious": page > 1,
        }


@router.patch("/users/{user_id}")
async def update_user_role(
    user_id: str,
    body: UserRoleUpdate,
    current_user: User = Depends(require_admin),
):
    valid_roles = {r.value for r in PlatformRole}
    if body.role not in valid_roles:
        raise AppError(
            f"Invalid role. Must be one of: {', '.join(sorted(valid_roles))}",
            status_code=400,
            code="INVALID_ROLE",
        )

    async for db in get_session():
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise AppError("User not found", status_code=404, code="NOT_FOUND")

        user.role = PlatformRole(body.role)
        user.updated_at = datetime.now(UTC)

        await audit_and_publish(
            db,
            actor_id=current_user.id,
            resource_type="user",
            action="role_updated",
            resource_id=user_id,
            metadata={"role": body.role},
        )
        await db.commit()

        return {
            "data": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role.value if hasattr(user.role, "value") else user.role,
            }
        }


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_admin),
):
    if user_id == current_user.id:
        raise AppError("Cannot delete yourself", status_code=400, code="SELF_DELETE")

    async for db in get_session():
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise AppError("User not found", status_code=404, code="NOT_FOUND")

        await audit_and_publish(
            db,
            actor_id=current_user.id,
            resource_type="user",
            action="deleted",
            resource_id=user_id,
            metadata={"email": user.email},
        )

        await db.delete(user)
        await db.commit()

        return {"data": {"id": user_id, "deleted": True}}


# --- Invitations ---


@router.get("/invitations")
async def list_invitations(
    _user: User = Depends(require_admin),
):
    async for db in get_session():
        result = await db.execute(
            select(Invitation)
            .where(Invitation.accepted_at.is_(None))
            .order_by(Invitation.created_at.desc())
        )
        invitations = result.scalars().all()

        data = [
            {
                "id": inv.id,
                "email": inv.email,
                "role": inv.role.value if hasattr(inv.role, "value") else inv.role,
                "token": inv.token,
                "invitedBy": inv.invited_by,
                "expiresAt": inv.expires_at.isoformat(),
                "createdAt": inv.created_at.isoformat(),
            }
            for inv in invitations
        ]

        return {"data": data}


@router.post("/invitations")
async def create_invitation(
    body: InvitationCreate,
    current_user: User = Depends(require_admin),
):
    async for db in get_session():
        existing = await db.execute(
            select(Invitation).where(
                Invitation.email == body.email,
                Invitation.accepted_at.is_(None),
            )
        )
        if existing.scalar_one_or_none():
            raise AppError(
                "Invitation already exists for this email",
                status_code=409,
                code="DUPLICATE",
            )

        token = secrets.token_urlsafe(32)
        now = datetime.now(UTC)

        invitation = Invitation(
            id=cuid(),
            email=body.email,
            token=token,
            role=PlatformRole(body.role),
            invited_by=current_user.id,
            expires_at=now + timedelta(days=7),
            created_at=now,
        )
        db.add(invitation)

        await audit_and_publish(
            db,
            actor_id=current_user.id,
            resource_type="invitation",
            action="created",
            resource_id=invitation.id,
            metadata={"email": body.email, "role": body.role},
        )
        await db.commit()

        return {
            "data": {
                "id": invitation.id,
                "email": invitation.email,
                "token": invitation.token,
                "role": (
                    invitation.role.value
                    if hasattr(invitation.role, "value")
                    else invitation.role
                ),
                "expiresAt": invitation.expires_at.isoformat(),
            }
        }


@router.delete("/invitations/{invitation_id}")
async def revoke_invitation(
    invitation_id: str,
    current_user: User = Depends(require_admin),
):
    async for db in get_session():
        result = await db.execute(
            select(Invitation).where(Invitation.id == invitation_id)
        )
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise AppError("Invitation not found", status_code=404, code="NOT_FOUND")

        await audit_and_publish(
            db,
            actor_id=current_user.id,
            resource_type="invitation",
            action="revoked",
            resource_id=invitation_id,
            metadata={"email": invitation.email},
        )

        await db.delete(invitation)
        await db.commit()

        return {"data": {"id": invitation_id, "deleted": True}}


# --- Stats ---


@router.get("/stats")
async def get_stats(
    _user: User = Depends(require_admin),
):
    async for db in get_session():
        thirty_days_ago = datetime.now(UTC) - timedelta(days=30)

        user_count = await db.execute(select(func.count()).select_from(User))
        total_users = user_count.scalar_one()

        provider_count = await db.execute(
            select(func.count()).select_from(ProviderConfig)
            .where(ProviderConfig.is_enabled.is_(True))
        )
        total_providers = provider_count.scalar_one()

        key_count = await db.execute(
            select(func.count()).select_from(VirtualKey)
            .where(VirtualKey.is_active.is_(True))
        )
        total_keys = key_count.scalar_one()

        request_stats = await db.execute(
            select(
                func.count().label("total"),
                func.coalesce(func.sum(RequestLog.cost), Decimal("0")).label("cost"),
                func.coalesce(
                    func.sum(RequestLog.input_tokens + RequestLog.output_tokens), 0
                ).label("tokens"),
                func.coalesce(func.avg(RequestLog.latency_ms), 0).label("avg_latency"),
                func.count().filter(RequestLog.cache_hit.is_(True)).label("cache_hits"),
            ).where(RequestLog.created_at >= thirty_days_ago)
        )
        stats = request_stats.one()

        return {
            "data": {
                "totalUsers": total_users,
                "totalRequests": stats.total,
                "totalCost": float(stats.cost),
                "totalTokens": stats.tokens,
                "totalProviders": total_providers,
                "totalKeys": total_keys,
                "cacheHits": stats.cache_hits,
                "avgLatencyMs": round(float(stats.avg_latency), 2),
            }
        }


# --- Audit Logs ---


@router.get("/audit-logs")
async def list_audit_logs(
    _user: User = Depends(require_admin),
):
    async for db in get_session():
        result = await db.execute(
            select(AuditLog, User.name, User.email)
            .outerjoin(User, AuditLog.actor_id == User.id)
            .order_by(AuditLog.created_at.desc())
            .limit(50)
        )
        rows = result.all()

        data = [
            {
                "id": log.id,
                "action": log.action,
                "resourceType": log.resource_type,
                "resourceId": log.resource_id,
                "actorId": log.actor_id,
                "actorName": name,
                "actorEmail": email,
                "metadata": log.metadata_,
                "createdAt": log.created_at.isoformat(),
            }
            for log, name, email in rows
        ]

        return {"data": data}
