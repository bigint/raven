package observe

import (
	"context"
	"log/slog"

	"github.com/bigint-studio/raven/internal/config"
)

// TraceExporter defines the interface for trace exporters.
type TraceExporter interface {
	// Export sends a trace span.
	Export(ctx context.Context, span *TraceSpan) error
	// Shutdown gracefully shuts down the exporter.
	Shutdown(ctx context.Context) error
}

// TraceSpan represents a single trace span.
type TraceSpan struct {
	TraceID    string            `json:"trace_id"`
	SpanID     string            `json:"span_id"`
	ParentID   string            `json:"parent_id,omitempty"`
	Name       string            `json:"name"`
	StartTime  int64             `json:"start_time"`
	EndTime    int64             `json:"end_time"`
	Attributes map[string]string `json:"attributes,omitempty"`
	Status     string            `json:"status"`
}

// Tracer manages distributed tracing.
type Tracer struct {
	cfg      *config.TracesConfig
	exporter TraceExporter
}

// NewTracer creates a new tracer.
func NewTracer(cfg *config.TracesConfig) *Tracer {
	return &Tracer{cfg: cfg}
}

// Start initializes the tracer.
func (t *Tracer) Start() error {
	if !t.cfg.Enabled {
		return nil
	}

	slog.Info("traces enabled",
		"exporter", t.cfg.Exporter,
		"endpoint", t.cfg.Endpoint,
		"sampling_rate", t.cfg.SamplingRate)

	// TODO: Initialize OTLP HTTP or gRPC exporter based on config.
	return nil
}

// Shutdown gracefully shuts down the tracer.
func (t *Tracer) Shutdown(ctx context.Context) error {
	if t.exporter != nil {
		return t.exporter.Shutdown(ctx)
	}
	return nil
}
