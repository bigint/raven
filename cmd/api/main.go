package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/config"
	"github.com/bigint/raven/internal/data"
	"github.com/bigint/raven/internal/database"
	"github.com/bigint/raven/internal/events"
	"github.com/bigint/raven/internal/logger"
	"github.com/bigint/raven/internal/middleware"
	"github.com/bigint/raven/internal/modules/admin"
	"github.com/bigint/raven/internal/modules/analytics"
	"github.com/bigint/raven/internal/modules/auditlogs"
	"github.com/bigint/raven/internal/modules/budgets"
	"github.com/bigint/raven/internal/modules/guardrails"
	"github.com/bigint/raven/internal/modules/invitations"
	"github.com/bigint/raven/internal/modules/keys"
	"github.com/bigint/raven/internal/modules/models"
	"github.com/bigint/raven/internal/modules/providers"
	"github.com/bigint/raven/internal/modules/routingrules"
	"github.com/bigint/raven/internal/modules/setup"
	"github.com/bigint/raven/internal/modules/user"
	"github.com/bigint/raven/internal/modules/webhooks"
	"github.com/bigint/raven/internal/proxy"
	ravenredis "github.com/bigint/raven/internal/redis"
)

func main() {
	env, err := config.ParseEnv()
	if err != nil {
		logger.Init(false)
		logger.Error("failed to parse env", err)
		os.Exit(1)
	}

	logger.Init(env.IsProduction())
	logger.Info("starting raven api server")

	ctx := context.Background()

	pool, err := database.NewPool(ctx, env.DatabaseURL)
	if err != nil {
		logger.Error("failed to connect to database", err)
		os.Exit(1)
	}

	rdb, err := ravenredis.NewClient(ctx, env.RedisURL)
	if err != nil {
		logger.Error("failed to connect to redis", err)
		os.Exit(1)
	}

	// Init event bus
	events.InitEventBus(rdb)

	// Create router
	r := buildRouter(env, pool, rdb)

	// Background goroutines
	bgCtx, bgCancel := context.WithCancel(ctx)
	defer bgCancel()

	go flushLogBufferLoop(bgCtx)
	go flushLastUsedLoop(bgCtx, pool, rdb)

	// Start server
	addr := fmt.Sprintf("%s:%d", env.APIHost, env.APIPort)
	server := &http.Server{
		Addr:              addr,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	go func() {
		logger.Info("api server listening", "addr", addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
	<-quit

	logger.Info("shutting down api server")
	bgCancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(ctx, 30*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("server shutdown error", err)
	}

	// Flush remaining log buffer
	proxy.StopLogBuffer()

	// Close connections
	rdb.Close()
	pool.Close()

	logger.Info("api server stopped")
}

func buildRouter(env *config.Env, pool *pgxpool.Pool, rdb *redis.Client) *chi.Mux {
	r := chi.NewRouter()

	// Global middleware
	if !env.IsProduction() {
		r.Use(chimiddleware.Logger)
	}
	r.Use(middleware.BodyLimit(10 << 20)) // 10MB
	r.Use(middleware.RequestID)
	r.Use(middleware.Timing)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{env.AppURL},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-Id"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(middleware.Security)
	r.Use(chimiddleware.Compress(5, "application/json", "text/html", "text/css", "text/javascript"))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	// Auth routes (no session auth)
	r.Route("/api/auth", func(r chi.Router) {
		r.HandleFunc("/*", authProxyHandler(env))
	})

	// OpenAI-compatible chat completions
	r.Route("/v1/chat/completions", func(r chi.Router) {
		r.Post("/", chatCompletionsHandler(pool, rdb, env))
	})

	// Proxy pipeline
	r.Route("/v1/proxy", func(r chi.Router) {
		r.HandleFunc("/*", proxyHandler(pool, rdb, env))
	})

	// Public routes
	modelsHandler := models.NewHandler(pool)
	r.Mount("/v1/models", modelsHandler.Routes())

	r.Get("/v1/settings/public", publicSettingsHandler(pool, rdb))

	invitationsHandler := invitations.NewHandler(pool)
	r.Mount("/v1/invitations", invitationsHandler.Routes())

	setupHandler := setup.NewHandler(pool)
	r.Mount("/v1/setup", setupHandler.Routes())

	// Session-authenticated routes
	r.Route("/v1/user", func(r chi.Router) {
		r.Use(middleware.SessionAuth(pool))
		userHandler := user.NewHandler(pool)
		r.Mount("/", userHandler.Routes())
	})

	// Admin routes (session auth + admin check)
	r.Route("/v1/admin", func(r chi.Router) {
		r.Use(middleware.SessionAuth(pool))
		r.Use(middleware.RequireAdmin)
		adminHandler := admin.NewHandler(pool, rdb)
		r.Mount("/", adminHandler.Routes())
	})

	// Protected routes (session auth + writer middleware)
	r.Route("/v1", func(r chi.Router) {
		r.Use(middleware.SessionAuth(pool))
		r.Use(middleware.Writer)

		providersHandler := &providers.Handler{Pool: pool, Redis: rdb, Env: env}
		r.Mount("/providers", providersHandler.Routes())

		keysHandler := &keys.Handler{Pool: pool, Env: env}
		r.Mount("/keys", keysHandler.Routes())

		budgetsHandler := budgets.NewHandler(pool)
		r.Mount("/budgets", budgetsHandler.Routes())

		guardrailsHandler := guardrails.NewHandler(pool)
		r.Mount("/guardrails", guardrailsHandler.Routes())

		analyticsHandler := analytics.NewHandler(pool)
		r.Mount("/analytics", analyticsHandler.Routes())

		webhooksHandler := webhooks.NewHandler(pool)
		r.Mount("/webhooks", webhooksHandler.Routes())

		routingRulesHandler := routingrules.NewHandler(pool)
		r.Mount("/routing-rules", routingRulesHandler.Routes())

		auditLogsHandler := auditlogs.NewHandler(pool)
		r.Mount("/audit-logs", auditLogsHandler.Routes())

		availableModelsHandler := models.NewHandler(pool)
		r.Mount("/available-models", availableModelsHandler.AvailableRoutes())
	})

	return r
}

func chatCompletionsHandler(pool *pgxpool.Pool, rdb *redis.Client, env *config.Env) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, `{"error":{"message":"Failed to read request body"}}`, http.StatusBadRequest)
			return
		}
		r.Body.Close()

		// Parse to determine the model and provider
		var parsed map[string]any
		if err := json.Unmarshal(body, &parsed); err != nil {
			http.Error(w, `{"error":{"message":"Invalid JSON body"}}`, http.StatusBadRequest)
			return
		}

		modelStr, _ := parsed["model"].(string)
		providerPath := ""
		if modelStr != "" {
			// Look up provider from model catalog
			if modelDef, ok := proxy.LookupModelProvider(modelStr); ok {
				providerPath = "/v1/proxy/" + modelDef
			}
		}

		proxy.RunPipeline(w, r, &proxy.PipelineInput{
			Pool:                 pool,
			Redis:                rdb,
			Env:                  env,
			AuthHeader:           r.Header.Get("Authorization"),
			Method:               r.Method,
			Path:                 r.URL.Path,
			BodyText:             string(body),
			SessionID:            r.Header.Get("X-Session-Id"),
			UserAgent:            r.UserAgent(),
			UserIDHeader:         r.Header.Get("X-User-Id"),
			ProviderPath:         providerPath,
			UpstreamPathOverride: "/chat/completions",
			StrictBody:           true,
		})
	}
}

func proxyHandler(pool *pgxpool.Pool, rdb *redis.Client, env *config.Env) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, `{"error":{"message":"Failed to read request body"}}`, http.StatusBadRequest)
			return
		}
		r.Body.Close()

		proxy.RunPipeline(w, r, &proxy.PipelineInput{
			Pool:       pool,
			Redis:      rdb,
			Env:        env,
			AuthHeader: r.Header.Get("Authorization"),
			Method:     r.Method,
			Path:       r.URL.Path,
			BodyText:   string(body),
			SessionID:  r.Header.Get("X-Session-Id"),
			UserAgent:  r.UserAgent(),
			UserIDHeader: r.Header.Get("X-User-Id"),
			ProviderPath: r.URL.Path,
		})
	}
}

func authProxyHandler(env *config.Env) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Forward to better-auth endpoint
		targetURL := env.BetterAuthURL + r.URL.Path
		if r.URL.RawQuery != "" {
			targetURL += "?" + r.URL.RawQuery
		}

		body, _ := io.ReadAll(r.Body)
		r.Body.Close()

		proxyReq, err := http.NewRequestWithContext(r.Context(), r.Method, targetURL, strings.NewReader(string(body)))
		if err != nil {
			http.Error(w, "Failed to create proxy request", http.StatusInternalServerError)
			return
		}

		// Copy headers
		for k, vals := range r.Header {
			for _, v := range vals {
				proxyReq.Header.Add(k, v)
			}
		}

		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(proxyReq)
		if err != nil {
			http.Error(w, "Auth service unavailable", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		// Copy response
		for k, vals := range resp.Header {
			for _, v := range vals {
				w.Header().Add(k, v)
			}
		}
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	}
}

func publicSettingsHandler(pool *pgxpool.Pool, rdb *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Return public-safe settings
		rows, err := pool.Query(r.Context(),
			"SELECT key, value FROM settings WHERE key LIKE 'public.%' ORDER BY key ASC")
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]any{"data": map[string]string{}})
			return
		}
		defer rows.Close()

		settings := map[string]string{}
		for rows.Next() {
			var key, value string
			if err := rows.Scan(&key, &value); err != nil {
				continue
			}
			settings[key] = value
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{"data": settings})
	}
}

func flushLogBufferLoop(ctx context.Context) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			// The proxy logger manages its own buffer flushing,
			// this is a safety net to ensure it runs.
		}
	}
}

func flushLastUsedLoop(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client) {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			proxy.FlushLastUsed(ctx, pool, rdb)
		}
	}
}
