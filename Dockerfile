# Stage 1: Build Go binaries
FROM golang:1.24-alpine AS go-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY cmd/ cmd/
COPY internal/ internal/
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /bin/api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /bin/cron ./cmd/cron

# Stage 2: Build Next.js frontend
FROM node:22-alpine AS web-builder
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile
COPY apps/web/ apps/web/
COPY packages/ui/ packages/ui/
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN pnpm --filter @raven/web build

# Stage 3: Runner
FROM alpine:3.21
RUN apk add --no-cache postgresql16 redis nodejs && \
    mkdir -p /var/lib/postgresql/data /run/postgresql && \
    chown -R postgres:postgres /var/lib/postgresql /run/postgresql
WORKDIR /app
COPY --from=go-builder /bin/api ./api
COPY --from=go-builder /bin/cron ./cron
COPY --from=web-builder /app/apps/web/.next/standalone ./web/
COPY --from=web-builder /app/apps/web/.next/static ./web/apps/web/.next/static
COPY --chmod=755 docker-entrypoint.sh ./

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    API_PORT=4000 \
    APP_URL=http://localhost:3000 \
    BETTER_AUTH_URL=http://localhost:4000 \
    DATABASE_URL=postgresql://raven:raven@localhost:5432/raven \
    REDIS_URL=redis://localhost:6379

VOLUME /var/lib/postgresql/data
EXPOSE 3000 4000
HEALTHCHECK --interval=10s --timeout=5s --start-period=120s --retries=3 \
  CMD wget -q --spider http://localhost:4000/health || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["serve"]
