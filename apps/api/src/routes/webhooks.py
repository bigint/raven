import json
import secrets
import time
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import require_admin, require_writer
from src.database import get_session
from src.lib.audit import audit_and_publish
from src.lib.crypto import hmac_sha256
from src.lib.errors import AppError
from src.models.user import User
from src.models.webhook import Webhook
from src.schemas.webhook import (
    WebhookCreate,
    WebhookCreateResponse,
    WebhookResponse,
    WebhookUpdate,
)

router = APIRouter(prefix="/v1/webhooks", tags=["webhooks"])


def _mask_secret(secret: str) -> str:
    if len(secret) <= 8:
        return "***"
    return secret[:8] + "..."


@router.get("/")
async def list_webhooks(
    session: AsyncSession = Depends(get_session),
    _user: User = Depends(require_admin),
) -> dict:
    result = await session.execute(
        select(Webhook).order_by(Webhook.created_at.desc())
    )
    webhooks = result.scalars().all()

    items = []
    for w in webhooks:
        resp = WebhookResponse.model_validate(w)
        item = resp.model_dump(by_alias=True)
        item["secret"] = _mask_secret(w.secret)
        items.append(item)

    return {"data": items}


@router.post("/", status_code=201)
async def create_webhook(
    body: WebhookCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_writer),
) -> dict:
    webhook_secret = secrets.token_urlsafe(32)

    webhook = Webhook(
        url=body.url,
        secret=webhook_secret,
        events=body.events,
        is_enabled=body.is_enabled,
    )
    session.add(webhook)

    await audit_and_publish(
        session,
        actor_id=user.id,
        resource_type="webhook",
        action="created",
        resource_id=webhook.id,
        metadata={"url": body.url, "events": body.events},
    )

    await session.commit()
    await session.refresh(webhook)

    resp = WebhookCreateResponse.model_validate(webhook)
    return {"data": resp.model_dump(by_alias=True)}


@router.put("/{id}")
async def update_webhook(
    id: str,
    body: WebhookUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_writer),
) -> dict:
    result = await session.execute(
        select(Webhook).where(Webhook.id == id)
    )
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise AppError("Webhook not found", status_code=404, code="NOT_FOUND")

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if value is not None:
            setattr(webhook, field, value)

    webhook.updated_at = datetime.now(UTC)

    await audit_and_publish(
        session,
        actor_id=user.id,
        resource_type="webhook",
        action="updated",
        resource_id=webhook.id,
        metadata={"fields": list(updates.keys())},
    )

    await session.commit()
    await session.refresh(webhook)

    resp = WebhookResponse.model_validate(webhook)
    return {"data": resp.model_dump(by_alias=True)}


@router.delete("/{id}")
async def delete_webhook(
    id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_writer),
) -> dict:
    result = await session.execute(
        select(Webhook).where(Webhook.id == id)
    )
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise AppError("Webhook not found", status_code=404, code="NOT_FOUND")

    await audit_and_publish(
        session,
        actor_id=user.id,
        resource_type="webhook",
        action="deleted",
        resource_id=webhook.id,
        metadata={"url": webhook.url},
    )

    await session.delete(webhook)
    await session.commit()

    return {"data": {"id": id}}


@router.post("/test")
async def test_webhook(
    session: AsyncSession = Depends(get_session),
    _user: User = Depends(require_admin),
) -> dict:
    result = await session.execute(
        select(Webhook).where(Webhook.is_enabled.is_(True))
    )
    webhooks = result.scalars().all()

    if not webhooks:
        raise AppError("No active webhooks found", status_code=404, code="NOT_FOUND")

    test_payload = {
        "event": "webhook.test",
        "data": {"message": "This is a test webhook payload from Raven"},
        "timestamp": int(time.time()),
    }

    results = []
    for webhook in webhooks:
        payload_str = json.dumps({**test_payload, "webhookId": webhook.id})
        signature = hmac_sha256(payload_str, webhook.secret)

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    webhook.url,
                    content=payload_str,
                    headers={
                        "Content-Type": "application/json",
                        "X-Raven-Signature": signature,
                    },
                )
                results.append({
                    "webhookId": webhook.id,
                    "url": webhook.url,
                    "success": resp.status_code < 400,
                    "status": resp.status_code,
                })
        except httpx.RequestError as exc:
            results.append({
                "webhookId": webhook.id,
                "url": webhook.url,
                "success": False,
                "error": str(exc),
            })

    return {"data": results}
