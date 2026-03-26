from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy import select

from src.database import get_session
from src.lib.errors import AppError
from src.models.invitation import Invitation

router = APIRouter(prefix="/v1/invitations", tags=["invitations"])


@router.get("/{token}")
async def validate_invitation(token: str):
    async for db in get_session():
        result = await db.execute(
            select(Invitation).where(
                Invitation.token == token,
                Invitation.accepted_at.is_(None),
            )
        )
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise AppError("Invitation not found", status_code=404, code="NOT_FOUND")

        if invitation.expires_at <= datetime.now(UTC):
            raise AppError("Invitation expired", status_code=400, code="EXPIRED")

        role = invitation.role.value if hasattr(invitation.role, "value") else invitation.role
        return {"data": {"email": invitation.email, "role": role}}


@router.post("/{token}/accept")
async def accept_invitation(token: str):
    async for db in get_session():
        result = await db.execute(
            select(Invitation).where(
                Invitation.token == token,
                Invitation.accepted_at.is_(None),
            )
        )
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise AppError("Invitation not found", status_code=404, code="NOT_FOUND")

        if invitation.expires_at <= datetime.now(UTC):
            raise AppError("Invitation expired", status_code=400, code="EXPIRED")

        invitation.accepted_at = datetime.now(UTC)
        await db.commit()

        return {"data": {"email": invitation.email, "accepted": True}}
