FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @raven/db build 2>/dev/null || true
RUN pnpm --filter @raven/config build 2>/dev/null || true

FROM base AS runner
WORKDIR /app
COPY --from=builder /app .
EXPOSE 3001
CMD ["pnpm", "--filter", "api", "start"]
