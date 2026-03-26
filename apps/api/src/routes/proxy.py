from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_session
from src.proxy.pipeline import run_pipeline

router = APIRouter(tags=["proxy"])


async def _run(
    request: Request,
    db: AsyncSession,
    provider_path: str,
    upstream_path_override: str | None = None,
):
    auth_header = request.headers.get("authorization", "")
    method = request.method
    path = str(request.url.path)
    session_id = request.headers.get("x-session-id")
    user_agent = request.headers.get("user-agent")
    user_id_header = request.headers.get("x-user-id")

    body_bytes = await request.body()
    body_text = body_bytes.decode("utf-8") if body_bytes else None

    return await run_pipeline(
        request=request,
        session=db,
        auth_header=auth_header,
        method=method,
        path=path,
        body_text=body_text,
        session_id=session_id,
        user_agent=user_agent,
        user_id_header=user_id_header,
        provider_path=provider_path,
        upstream_path_override=upstream_path_override,
    )


@router.post("/v1/chat/completions")
async def chat_completions(
    request: Request,
    db: AsyncSession = Depends(get_session),
):
    return await _run(
        request,
        db,
        provider_path="openai",
        upstream_path_override="/v1/chat/completions",
    )


@router.api_route(
    "/v1/proxy/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
)
async def proxy_catch_all(
    request: Request,
    path: str,
    db: AsyncSession = Depends(get_session),
):
    return await _run(request, db, provider_path=path)
