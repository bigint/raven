from datetime import UTC, datetime

from cuid2 import cuid_wrapper
from fastapi import APIRouter
from sqlalchemy import func, select

from src.auth.password import hash_password
from src.database import get_session
from src.lib.errors import AppError
from src.models.user import Account, PlatformRole, User
from src.schemas.setup import SetupComplete

router = APIRouter(prefix="/v1/setup", tags=["setup"])

cuid = cuid_wrapper()


@router.get("/status")
async def setup_status():
    async for db in get_session():
        result = await db.execute(select(func.count()).select_from(User))
        count = result.scalar_one()
        return {"data": {"needsSetup": count == 0}}


@router.post("/complete")
async def setup_complete(body: SetupComplete):
    async for db in get_session():
        result = await db.execute(select(func.count()).select_from(User))
        count = result.scalar_one()

        if count > 0:
            raise AppError(
                "Setup already completed", status_code=400, code="SETUP_COMPLETE"
            )

        now = datetime.now(UTC)
        user = User(
            id=cuid(),
            email=body.email,
            name=body.name,
            role=PlatformRole.ADMIN,
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

        return {"data": {"id": user.id, "email": user.email, "name": user.name}}
