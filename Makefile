.PHONY: all build build-gateway build-dashboard build-website build-sdks dev test lint clean

VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS := -ldflags "-s -w -X main.version=$(VERSION)"

all: build

# Build everything
build: build-gateway build-dashboard build-website build-sdks

# Gateway
build-gateway:
	cd gateway && go build $(LDFLAGS) -o raven .

build-gateway-embed: build-dashboard
	cd gateway && go build $(LDFLAGS) -tags embed -o raven .

# Dashboard
build-dashboard:
	cd dashboard && pnpm install && pnpm build

# Website
build-website:
	cd website && pnpm install && pnpm build

# SDKs
build-sdks:
	cd sdks/typescript && pnpm install && pnpm build
	cd sdks/python && pip install -e .
	cd sdks/go && go build ./...

# Dev — one command to start everything
dev:
	@echo "Starting Postgres + Redis..."
	docker compose -f docker-compose.dev.yml up -d --wait
	@echo "Starting gateway + dashboard..."
	@trap 'kill 0' EXIT; \
	(cd gateway && \
		RAVEN_STORE_DRIVER=postgres \
		DATABASE_URL='postgres://raven:raven@localhost:5432/raven?sslmode=disable' \
		REDIS_URL='redis://localhost:6379' \
		go run . serve -c ../raven.yaml) & \
	(cd dashboard && pnpm dev) & \
	wait

dev-gateway:
	cd gateway && \
		RAVEN_STORE_DRIVER=postgres \
		DATABASE_URL='postgres://raven:raven@localhost:5432/raven?sslmode=disable' \
		REDIS_URL='redis://localhost:6379' \
		go run . serve -c ../raven.yaml

dev-dashboard:
	cd dashboard && pnpm dev

dev-website:
	cd website && pnpm dev

dev-infra:
	docker compose -f docker-compose.dev.yml up -d --wait

dev-stop:
	docker compose -f docker-compose.dev.yml down

# Test
test: test-gateway test-dashboard test-sdks

test-gateway:
	cd gateway && go test -race ./...

test-dashboard:
	cd dashboard && pnpm test

test-sdks:
	cd sdks/typescript && pnpm test
	cd sdks/python && pytest
	cd sdks/go && go test ./...

# Lint
lint: lint-gateway lint-js

lint-gateway:
	cd gateway && golangci-lint run ./...

lint-js:
	pnpm -r lint

# Docker
docker-build:
	docker build -t ghcr.io/bigint-studio/raven:$(VERSION) .

docker-run:
	docker run -p 8080:8080 ghcr.io/bigint-studio/raven:$(VERSION)

# Clean
clean:
	rm -f gateway/raven
	rm -rf dashboard/dist
	rm -rf website/.next website/out
	rm -rf sdks/typescript/dist
	rm -rf node_modules
	pnpm -r exec rm -rf node_modules

# Generate provider spec
generate-provider:
	@read -p "Provider name: " name; \
	./scripts/generate-provider.sh $$name
