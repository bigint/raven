### Stage 1: Node.js dependencies + build (web only)
FROM node:22-bookworm-slim AS node-deps
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/data/package.json packages/data/
COPY packages/ui/package.json packages/ui/
COPY packages/types/package.json packages/types/
RUN pnpm install --frozen-lockfile

FROM node-deps AS node-builder
COPY apps/web/ apps/web/
COPY packages/ packages/
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN pnpm --filter @raven/web build

### Stage 2: Python dependencies
FROM python:3.13-slim-bookworm AS python-deps
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
COPY apps/api/pyproject.toml apps/api/uv.lock ./api/
RUN --mount=type=cache,target=/root/.cache/uv \
    cd api && uv sync --frozen --no-install-project --no-editable --no-dev
COPY apps/cron/pyproject.toml ./cron/
RUN --mount=type=cache,target=/root/.cache/uv \
    cd cron && uv sync --frozen --no-install-project --no-editable --no-dev 2>/dev/null || true

### Stage 3: Runner
FROM python:3.13-slim-bookworm AS runner

# Install Node.js 22 + PostgreSQL + Redis
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      curl ca-certificates gnupg postgresql redis-server wget && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/* && \
    mkdir -p /var/lib/postgresql/data /run/postgresql && \
    chown -R postgres:postgres /var/lib/postgresql /run/postgresql

WORKDIR /app

# Copy Python API + venv
COPY --from=python-deps /app/api/.venv ./api/.venv
COPY apps/api/src ./api/src
COPY apps/api/alembic ./api/alembic
COPY apps/api/alembic.ini ./api/alembic.ini

# Copy Python cron
COPY apps/cron/src ./cron/src

# Copy Node.js web (Next.js standalone)
COPY --from=node-builder /app/apps/web/.next/standalone ./web/
COPY --from=node-builder /app/apps/web/.next/static ./web/apps/web/.next/static

# Copy entrypoint
COPY --chmod=755 docker-entrypoint.sh ./

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    API_PORT=4000 \
    APP_URL=http://localhost:3000 \
    AUTH_URL=http://localhost:4000 \
    DATABASE_URL=postgresql://raven:raven@localhost:5432/raven \
    NEXT_PUBLIC_API_URL=http://localhost:4000 \
    REDIS_URL=redis://localhost:6379

VOLUME /var/lib/postgresql/data
EXPOSE 3000 4000

HEALTHCHECK --interval=10s --timeout=5s --start-period=120s --retries=3 \
  CMD wget -q --spider http://localhost:4000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["serve"]
