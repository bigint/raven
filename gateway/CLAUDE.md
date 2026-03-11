# Raven Gateway Development Guide

## Build & Run
```bash
# Build the binary
cd gateway && go build -o raven .

# Run the gateway
./raven serve --config raven.yaml

# Run migrations
./raven migrate --config raven.yaml

# Validate config
./raven config validate --config raven.yaml

# Print version
./raven version
```

## Test
```bash
cd gateway && go test ./...
```

## Architecture
- `main.go` - Entrypoint, cobra root command setup
- `cmd/` - CLI commands (serve, version, migrate, config)
- `internal/config/` - YAML config loading via Viper
- `internal/server/` - HTTP server with chi router, middleware
- `internal/proxy/` - Core reverse proxy engine, SSE streaming, connection pool
- `internal/providers/` - Provider registry, adapters, health checks, embedded specs
- `internal/auth/` - API key authentication middleware, virtual key validation
- `internal/cache/` - Response caching (exact match LRU)
- `internal/router/` - Request routing (rules, fallback, load balance, cost)
- `internal/ratelimit/` - Rate limiting (sliding window, token bucket)
- `internal/budget/` - Budget management, spend tracking, alerts
- `internal/guardrails/` - Safety guardrails (PII, content policy) placeholder
- `internal/observe/` - Logging (slog), Prometheus metrics, OpenTelemetry traces, cost calc
- `internal/store/` - Data persistence (SQLite, PostgreSQL placeholder)
- `internal/admin/` - Admin REST API (/admin/v1/*)
- `internal/pipeline/` - Plugin execution pipeline
- `internal/plugin/` - Plugin interface, registry, loader
- `pkg/types/` - Shared types (request, response, provider, errors)

## Key Patterns
- All provider specs are embedded YAML files via `//go:embed`
- Provider adapters transform between OpenAI-compatible format and provider-native formats
- The proxy engine handles both streaming (SSE) and non-streaming responses
- Virtual keys use SHA-256 hashing with `rk_live_*` / `rk_test_*` format
- Budget management is hierarchical: key -> user -> team -> org (most restrictive wins)
- CGO is required for SQLite (github.com/mattn/go-sqlite3)

## Dependencies
- `github.com/spf13/cobra` - CLI framework
- `github.com/spf13/viper` - Configuration
- `github.com/go-chi/chi/v5` - HTTP routing
- `github.com/mattn/go-sqlite3` - SQLite driver (CGO)
- `github.com/prometheus/client_golang` - Prometheus metrics
- `gopkg.in/yaml.v3` - YAML parsing
- `log/slog` - Structured logging (stdlib)
