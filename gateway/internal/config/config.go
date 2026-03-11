package config

import (
	"fmt"
	"os"
	"time"

	"github.com/spf13/viper"
)

// Config represents the full Raven gateway configuration.
// Provider API keys are managed via the database (dashboard UI), not config files.
type Config struct {
	Server        ServerConfig        `mapstructure:"server"`
	Admin         AdminConfig         `mapstructure:"admin"`
	Store         StoreConfig         `mapstructure:"store"`
	Cache         CacheConfig         `mapstructure:"cache"`
	RateLimit     RateLimitConfig     `mapstructure:"rate_limit"`
	Routing       RoutingConfig       `mapstructure:"routing"`
	Observability ObservabilityConfig `mapstructure:"observability"`
	Guardrails    GuardrailsConfig    `mapstructure:"guardrails"`
	Plugins       []PluginConfig      `mapstructure:"plugins"`
	Privacy       PrivacyConfig       `mapstructure:"privacy"`
}

// ServerConfig holds HTTP server settings.
type ServerConfig struct {
	Host string    `mapstructure:"host"`
	Port int       `mapstructure:"port"`
	TLS  TLSConfig `mapstructure:"tls"`
}

// TLSConfig holds TLS settings.
type TLSConfig struct {
	Enabled  bool   `mapstructure:"enabled"`
	CertFile string `mapstructure:"cert_file"`
	KeyFile  string `mapstructure:"key_file"`
}

// AdminConfig holds admin API settings.
type AdminConfig struct {
	APIKey    string          `mapstructure:"api_key"`
	Dashboard DashboardConfig `mapstructure:"dashboard"`
}

// DashboardConfig holds dashboard settings.
type DashboardConfig struct {
	Enabled bool   `mapstructure:"enabled"`
	Dir     string `mapstructure:"dir"`
}

// StoreConfig holds database settings.
type StoreConfig struct {
	Driver   string         `mapstructure:"driver"`
	SQLite   SQLiteConfig   `mapstructure:"sqlite"`
	Postgres PostgresConfig `mapstructure:"postgres"`
}

// SQLiteConfig holds SQLite-specific settings.
type SQLiteConfig struct {
	Path string `mapstructure:"path"`
}

// PostgresConfig holds PostgreSQL-specific settings.
type PostgresConfig struct {
	URL string `mapstructure:"url"`
}

// CacheConfig holds cache settings.
type CacheConfig struct {
	Enabled  bool           `mapstructure:"enabled"`
	Exact    ExactCache     `mapstructure:"exact"`
	Semantic SemanticCache  `mapstructure:"semantic"`
}

// ExactCache holds exact-match cache settings.
type ExactCache struct {
	Enabled    bool          `mapstructure:"enabled"`
	MaxEntries int           `mapstructure:"max_entries"`
	TTL        time.Duration `mapstructure:"ttl"`
}

// SemanticCache holds semantic cache settings.
type SemanticCache struct {
	Enabled             bool          `mapstructure:"enabled"`
	Backend             string        `mapstructure:"backend"`
	SimilarityThreshold float64       `mapstructure:"similarity_threshold"`
	MaxEntries          int           `mapstructure:"max_entries"`
	TTL                 time.Duration `mapstructure:"ttl"`
}

// RateLimitConfig holds rate limiting settings.
type RateLimitConfig struct {
	Enabled bool             `mapstructure:"enabled"`
	Global  GlobalRateLimit  `mapstructure:"global"`
}

// GlobalRateLimit holds global rate limit values.
type GlobalRateLimit struct {
	RPM int `mapstructure:"rpm"`
	TPM int `mapstructure:"tpm"`
}

// RoutingConfig holds routing settings.
type RoutingConfig struct {
	Strategy            string        `mapstructure:"strategy"`
	FallbackChain       []string      `mapstructure:"fallback_chain"`
	HealthCheckInterval time.Duration `mapstructure:"health_check_interval"`
	CircuitBreaker      CircuitBreaker `mapstructure:"circuit_breaker"`
}

// CircuitBreaker holds circuit breaker settings.
type CircuitBreaker struct {
	FailureThreshold int           `mapstructure:"failure_threshold"`
	ResetTimeout     time.Duration `mapstructure:"reset_timeout"`
}

// ObservabilityConfig holds observability settings.
type ObservabilityConfig struct {
	Logs    LogsConfig    `mapstructure:"logs"`
	Metrics MetricsConfig `mapstructure:"metrics"`
	Traces  TracesConfig  `mapstructure:"traces"`
}

// LogsConfig holds logging settings.
type LogsConfig struct {
	Level       string `mapstructure:"level"`
	Format      string `mapstructure:"format"`
	RequestBody bool   `mapstructure:"request_body"`
}

// MetricsConfig holds metrics settings.
type MetricsConfig struct {
	Enabled bool   `mapstructure:"enabled"`
	Path    string `mapstructure:"path"`
}

// TracesConfig holds tracing settings.
type TracesConfig struct {
	Enabled      bool    `mapstructure:"enabled"`
	Exporter     string  `mapstructure:"exporter"`
	Endpoint     string  `mapstructure:"endpoint"`
	SamplingRate float64 `mapstructure:"sampling_rate"`
}

// GuardrailsConfig holds guardrail settings.
type GuardrailsConfig struct {
	Enabled       bool          `mapstructure:"enabled"`
	PIIDetection  bool          `mapstructure:"pii_detection"`
	PIIAction     string        `mapstructure:"pii_action"`
	ContentPolicy ContentPolicy `mapstructure:"content_policy"`
}

// ContentPolicy holds content policy settings.
type ContentPolicy struct {
	Enabled bool `mapstructure:"enabled"`
}

// PluginConfig holds plugin configuration.
type PluginConfig struct {
	Name    string         `mapstructure:"name"`
	Enabled bool           `mapstructure:"enabled"`
	Config  map[string]any `mapstructure:"config"`
}

// PrivacyConfig holds privacy settings.
type PrivacyConfig struct {
	Telemetry        bool   `mapstructure:"telemetry"`
	RequestLogging   bool   `mapstructure:"request_logging"`
	LogRequestBodies bool   `mapstructure:"log_request_bodies"`
	AnonymizeAfter   string `mapstructure:"anonymize_logs_after"`
}

// Load reads configuration from file and environment variables.
func Load(path string) (*Config, error) {
	v := viper.New()

	setDefaults(v)

	v.SetConfigType("yaml")
	if path != "" {
		v.SetConfigFile(path)
	} else {
		v.SetConfigName("raven")
		v.AddConfigPath(".")
		v.AddConfigPath("/etc/raven")
		v.AddConfigPath("$HOME/.raven")
	}

	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("reading config: %w", err)
		}
	}

	cfg := &Config{}
	if err := v.Unmarshal(cfg); err != nil {
		return nil, fmt.Errorf("unmarshalling config: %w", err)
	}

	// Apply environment variable overrides directly (Viper nested key binding is unreliable).
	applyEnvOverrides(cfg)

	return cfg, nil
}

// setDefaults configures default values for all settings.
func setDefaults(v *viper.Viper) {
	v.SetDefault("server.host", DefaultHost)
	v.SetDefault("server.port", DefaultPort)
	v.SetDefault("server.tls.enabled", DefaultTLSEnabled)

	v.SetDefault("admin.dashboard.enabled", DefaultAdminDashboardEnabled)

	v.SetDefault("store.driver", DefaultStoreDriver)
	v.SetDefault("store.sqlite.path", DefaultSQLitePath)

	v.SetDefault("cache.enabled", DefaultCacheEnabled)
	v.SetDefault("cache.exact.enabled", DefaultExactCacheEnabled)
	v.SetDefault("cache.exact.max_entries", DefaultExactMaxEntries)
	v.SetDefault("cache.exact.ttl", DefaultExactTTL)
	v.SetDefault("cache.semantic.enabled", DefaultSemanticEnabled)
	v.SetDefault("cache.semantic.backend", DefaultSemanticBackend)
	v.SetDefault("cache.semantic.similarity_threshold", DefaultSemanticThreshold)
	v.SetDefault("cache.semantic.max_entries", DefaultSemanticMaxEntries)
	v.SetDefault("cache.semantic.ttl", DefaultSemanticTTL)

	v.SetDefault("rate_limit.enabled", DefaultRateLimitEnabled)
	v.SetDefault("rate_limit.global.rpm", DefaultGlobalRPM)
	v.SetDefault("rate_limit.global.tpm", DefaultGlobalTPM)

	v.SetDefault("routing.strategy", DefaultRoutingStrategy)
	v.SetDefault("routing.fallback_chain", []string{})
	v.SetDefault("routing.health_check_interval", DefaultHealthCheckInterval)
	v.SetDefault("routing.circuit_breaker.failure_threshold", DefaultCircuitFailureThresh)
	v.SetDefault("routing.circuit_breaker.reset_timeout", DefaultCircuitResetTimeout)

	v.SetDefault("observability.logs.level", DefaultLogLevel)
	v.SetDefault("observability.logs.format", DefaultLogFormat)
	v.SetDefault("observability.logs.request_body", DefaultLogRequestBody)
	v.SetDefault("observability.metrics.enabled", DefaultMetricsEnabled)
	v.SetDefault("observability.metrics.path", DefaultMetricsPath)
	v.SetDefault("observability.traces.enabled", DefaultTracesEnabled)
	v.SetDefault("observability.traces.exporter", DefaultTracesExporter)
	v.SetDefault("observability.traces.sampling_rate", DefaultSamplingRate)

	v.SetDefault("guardrails.enabled", DefaultGuardrailsEnabled)
	v.SetDefault("guardrails.pii_detection", DefaultPIIDetection)
	v.SetDefault("guardrails.pii_action", DefaultPIIAction)
	v.SetDefault("guardrails.content_policy.enabled", DefaultContentPolicy)

	v.SetDefault("privacy.telemetry", DefaultTelemetry)
	v.SetDefault("privacy.request_logging", DefaultRequestLogging)
	v.SetDefault("privacy.log_request_bodies", DefaultLogRequestBodies)
	v.SetDefault("privacy.anonymize_logs_after", DefaultAnonymizeAfter)
}

// applyEnvOverrides applies environment variable overrides directly.
// This bypasses Viper's unreliable nested key env binding.
func applyEnvOverrides(cfg *Config) {
	// Expand ${VAR} references in string values from config file.
	cfg.Admin.APIKey = os.ExpandEnv(cfg.Admin.APIKey)
	cfg.Store.Postgres.URL = os.ExpandEnv(cfg.Store.Postgres.URL)

	// Direct env var overrides.
	envStr := func(key string, aliases ...string) string {
		if v := os.Getenv(key); v != "" {
			return v
		}
		for _, a := range aliases {
			if v := os.Getenv(a); v != "" {
				return v
			}
		}
		return ""
	}

	if v := envStr("RAVEN_SERVER_HOST"); v != "" {
		cfg.Server.Host = v
	}
	if v := envStr("RAVEN_SERVER_PORT"); v != "" {
		if p, err := fmt.Sscanf(v, "%d", &cfg.Server.Port); p != 1 || err != nil {
			_ = err
		}
	}
	if v := envStr("RAVEN_ADMIN_KEY", "RAVEN_ADMIN_API_KEY"); v != "" {
		cfg.Admin.APIKey = v
	}
	if v := envStr("RAVEN_STORE_DRIVER"); v != "" {
		cfg.Store.Driver = v
	}
	if v := envStr("RAVEN_STORE_SQLITE_PATH"); v != "" {
		cfg.Store.SQLite.Path = v
	}
	if v := envStr("RAVEN_STORE_POSTGRES_URL", "DATABASE_URL"); v != "" {
		cfg.Store.Postgres.URL = v
	}
	if v := envStr("RAVEN_LOG_LEVEL"); v != "" {
		cfg.Observability.Logs.Level = v
	}
	if v := envStr("RAVEN_DASHBOARD_DIR"); v != "" {
		cfg.Admin.Dashboard.Dir = v
	}
}

// Validate checks that the configuration is valid.
func (c *Config) Validate() error {
	if c.Server.Port < 1 || c.Server.Port > 65535 {
		return fmt.Errorf("invalid server port: %d", c.Server.Port)
	}

	if c.Server.TLS.Enabled {
		if c.Server.TLS.CertFile == "" || c.Server.TLS.KeyFile == "" {
			return fmt.Errorf("TLS enabled but cert_file or key_file not set")
		}
	}

	if c.Store.Driver != "sqlite" && c.Store.Driver != "postgres" {
		return fmt.Errorf("unsupported store driver: %s", c.Store.Driver)
	}

	if c.Store.Driver == "sqlite" && c.Store.SQLite.Path == "" {
		return fmt.Errorf("SQLite path not set")
	}

	if c.Store.Driver == "postgres" && c.Store.Postgres.URL == "" {
		return fmt.Errorf("PostgreSQL URL not set")
	}

	return nil
}

// Address returns the server listen address.
func (c *Config) Address() string {
	return fmt.Sprintf("%s:%d", c.Server.Host, c.Server.Port)
}
