FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/cron/package.json apps/cron/
COPY apps/web/package.json apps/web/
COPY packages/auth/package.json packages/auth/
COPY packages/config/package.json packages/config/
COPY packages/data/package.json packages/data/
COPY packages/db/package.json packages/db/
COPY packages/email/package.json packages/email/
COPY packages/types/package.json packages/types/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN pnpm build

FROM node:22-alpine AS runner
RUN apk add --no-cache postgresql redis && \
    mkdir -p /var/lib/postgresql/data /run/postgresql && \
    chown -R postgres:postgres /var/lib/postgresql /run/postgresql
WORKDIR /app

COPY --from=builder /app/apps/api/dist ./api/
COPY --from=builder /app/apps/cron/dist ./cron/
COPY --from=builder /app/apps/web/.next/standalone ./web/
COPY --from=builder /app/apps/web/.next/static ./web/apps/web/.next/static
COPY --from=builder /app/packages/db/drizzle ./drizzle/
COPY --from=builder /app/packages/db/dist/migrate.mjs ./migrate.mjs
COPY --chmod=755 docker-entrypoint.sh ./

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    API_PORT=4000 \
    APP_URL=http://localhost:3000 \
    BETTER_AUTH_URL=http://localhost:4000 \
    DATABASE_URL=postgresql://raven:raven@localhost:5432/raven \
    NEXT_PUBLIC_API_URL=http://localhost:4000 \
    REDIS_URL=redis://localhost:6379

VOLUME /var/lib/postgresql/data
EXPOSE 3000 4000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://localhost:4000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["serve"]
