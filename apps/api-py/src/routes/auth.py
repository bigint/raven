from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta

from cuid2 import cuid_wrapper
from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select

from src.auth.dependencies import COOKIE_NAME, get_current_user
from src.auth.password import hash_password, verify_password
from src.config import settings
from src.database import get_session
from src.lib.errors import AppError
from src.models.user import Account, PlatformRole, User, Verification
from src.models.user import Session as SessionModel
from src.redis import get_redis

router = APIRouter(prefix="/api/auth", tags=["auth"])

SESSION_MAX_AGE_DAYS = 30
RESET_TOKEN_EXPIRY_HOURS = 1

cuid = cuid_wrapper()


# --- Request / Response schemas ---


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class ForgetPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


class SessionResponse(BaseModel):
    user: UserResponse


# --- Helpers ---


def _cookie_kwargs() -> dict:
    return {
        "key": COOKIE_NAME,
        "httponly": True,
        "secure": settings.is_production,
        "samesite": "none" if settings.is_production else "lax",
        "path": "/",
        "max_age": SESSION_MAX_AGE_DAYS * 86400,
    }


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(value=token, **_cookie_kwargs())


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=True,
        secure=settings.is_production,
        samesite="none" if settings.is_production else "lax",
        path="/",
    )


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role.value if hasattr(user.role, "value") else user.role,
        avatar_url=user.avatar_url,
    )


async def _create_session(
    db, user: User, request: Request, response: Response
) -> str:
    token = secrets.token_urlsafe(32)
    now = datetime.now(UTC)
    session = SessionModel(
        id=cuid(),
        token=token,
        user_id=user.id,
        expires_at=now + timedelta(days=SESSION_MAX_AGE_DAYS),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        created_at=now,
        updated_at=now,
    )
    db.add(session)
    await db.commit()
    _set_session_cookie(response, token)
    return token


# --- Routes ---


@router.post("/sign-up/email")
async def sign_up_email(body: SignUpRequest, request: Request, response: Response):
    async for db in get_session():
        # Check if email already exists
        existing = await db.execute(select(User).where(User.email == body.email))
        if existing.scalar_one_or_none():
            raise AppError("Email already registered", status_code=409, code="EMAIL_EXISTS")

        # Determine role: first user gets admin
        user_count = await db.execute(select(func.count()).select_from(User))
        is_first_user = user_count.scalar_one() == 0

        now = datetime.now(UTC)
        user = User(
            id=cuid(),
            email=body.email,
            name=body.name,
            role=PlatformRole.ADMIN if is_first_user else PlatformRole.MEMBER,
            email_verified=False,
            created_at=now,
            updated_at=now,
        )
        db.add(user)
        await db.flush()

        account = Account(
            id=cuid(),
            user_id=user.id,
            provider_id="credential",
            account_id=body.email,
            password=hash_password(body.password),
            created_at=now,
            updated_at=now,
        )
        db.add(account)
        await db.commit()

        await _create_session(db, user, request, response)

        return SessionResponse(user=_user_response(user))


@router.post("/sign-in/email")
async def sign_in_email(body: SignInRequest, request: Request, response: Response):
    async for db in get_session():
        # Find user
        result = await db.execute(select(User).where(User.email == body.email))
        user = result.scalar_one_or_none()
        if not user:
            raise AppError(
                "Invalid email or password", status_code=401, code="INVALID_CREDENTIALS"
            )

        # Find credential account
        result = await db.execute(
            select(Account).where(
                Account.user_id == user.id,
                Account.provider_id == "credential",
            )
        )
        account = result.scalar_one_or_none()
        if not account or not account.password:
            raise AppError(
                "Invalid email or password", status_code=401, code="INVALID_CREDENTIALS"
            )

        if not verify_password(body.password, account.password):
            raise AppError(
                "Invalid email or password", status_code=401, code="INVALID_CREDENTIALS"
            )

        await _create_session(db, user, request, response)

        return SessionResponse(user=_user_response(user))


@router.post("/sign-out")
async def sign_out(request: Request, response: Response):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        _clear_session_cookie(response)
        return {"ok": True}

    # Delete session from DB
    async for db in get_session():
        result = await db.execute(select(SessionModel).where(SessionModel.token == token))
        session = result.scalar_one_or_none()
        if session:
            await db.delete(session)
            await db.commit()

    # Invalidate Redis cache
    redis = get_redis()
    await redis.delete(f"session:{token}")

    _clear_session_cookie(response)
    return {"ok": True}


@router.get("/session")
async def get_session_info(user: User = Depends(get_current_user)):
    return SessionResponse(user=_user_response(user))


@router.post("/forget-password")
async def forget_password(body: ForgetPasswordRequest):
    async for db in get_session():
        # Check if user exists (don't reveal whether email exists)
        result = await db.execute(select(User).where(User.email == body.email))
        user = result.scalar_one_or_none()
        if not user:
            # Return success even if user doesn't exist to prevent enumeration
            return {"ok": True}

        now = datetime.now(UTC)
        token = secrets.token_urlsafe(32)

        verification = Verification(
            id=cuid(),
            identifier=body.email,
            value=token,
            expires_at=now + timedelta(hours=RESET_TOKEN_EXPIRY_HOURS),
            created_at=now,
            updated_at=now,
        )
        db.add(verification)
        await db.commit()

        return {"ok": True}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest):
    async for db in get_session():
        now = datetime.now(UTC)

        # Find valid verification token
        result = await db.execute(
            select(Verification).where(
                Verification.value == body.token,
                Verification.expires_at > now,
            )
        )
        verification = result.scalar_one_or_none()
        if not verification:
            raise AppError(
                "Invalid or expired reset token", status_code=400, code="INVALID_TOKEN"
            )

        # Find user by identifier (email)
        result = await db.execute(
            select(User).where(User.email == verification.identifier)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise AppError("User not found", status_code=404, code="USER_NOT_FOUND")

        # Update password on credential account
        result = await db.execute(
            select(Account).where(
                Account.user_id == user.id,
                Account.provider_id == "credential",
            )
        )
        account = result.scalar_one_or_none()
        if not account:
            raise AppError("No credential account found", status_code=400, code="NO_CREDENTIAL")

        account.password = hash_password(body.password)
        account.updated_at = now

        # Delete the used verification token
        await db.delete(verification)
        await db.commit()

        # Invalidate all cached sessions for this user (security measure)
        redis = get_redis()
        result = await db.execute(
            select(SessionModel).where(SessionModel.user_id == user.id)
        )
        sessions = result.scalars().all()
        for session in sessions:
            await redis.delete(f"session:{session.token}")

        return {"ok": True}

