package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/robfig/cron/v3"

	"github.com/bigint/raven/internal/config"
	"github.com/bigint/raven/internal/logger"
)

func main() {
	env, err := config.ParseEnv()
	if err != nil {
		logger.Init(false)
		logger.Error("failed to parse env", err)
		os.Exit(1)
	}

	logger.Init(env.IsProduction())
	logger.Info("starting cron worker")

	ctx := context.Background()

	pool, err := newPool(ctx, env.DatabaseURL)
	if err != nil {
		logger.Error("failed to connect to database", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Run all jobs on startup
	runAllJobs(ctx, pool)

	c := cron.New()

	// Hourly: deactivate expired keys
	c.AddFunc("@hourly", func() {
		logger.Info("running deactivateExpiredKeys")
		deactivateExpiredKeys(ctx, pool)
	})

	// Daily at midnight
	c.AddFunc("0 0 * * *", func() {
		logger.Info("running daily cleanup jobs")
		cleanupRetention(ctx, pool)
		cleanupExpiredSessions(ctx, pool)
		cleanupExpiredVerifications(ctx, pool)
		cleanupExpiredInvitations(ctx, pool)
	})

	c.Start()
	logger.Info("cron worker started")

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
	<-quit

	logger.Info("shutting down cron worker")
	c.Stop()
	logger.Info("cron worker stopped")
}

func newPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	poolConfig, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}

	poolConfig.MaxConns = 5
	poolConfig.MinConns = 1

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, err
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}

	return pool, nil
}

func runAllJobs(ctx context.Context, pool *pgxpool.Pool) {
	logger.Info("running all jobs on startup")
	deactivateExpiredKeys(ctx, pool)
	cleanupRetention(ctx, pool)
	cleanupExpiredSessions(ctx, pool)
	cleanupExpiredVerifications(ctx, pool)
	cleanupExpiredInvitations(ctx, pool)
	logger.Info("startup jobs completed")
}

func deactivateExpiredKeys(ctx context.Context, pool *pgxpool.Pool) {
	tag, err := pool.Exec(ctx,
		"UPDATE virtual_keys SET is_active = false WHERE expires_at < NOW() AND is_active = true AND expires_at IS NOT NULL")
	if err != nil {
		logger.Error("deactivateExpiredKeys failed", err)
		return
	}
	logger.Info("deactivateExpiredKeys completed", "rows", tag.RowsAffected())
}

func cleanupRetention(ctx context.Context, pool *pgxpool.Pool) {
	// Default retention: 90 days for request_logs, 365 days for audit_logs
	tag, err := pool.Exec(ctx,
		"DELETE FROM request_logs WHERE created_at < NOW() - INTERVAL '90 days'")
	if err != nil {
		logger.Error("cleanupRetention request_logs failed", err)
	} else {
		logger.Info("cleanupRetention request_logs completed", "rows", tag.RowsAffected())
	}

	tag, err = pool.Exec(ctx,
		"DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '365 days'")
	if err != nil {
		logger.Error("cleanupRetention audit_logs failed", err)
	} else {
		logger.Info("cleanupRetention audit_logs completed", "rows", tag.RowsAffected())
	}
}

func cleanupExpiredSessions(ctx context.Context, pool *pgxpool.Pool) {
	tag, err := pool.Exec(ctx,
		"DELETE FROM sessions WHERE expires_at < NOW()")
	if err != nil {
		logger.Error("cleanupExpiredSessions failed", err)
		return
	}
	logger.Info("cleanupExpiredSessions completed", "rows", tag.RowsAffected())
}

func cleanupExpiredVerifications(ctx context.Context, pool *pgxpool.Pool) {
	tag, err := pool.Exec(ctx,
		"DELETE FROM verifications WHERE expires_at < NOW()")
	if err != nil {
		logger.Error("cleanupExpiredVerifications failed", err)
		return
	}
	logger.Info("cleanupExpiredVerifications completed", "rows", tag.RowsAffected())
}

func cleanupExpiredInvitations(ctx context.Context, pool *pgxpool.Pool) {
	tag, err := pool.Exec(ctx,
		"DELETE FROM invitations WHERE expires_at < NOW() AND accepted_at IS NULL")
	if err != nil {
		logger.Error("cleanupExpiredInvitations failed", err)
		return
	}
	logger.Info("cleanupExpiredInvitations completed", "rows", tag.RowsAffected())
}
