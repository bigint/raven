// Package config provides configuration loading and validation for the Raven gateway.
package config

import "time"

// Default configuration values.
const (
	DefaultHost = "0.0.0.0"
	DefaultPort = 8080

	DefaultTLSEnabled = false

	DefaultAdminDashboardEnabled = true

	DefaultStoreDriver = "sqlite"
	DefaultSQLitePath  = "./raven.db"

	DefaultCacheEnabled       = true
	DefaultExactCacheEnabled  = true
	DefaultExactMaxEntries    = 1000
	DefaultExactTTL           = 1 * time.Hour
	DefaultSemanticEnabled    = false
	DefaultSemanticBackend    = "sqlite_vec"
	DefaultSemanticThreshold  = 0.95
	DefaultSemanticMaxEntries = 10000
	DefaultSemanticTTL        = 24 * time.Hour

	DefaultRateLimitEnabled = true
	DefaultGlobalRPM        = 1000
	DefaultGlobalTPM        = 100000

	DefaultRoutingStrategy       = "single"
	DefaultHealthCheckInterval   = 30 * time.Second
	DefaultCircuitFailureThresh  = 5
	DefaultCircuitResetTimeout   = 60 * time.Second

	DefaultLogLevel        = "info"
	DefaultLogFormat       = "json"
	DefaultLogRequestBody  = false
	DefaultMetricsEnabled  = true
	DefaultMetricsPath     = "/metrics"
	DefaultTracesEnabled   = false
	DefaultTracesExporter  = "otlp_http"
	DefaultSamplingRate    = 1.0

	DefaultGuardrailsEnabled = false
	DefaultPIIDetection      = false
	DefaultPIIAction         = "redact"
	DefaultContentPolicy     = false

	DefaultTelemetry        = false
	DefaultRequestLogging   = true
	DefaultLogRequestBodies = false
	DefaultAnonymizeAfter   = "30d"
)
