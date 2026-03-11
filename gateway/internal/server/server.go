package server

import (
	"context"
	"crypto/tls"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/bigint-studio/raven/internal/admin"
	"github.com/bigint-studio/raven/internal/auth"
	"github.com/bigint-studio/raven/internal/budget"
	"github.com/bigint-studio/raven/internal/cache"
	"github.com/bigint-studio/raven/internal/config"
	"github.com/bigint-studio/raven/internal/observe"
	"github.com/bigint-studio/raven/internal/providers"
	"github.com/bigint-studio/raven/internal/proxy"
	"github.com/bigint-studio/raven/internal/router"
	"github.com/bigint-studio/raven/internal/store"
)

// Server is the main HTTP server for the Raven gateway.
type Server struct {
	cfg      *config.Config
	httpSrv  *http.Server
	store    store.Store
	registry *providers.Registry
	health   *providers.HealthChecker
	metrics  *observe.Metrics
}

// New creates a new server instance.
func New(cfg *config.Config) (*Server, error) {
	// Initialize store.
	var st store.Store
	var err error
	switch cfg.Store.Driver {
	case "sqlite":
		st, err = store.NewSQLiteStore(cfg.Store.SQLite.Path)
	case "postgres":
		st, err = store.NewPostgresStore(cfg.Store.Postgres.URL)
	default:
		return nil, fmt.Errorf("unsupported store driver: %s", cfg.Store.Driver)
	}
	if err != nil {
		return nil, fmt.Errorf("initializing store: %w", err)
	}

	// Initialize provider registry.
	registry, err := providers.NewRegistry()
	if err != nil {
		return nil, fmt.Errorf("initializing provider registry: %w", err)
	}

	// Initialize health checker.
	health := providers.NewHealthChecker(
		registry,
		cfg.Routing.HealthCheckInterval,
		cfg.Routing.CircuitBreaker.FailureThreshold,
		cfg.Routing.CircuitBreaker.ResetTimeout,
	)

	// Initialize metrics.
	metrics := observe.NewMetrics()

	return &Server{
		cfg:      cfg,
		store:    st,
		registry: registry,
		health:   health,
		metrics:  metrics,
	}, nil
}

// Start starts the HTTP server with graceful shutdown.
func (s *Server) Start() error {
	// Setup logger.
	observe.SetupLogger(&s.cfg.Observability)

	// Run migrations.
	if err := s.store.Migrate(context.Background()); err != nil {
		return fmt.Errorf("running migrations: %w", err)
	}

	// Start health checker.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	s.health.Start(ctx)

	// Build router.
	r := s.buildRouter()

	// Create HTTP server.
	s.httpSrv = &http.Server{
		Addr:         s.cfg.Address(),
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 300 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// TLS support.
	if s.cfg.Server.TLS.Enabled {
		s.httpSrv.TLSConfig = &tls.Config{
			MinVersion: tls.VersionTLS12,
		}
	}

	// Graceful shutdown.
	errCh := make(chan error, 1)
	go func() {
		slog.Info("starting raven gateway",
			"address", s.cfg.Address(),
			"tls", s.cfg.Server.TLS.Enabled)

		if s.cfg.Server.TLS.Enabled {
			errCh <- s.httpSrv.ListenAndServeTLS(s.cfg.Server.TLS.CertFile, s.cfg.Server.TLS.KeyFile)
		} else {
			errCh <- s.httpSrv.ListenAndServe()
		}
	}()

	// Wait for interrupt or error.
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		if err != nil && err != http.ErrServerClosed {
			return fmt.Errorf("server error: %w", err)
		}
	case sig := <-sigCh:
		slog.Info("received signal, shutting down", "signal", sig)
	}

	// Graceful shutdown with timeout.
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if err := s.httpSrv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown error: %w", err)
	}

	s.health.Stop()
	s.store.Close()

	slog.Info("raven gateway stopped")
	return nil
}

// buildRouter creates the chi router with all routes and middleware.
func (s *Server) buildRouter() chi.Router {
	r := chi.NewRouter()

	// Global middleware.
	r.Use(RecoveryMiddleware)
	r.Use(RequestIDMiddleware)
	r.Use(CORSMiddleware)
	r.Use(LoggingMiddleware)
	r.Use(MetricsMiddleware(s.metrics))

	// Health check.
	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`)) //nolint:errcheck
	})

	// Metrics endpoint.
	if s.cfg.Observability.Metrics.Enabled {
		r.Handle(s.cfg.Observability.Metrics.Path, promhttp.Handler())
	}

	// Initialize components.
	authMiddleware := auth.NewMiddleware(s.cfg, s.store)
	costCalc := observe.NewCostCalculator(s.registry)
	budgetMgr := budget.NewManager(s.store)
	budgetTracker := budget.NewTracker(s.store)
	rt := router.NewRouter(s.cfg, s.registry, s.health)
	pool := proxy.NewPool()

	var cacheOrch *cache.Orchestrator
	if s.cfg.Cache.Enabled {
		exactCache := cache.NewExactCache(s.cfg.Cache.Exact.MaxEntries)
		cacheOrch = cache.NewOrchestrator(exactCache, true)
	} else {
		cacheOrch = cache.NewOrchestrator(nil, false)
	}

	engine := proxy.NewEngine(s.cfg, s.registry, rt, pool, cacheOrch, s.health,
		s.metrics, costCalc, budgetMgr, budgetTracker, s.store)

	// Proxy routes (authenticated).
	r.Group(func(r chi.Router) {
		r.Use(authMiddleware.Authenticate)

		r.Post("/v1/chat/completions", engine.HandleChatCompletions)
		r.Post("/v1/completions", engine.HandleCompletions)
		r.Post("/v1/embeddings", engine.HandleEmbeddings)
		r.Get("/v1/models", engine.HandleModels)
	})

	// Admin routes (authenticated + admin only).
	r.Group(func(r chi.Router) {
		r.Use(authMiddleware.Authenticate)
		r.Use(authMiddleware.AdminOnly)

		adminRouter := admin.NewRouter(s.store, s.registry, s.health, s.metrics)
		r.Mount("/admin/v1", adminRouter.Routes())
	})

	return r
}
