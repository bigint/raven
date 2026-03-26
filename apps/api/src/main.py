from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from src.config import settings
from src.database import engine
from src.lib.errors import AppError, app_error_handler
from src.redis import close_pool
from src.routes import (
    admin,
    analytics,
    audit_logs,
    auth,
    budgets,
    guardrails,
    health,
    invitations,
    keys,
    models,
    providers,
    proxy,
    routing_rules,
    setup,
    user,
    webhooks,
)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
    yield
    await engine.dispose()
    await close_pool()


app = FastAPI(
    title="Raven API",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.APP_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)

app.add_exception_handler(AppError, app_error_handler)

# Public routes (no auth)
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(setup.router)
app.include_router(invitations.router)
app.include_router(models.router)

# User routes (session auth)
app.include_router(user.router)

# Admin routes (admin auth)
app.include_router(admin.router)

# Protected API routes (session auth + writer for mutations)
app.include_router(providers.router)
app.include_router(keys.router)
app.include_router(budgets.router)
app.include_router(guardrails.router)
app.include_router(routing_rules.router)
app.include_router(webhooks.router)
app.include_router(audit_logs.router)
app.include_router(analytics.router)

# Proxy routes (API key auth)
app.include_router(proxy.router)
