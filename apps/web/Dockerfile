FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @raven/web build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app .
EXPOSE 3000
CMD ["pnpm", "--filter", "@raven/web", "start"]
