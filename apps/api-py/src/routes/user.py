from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select

from src.auth.dependencies import get_current_user
from src.database import get_session
from src.models.user import User
from src.schemas.user import ProfileUpdate, UserResponse

router = APIRouter(prefix="/v1/user", tags=["user"])


@router.put("/profile")
async def update_profile(
    body: ProfileUpdate,
    current_user: User = Depends(get_current_user),
):
    async for db in get_session():
        result = await db.execute(select(User).where(User.id == current_user.id))
        user = result.scalar_one()

        user.name = body.name
        user.updated_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(user)

        return {
            "data": UserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                role=user.role.value if hasattr(user.role, "value") else user.role,
                avatarUrl=user.avatar_url,
                createdAt=user.created_at,
            ).model_dump(by_alias=True)
        }
