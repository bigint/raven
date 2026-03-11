// Package observe provides observability (logging, metrics, tracing) for the Raven gateway.
package observe

import (
	"log/slog"
	"os"
	"time"

	"github.com/bigint-studio/raven/internal/config"
)

// SetupLogger configures the global slog logger.
func SetupLogger(cfg *config.ObservabilityConfig) {
	var level slog.Level
	switch cfg.Logs.Level {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	default:
		level = slog.LevelInfo
	}

	opts := &slog.HandlerOptions{
		Level: level,
	}

	var handler slog.Handler
	if cfg.Logs.Format == "json" {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	logger := slog.New(handler)
	slog.SetDefault(logger)
}

// RequestLogEntry holds structured data for a request log.
type RequestLogEntry struct {
	RequestID    string        `json:"request_id"`
	Method       string        `json:"method"`
	Path         string        `json:"path"`
	Provider     string        `json:"provider"`
	Model        string        `json:"model"`
	StatusCode   int           `json:"status_code"`
	Duration     time.Duration `json:"duration"`
	TTFB         time.Duration `json:"ttfb"`
	InputTokens  int           `json:"input_tokens"`
	OutputTokens int           `json:"output_tokens"`
	Cost         float64       `json:"cost"`
	CacheHit     bool          `json:"cache_hit"`
	Stream       bool          `json:"stream"`
	KeyID        string        `json:"key_id,omitempty"`
	OrgID        string        `json:"org_id,omitempty"`
	Error        string        `json:"error,omitempty"`
}

// LogRequest logs a completed request.
func LogRequest(entry *RequestLogEntry) {
	attrs := []any{
		"request_id", entry.RequestID,
		"method", entry.Method,
		"path", entry.Path,
		"provider", entry.Provider,
		"model", entry.Model,
		"status_code", entry.StatusCode,
		"duration_ms", entry.Duration.Milliseconds(),
		"input_tokens", entry.InputTokens,
		"output_tokens", entry.OutputTokens,
		"cost", entry.Cost,
		"cache_hit", entry.CacheHit,
		"stream", entry.Stream,
	}

	if entry.TTFB > 0 {
		attrs = append(attrs, "ttfb_ms", entry.TTFB.Milliseconds())
	}
	if entry.KeyID != "" {
		attrs = append(attrs, "key_id", entry.KeyID)
	}
	if entry.OrgID != "" {
		attrs = append(attrs, "org_id", entry.OrgID)
	}
	if entry.Error != "" {
		attrs = append(attrs, "error", entry.Error)
		slog.Error("request completed with error", attrs...)
		return
	}

	slog.Info("request completed", attrs...)
}
