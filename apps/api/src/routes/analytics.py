import asyncio
import json
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import case, desc, distinct, func, select, update

from src.auth.dependencies import get_current_user
from src.database import get_session
from src.lib.errors import AppError
from src.lib.events import subscribe
from src.models.request_log import RequestLog
from src.models.user import User
from src.redis import get_redis

router = APIRouter(prefix="/v1/analytics", tags=["analytics"])

CACHE_SHORT = 30
CACHE_MEDIUM = 60


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _default_range() -> tuple[datetime, datetime]:
    now = datetime.now(UTC)
    return now - timedelta(days=30), now


async def _cached_or_compute(
    cache_key: str,
    ttl: int,
    compute,
):
    redis = get_redis()
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)
    result = await compute()
    await redis.set(cache_key, json.dumps(result, default=str), ex=ttl)
    return result


# --- Stats ---


@router.get("/stats")
async def get_stats(
    _user: User = Depends(get_current_user),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
):
    start = _parse_date(from_date)
    end = _parse_date(to_date)
    if not start or not end:
        start, end = _default_range()

    cache_key = f"raven:analytics:stats:{start.date()}:{end.date()}"

    async def compute():
        async for db in get_session():
            result = await db.execute(
                select(
                    func.count().label("total_requests"),
                    func.coalesce(func.sum(RequestLog.cost), Decimal("0")).label(
                        "total_cost"
                    ),
                    func.coalesce(
                        func.sum(
                            RequestLog.input_tokens + RequestLog.output_tokens
                        ),
                        0,
                    ).label("total_tokens"),
                    func.coalesce(func.avg(RequestLog.latency_ms), 0).label(
                        "avg_latency"
                    ),
                    func.count()
                    .filter(RequestLog.cache_hit.is_(True))
                    .label("cache_hits"),
                    func.count()
                    .filter(RequestLog.status_code >= 400)
                    .label("errors"),
                ).where(
                    RequestLog.created_at >= start,
                    RequestLog.created_at <= end,
                )
            )
            row = result.one()
            total = row.total_requests or 0
            cache_hits = row.cache_hits or 0
            errors = row.errors or 0

            return {
                "totalRequests": total,
                "totalCost": float(row.total_cost),
                "totalTokens": row.total_tokens,
                "avgLatencyMs": round(float(row.avg_latency), 2),
                "cacheHitRate": round(cache_hits / total, 4) if total > 0 else 0,
                "errorRate": round(errors / total, 4) if total > 0 else 0,
            }
        return {}

    data = await _cached_or_compute(cache_key, CACHE_SHORT, compute)
    return {"data": data}


# --- Usage ---


@router.get("/usage")
async def get_usage(
    _user: User = Depends(get_current_user),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
):
    start = _parse_date(from_date)
    end = _parse_date(to_date)
    if not start or not end:
        start, end = _default_range()

    cache_key = f"raven:analytics:usage:{start.date()}:{end.date()}"

    async def compute():
        async for db in get_session():
            result = await db.execute(
                select(
                    func.date_trunc("day", RequestLog.created_at).label("day"),
                    func.count().label("requests"),
                    func.coalesce(
                        func.sum(
                            RequestLog.input_tokens + RequestLog.output_tokens
                        ),
                        0,
                    ).label("tokens"),
                    func.coalesce(func.sum(RequestLog.cost), Decimal("0")).label(
                        "cost"
                    ),
                )
                .where(
                    RequestLog.created_at >= start,
                    RequestLog.created_at <= end,
                )
                .group_by("day")
                .order_by("day")
            )
            rows = result.all()

            total_requests = 0
            total_tokens = 0
            total_cost = Decimal("0")
            data_points = []

            for row in rows:
                total_requests += row.requests
                total_tokens += row.tokens
                total_cost += row.cost
                data_points.append({
                    "date": row.day.date().isoformat(),
                    "requests": row.requests,
                    "tokens": row.tokens,
                    "cost": float(row.cost),
                })

            return {
                "data": data_points,
                "totalRequests": total_requests,
                "totalTokens": total_tokens,
                "totalCost": float(total_cost),
            }
        return {}

    data = await _cached_or_compute(cache_key, CACHE_SHORT, compute)
    return data


# --- Cache ---


@router.get("/cache")
async def get_cache_stats(
    _user: User = Depends(get_current_user),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
):
    start = _parse_date(from_date)
    end = _parse_date(to_date)
    if not start or not end:
        start, end = _default_range()

    cache_key = f"raven:analytics:cache:{start.date()}:{end.date()}"

    async def compute():
        async for db in get_session():
            result = await db.execute(
                select(
                    func.count().label("total"),
                    func.count()
                    .filter(RequestLog.cache_hit.is_(True))
                    .label("hits"),
                    func.coalesce(
                        func.sum(
                            case(
                                (
                                    RequestLog.cache_hit.is_(True),
                                    RequestLog.cached_tokens,
                                ),
                                else_=0,
                            )
                        ),
                        0,
                    ).label("tokens_saved"),
                    func.coalesce(
                        func.sum(
                            case(
                                (
                                    RequestLog.cache_hit.is_(True),
                                    RequestLog.cost,
                                ),
                                else_=Decimal("0"),
                            )
                        ),
                        Decimal("0"),
                    ).label("cost_saved"),
                ).where(
                    RequestLog.created_at >= start,
                    RequestLog.created_at <= end,
                )
            )
            row = result.one()
            total = row.total or 0
            hits = row.hits or 0

            daily_result = await db.execute(
                select(
                    func.date_trunc("day", RequestLog.created_at).label("day"),
                    func.count().label("total"),
                    func.count()
                    .filter(RequestLog.cache_hit.is_(True))
                    .label("hits"),
                )
                .where(
                    RequestLog.created_at >= start,
                    RequestLog.created_at <= end,
                )
                .group_by("day")
                .order_by("day")
            )
            daily_rows = daily_result.all()

            breakdown = [
                {
                    "date": d.day.date().isoformat(),
                    "total": d.total,
                    "hits": d.hits,
                    "rate": round(d.hits / d.total, 4) if d.total > 0 else 0,
                }
                for d in daily_rows
            ]

            return {
                "totalRequests": total,
                "cacheHits": hits,
                "cacheHitRate": round(hits / total, 4) if total > 0 else 0,
                "tokensSaved": row.tokens_saved,
                "costSaved": float(row.cost_saved),
                "daily": breakdown,
            }
        return {}

    data = await _cached_or_compute(cache_key, CACHE_SHORT, compute)
    return {"data": data}


# --- Requests ---


@router.get("/requests")
async def list_requests(
    _user: User = Depends(get_current_user),
    page: int = 1,
    limit: int = Query(default=50, le=100),
    provider: str | None = None,
    model: str | None = None,
    status: int | None = None,
    key: str | None = None,
    end_user: str | None = Query(None, alias="endUser"),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
):
    async for db in get_session():
        query = select(RequestLog)
        count_query = select(func.count()).select_from(RequestLog)

        conditions = []
        if provider:
            conditions.append(RequestLog.provider == provider)
        if model:
            conditions.append(RequestLog.model == model)
        if status:
            conditions.append(RequestLog.status_code == status)
        if key:
            conditions.append(RequestLog.virtual_key_id == key)
        if end_user:
            conditions.append(RequestLog.end_user == end_user)

        start = _parse_date(from_date)
        end = _parse_date(to_date)
        if start:
            conditions.append(RequestLog.created_at >= start)
        if end:
            conditions.append(RequestLog.created_at <= end)

        for cond in conditions:
            query = query.where(cond)
            count_query = count_query.where(cond)

        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        offset = (page - 1) * limit
        result = await db.execute(
            query.order_by(RequestLog.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        logs = result.scalars().all()

        data = [
            {
                "id": log.id,
                "provider": log.provider,
                "model": log.model,
                "method": log.method,
                "path": log.path,
                "statusCode": log.status_code,
                "latencyMs": log.latency_ms,
                "inputTokens": log.input_tokens,
                "outputTokens": log.output_tokens,
                "cost": float(log.cost),
                "cacheHit": log.cache_hit,
                "hasToolUse": log.has_tool_use,
                "toolNames": log.tool_names,
                "endUser": log.end_user,
                "sessionId": log.session_id,
                "virtualKeyId": log.virtual_key_id,
                "userAgent": log.user_agent,
                "isStarred": log.is_starred,
                "createdAt": log.created_at.isoformat(),
            }
            for log in logs
        ]

        return {
            "data": data,
            "total": total,
            "page": page,
            "pageSize": limit,
            "hasNext": (page * limit) < total,
            "hasPrevious": page > 1,
        }


# --- Requests Live SSE ---


@router.get("/requests/live")
async def requests_live(
    _user: User = Depends(get_current_user),
):
    async def event_stream():
        pubsub = await subscribe()
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    yield f"data: {message['data']}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe()
            await pubsub.aclose()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# --- Sessions ---


@router.get("/sessions")
async def list_sessions(
    _user: User = Depends(get_current_user),
    page: int = 1,
    limit: int = Query(default=50, le=100),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
):
    async for db in get_session():
        conditions = [RequestLog.session_id.isnot(None)]

        start = _parse_date(from_date)
        end = _parse_date(to_date)
        if start:
            conditions.append(RequestLog.created_at >= start)
        if end:
            conditions.append(RequestLog.created_at <= end)

        count_query = (
            select(func.count(distinct(RequestLog.session_id)))
            .select_from(RequestLog)
        )
        for cond in conditions:
            count_query = count_query.where(cond)

        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        offset = (page - 1) * limit
        sessions_query = (
            select(
                RequestLog.session_id,
                func.count().label("request_count"),
                func.min(RequestLog.created_at).label("first_request"),
                func.max(RequestLog.created_at).label("last_request"),
                func.coalesce(
                    func.sum(RequestLog.input_tokens + RequestLog.output_tokens), 0
                ).label("total_tokens"),
                func.coalesce(func.sum(RequestLog.cost), Decimal("0")).label(
                    "total_cost"
                ),
            )
        )
        for cond in conditions:
            sessions_query = sessions_query.where(cond)

        sessions_query = (
            sessions_query.group_by(RequestLog.session_id)
            .order_by(desc("last_request"))
            .offset(offset)
            .limit(limit)
        )

        result = await db.execute(sessions_query)
        rows = result.all()

        data = [
            {
                "sessionId": row.session_id,
                "requestCount": row.request_count,
                "firstRequest": row.first_request.isoformat(),
                "lastRequest": row.last_request.isoformat(),
                "totalTokens": row.total_tokens,
                "totalCost": float(row.total_cost),
            }
            for row in rows
        ]

        return {
            "data": data,
            "total": total,
            "page": page,
            "pageSize": limit,
            "hasNext": (page * limit) < total,
            "hasPrevious": page > 1,
        }


@router.get("/sessions/{session_id}")
async def get_session_detail(
    session_id: str,
    _user: User = Depends(get_current_user),
):
    async for db in get_session():
        result = await db.execute(
            select(RequestLog)
            .where(RequestLog.session_id == session_id)
            .order_by(RequestLog.created_at.asc())
        )
        logs = result.scalars().all()

        data = [
            {
                "id": log.id,
                "provider": log.provider,
                "model": log.model,
                "method": log.method,
                "path": log.path,
                "statusCode": log.status_code,
                "latencyMs": log.latency_ms,
                "inputTokens": log.input_tokens,
                "outputTokens": log.output_tokens,
                "cost": float(log.cost),
                "cacheHit": log.cache_hit,
                "hasToolUse": log.has_tool_use,
                "toolNames": log.tool_names,
                "requestBody": log.request_body,
                "responseBody": log.response_body,
                "endUser": log.end_user,
                "userAgent": log.user_agent,
                "isStarred": log.is_starred,
                "createdAt": log.created_at.isoformat(),
            }
            for log in logs
        ]

        return {"data": data, "sessionId": session_id}


# --- Logs ---


@router.get("/logs")
async def get_logs(
    _user: User = Depends(get_current_user),
    page: int = 1,
    limit: int = Query(default=50, le=100),
):
    async for db in get_session():
        offset = (page - 1) * limit

        result = await db.execute(
            select(RequestLog)
            .order_by(RequestLog.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        logs = result.scalars().all()

        grouped: dict[str | None, list] = {}
        for log in logs:
            key = log.session_id
            entry = {
                "id": log.id,
                "provider": log.provider,
                "model": log.model,
                "statusCode": log.status_code,
                "latencyMs": log.latency_ms,
                "inputTokens": log.input_tokens,
                "outputTokens": log.output_tokens,
                "cost": float(log.cost),
                "createdAt": log.created_at.isoformat(),
            }
            grouped.setdefault(key, []).append(entry)

        return {"data": grouped}


# --- Models ---


@router.get("/models")
async def get_model_stats(
    _user: User = Depends(get_current_user),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
):
    start = _parse_date(from_date)
    end = _parse_date(to_date)
    if not start or not end:
        start, end = _default_range()

    cache_key = f"raven:analytics:models:{start.date()}:{end.date()}"

    async def compute():
        async for db in get_session():
            result = await db.execute(
                select(
                    RequestLog.model,
                    RequestLog.provider,
                    func.count().label("requests"),
                    func.coalesce(
                        func.sum(
                            RequestLog.input_tokens + RequestLog.output_tokens
                        ),
                        0,
                    ).label("tokens"),
                    func.coalesce(func.sum(RequestLog.cost), Decimal("0")).label(
                        "cost"
                    ),
                    func.coalesce(func.avg(RequestLog.latency_ms), 0).label(
                        "avg_latency"
                    ),
                )
                .where(
                    RequestLog.created_at >= start,
                    RequestLog.created_at <= end,
                )
                .group_by(RequestLog.model, RequestLog.provider)
                .order_by(desc("requests"))
            )
            rows = result.all()

            return [
                {
                    "model": row.model,
                    "provider": row.provider,
                    "requests": row.requests,
                    "tokens": row.tokens,
                    "cost": float(row.cost),
                    "avgLatencyMs": round(float(row.avg_latency), 2),
                }
                for row in rows
            ]
        return []

    data = await _cached_or_compute(cache_key, CACHE_MEDIUM, compute)
    return {"data": data}


# --- Tools ---


@router.get("/tools/stats")
async def get_tool_stats(
    _user: User = Depends(get_current_user),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
):
    start = _parse_date(from_date)
    end = _parse_date(to_date)
    if not start or not end:
        start, end = _default_range()

    cache_key = f"raven:analytics:tools:{start.date()}:{end.date()}"

    async def compute():
        async for db in get_session():
            result = await db.execute(
                select(
                    func.count().label("total_with_tools"),
                    func.coalesce(func.sum(RequestLog.tool_count), 0).label(
                        "total_tool_calls"
                    ),
                    func.coalesce(func.avg(RequestLog.tool_count), 0).label(
                        "avg_tools_per_request"
                    ),
                )
                .where(
                    RequestLog.has_tool_use.is_(True),
                    RequestLog.created_at >= start,
                    RequestLog.created_at <= end,
                )
            )
            row = result.one()

            tool_result = await db.execute(
                select(RequestLog.tool_names)
                .where(
                    RequestLog.has_tool_use.is_(True),
                    RequestLog.tool_names.isnot(None),
                    RequestLog.created_at >= start,
                    RequestLog.created_at <= end,
                )
            )
            tool_rows = tool_result.scalars().all()

            tool_counts: dict[str, int] = {}
            for names in tool_rows:
                if isinstance(names, list):
                    for name in names:
                        tool_counts[name] = tool_counts.get(name, 0) + 1

            top_tools = sorted(
                tool_counts.items(), key=lambda x: x[1], reverse=True
            )[:20]

            return {
                "totalWithTools": row.total_with_tools,
                "totalToolCalls": row.total_tool_calls,
                "avgToolsPerRequest": round(
                    float(row.avg_tools_per_request), 2
                ),
                "topTools": [
                    {"name": name, "count": count} for name, count in top_tools
                ],
            }
        return {}

    data = await _cached_or_compute(cache_key, CACHE_MEDIUM, compute)
    return {"data": data}


@router.get("/tools/sessions")
async def get_tool_sessions(
    _user: User = Depends(get_current_user),
    page: int = 1,
    limit: int = Query(default=50, le=100),
):
    async for db in get_session():
        conditions = [
            RequestLog.has_tool_use.is_(True),
            RequestLog.session_id.isnot(None),
        ]

        count_query = (
            select(func.count(distinct(RequestLog.session_id)))
            .select_from(RequestLog)
        )
        for cond in conditions:
            count_query = count_query.where(cond)

        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        offset = (page - 1) * limit
        query = (
            select(
                RequestLog.session_id,
                func.count().label("request_count"),
                func.coalesce(func.sum(RequestLog.tool_count), 0).label(
                    "total_tools"
                ),
                func.max(RequestLog.created_at).label("last_request"),
            )
        )
        for cond in conditions:
            query = query.where(cond)

        query = (
            query.group_by(RequestLog.session_id)
            .order_by(desc("last_request"))
            .offset(offset)
            .limit(limit)
        )

        result = await db.execute(query)
        rows = result.all()

        data = [
            {
                "sessionId": row.session_id,
                "requestCount": row.request_count,
                "totalTools": row.total_tools,
                "lastRequest": row.last_request.isoformat(),
            }
            for row in rows
        ]

        return {
            "data": data,
            "total": total,
            "page": page,
            "pageSize": limit,
            "hasNext": (page * limit) < total,
            "hasPrevious": page > 1,
        }


# --- Adoption ---


@router.get("/adoption/chart")
async def get_adoption_chart(
    _user: User = Depends(get_current_user),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
):
    start = _parse_date(from_date)
    end = _parse_date(to_date)
    if not start or not end:
        start, end = _default_range()

    cache_key = f"raven:analytics:adoption:chart:{start.date()}:{end.date()}"

    async def compute():
        async for db in get_session():
            result = await db.execute(
                select(
                    func.date_trunc("day", RequestLog.created_at).label("day"),
                    func.count().label("requests"),
                    func.count(distinct(RequestLog.virtual_key_id)).label(
                        "unique_keys"
                    ),
                    func.count(distinct(RequestLog.end_user)).label(
                        "unique_users"
                    ),
                )
                .where(
                    RequestLog.created_at >= start,
                    RequestLog.created_at <= end,
                )
                .group_by("day")
                .order_by("day")
            )
            rows = result.all()

            return [
                {
                    "date": row.day.date().isoformat(),
                    "requests": row.requests,
                    "uniqueKeys": row.unique_keys,
                    "uniqueUsers": row.unique_users,
                }
                for row in rows
            ]
        return []

    data = await _cached_or_compute(cache_key, CACHE_MEDIUM, compute)
    return {"data": data}


@router.get("/adoption/breakdown")
async def get_adoption_breakdown(
    _user: User = Depends(get_current_user),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
):
    start = _parse_date(from_date)
    end = _parse_date(to_date)
    if not start or not end:
        start, end = _default_range()

    cache_key = (
        f"raven:analytics:adoption:breakdown:{start.date()}:{end.date()}"
    )

    async def compute():
        async for db in get_session():
            conditions = [
                RequestLog.created_at >= start,
                RequestLog.created_at <= end,
            ]

            by_key = await db.execute(
                select(
                    RequestLog.virtual_key_id,
                    func.count().label("requests"),
                )
                .where(*conditions)
                .where(RequestLog.virtual_key_id.isnot(None))
                .group_by(RequestLog.virtual_key_id)
                .order_by(desc("requests"))
                .limit(20)
            )

            by_model = await db.execute(
                select(
                    RequestLog.model,
                    func.count().label("requests"),
                )
                .where(*conditions)
                .group_by(RequestLog.model)
                .order_by(desc("requests"))
                .limit(20)
            )

            by_ua = await db.execute(
                select(
                    RequestLog.user_agent,
                    func.count().label("requests"),
                )
                .where(*conditions)
                .where(RequestLog.user_agent.isnot(None))
                .group_by(RequestLog.user_agent)
                .order_by(desc("requests"))
                .limit(20)
            )

            return {
                "byKey": [
                    {"keyId": r.virtual_key_id, "requests": r.requests}
                    for r in by_key.all()
                ],
                "byModel": [
                    {"model": r.model, "requests": r.requests}
                    for r in by_model.all()
                ],
                "byUserAgent": [
                    {"userAgent": r.user_agent, "requests": r.requests}
                    for r in by_ua.all()
                ],
            }
        return {}

    data = await _cached_or_compute(cache_key, CACHE_MEDIUM, compute)
    return {"data": data}


# --- Star ---


@router.patch("/requests/{request_id}/star")
async def toggle_star(
    request_id: str,
    _user: User = Depends(get_current_user),
):
    async for db in get_session():
        result = await db.execute(
            select(RequestLog).where(RequestLog.id == request_id)
        )
        log = result.scalar_one_or_none()

        if not log:
            raise AppError(
                "Request not found", status_code=404, code="NOT_FOUND"
            )

        new_value = not log.is_starred
        await db.execute(
            update(RequestLog)
            .where(RequestLog.id == request_id)
            .values(is_starred=new_value)
        )
        await db.commit()

        return {"data": {"id": request_id, "isStarred": new_value}}
