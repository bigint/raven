# Stage 1: Build dashboard
FROM node:22-alpine AS dashboard-builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app/dashboard

COPY dashboard/package.json dashboard/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY dashboard/ ./
RUN pnpm build

# Stage 2: Build gateway
FROM golang:1.24-alpine AS gateway-builder

RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app

COPY gateway/go.mod gateway/go.sum ./gateway/
RUN cd gateway && go mod download

COPY gateway/ ./gateway/

RUN cd gateway && CGO_ENABLED=1 go build -ldflags "-s -w" -o /raven .

# Stage 3: Final image
FROM alpine:3.21

RUN apk add --no-cache ca-certificates sqlite-libs

COPY --from=gateway-builder /raven /usr/local/bin/raven
COPY --from=dashboard-builder /app/dashboard/dist /srv/dashboard

RUN adduser -D -h /data raven
USER raven
WORKDIR /data

ENV RAVEN_DASHBOARD_DIR=/srv/dashboard

EXPOSE 8080

ENTRYPOINT ["raven", "serve"]
