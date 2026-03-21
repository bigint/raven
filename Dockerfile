FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/cron/package.json apps/cron/
COPY apps/web/package.json apps/web/
COPY packages/auth/package.json packages/auth/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/email/package.json packages/email/
COPY packages/types/package.json packages/types/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
RUN apk add --no-cache wget
WORKDIR /app

COPY --from=builder /app/apps/api/dist ./api/
COPY --from=builder /app/apps/cron/dist ./cron/
COPY --from=builder /app/apps/web/.next/standalone ./web/
COPY --from=builder /app/apps/web/.next/static ./web/.next/static
COPY --from=builder /app/packages/db/drizzle ./drizzle/
COPY --from=builder /app/packages/db/src/migrate.mjs ./migrate.mjs
COPY --from=builder /app/node_modules ./node_modules/
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000 4000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["serve"]
