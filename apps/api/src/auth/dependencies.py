from __future__ import annotations

import json
from datetime import UTC, datetime

from fastapi import Depends, Request
from sqlalchemy import select

from src.database import get_session
from src.lib.errors import AppError
from src.models.user import Session as SessionModel
from src.models.user import User
from src.redis import get_redis

COOKIE_NAME = "raven_session"
SESSION_CACHE_TTL = 300  # 5 minutes


async def get_current_user(request: Request) -> User:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise AppError("Not authenticated", status_code=401, code="UNAUTHORIZED")

    redis = get_redis()
    cache_key = f"session:{token}"

    # Check Redis cache first
    cached = await redis.get(cache_key)
    if cached:
        cached_data = json.loads(cached)
        # Verify expiration even for cached sessions
        expires_at = datetime.fromisoformat(cached_data["expires_at"])
        if expires_at <= datetime.now(UTC):
            await redis.delete(cache_key)
            raise AppError("Session expired", status_code=401, code="SESSION_EXPIRED")

        # Reconstruct user from cached data
        user = User()
        user.id = cached_data["user_id"]
        user.email = cached_data["email"]
        user.name = cached_data["name"]
        user.role = cached_data["role"]
        user.avatar_url = cached_data.get("avatar_url")
        user.email_verified = cached_data["email_verified"]
        user.created_at = datetime.fromisoformat(cached_data["created_at"])
        user.updated_at = datetime.fromisoformat(cached_data["updated_at"])
        return user

    # Look up session in database
    async for db in get_session():
        result = await db.execute(
            select(SessionModel).where(SessionModel.token == token)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise AppError("Invalid session", status_code=401, code="INVALID_SESSION")

        if session.expires_at <= datetime.now(UTC):
            await db.delete(session)
            await db.commit()
            raise AppError("Session expired", status_code=401, code="SESSION_EXPIRED")

        result = await db.execute(
            select(User).where(User.id == session.user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise AppError("User not found", status_code=401, code="USER_NOT_FOUND")

        # Cache session data in Redis
        cache_data = {
            "user_id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role.value if hasattr(user.role, "value") else user.role,
            "avatar_url": user.avatar_url,
            "email_verified": user.email_verified,
            "created_at": user.created_at.isoformat(),
            "updated_at": user.updated_at.isoformat(),
            "expires_at": session.expires_at.isoformat(),
        }
        await redis.set(cache_key, json.dumps(cache_data), ex=SESSION_CACHE_TTL)

        return user

    raise AppError("Not authenticated", status_code=401, code="UNAUTHORIZED")


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise AppError("Admin access required", status_code=403, code="FORBIDDEN")
    return user


async def require_writer(user: User = Depends(get_current_user)) -> User:
    if user.role == "viewer":
        raise AppError("Write access required", status_code=403, code="FORBIDDEN")
    return user
