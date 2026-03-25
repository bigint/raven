package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/logger"
)

const settingsCacheKey = "instance:settings"

// InstanceSettings holds all platform-level settings.
type InstanceSettings struct {
	InstanceName              string  `json:"instance_name"`
	InstanceURL               string  `json:"instance_url"`
	AnalyticsRetentionDays    int     `json:"analytics_retention_days"`
	SignupEnabled             bool    `json:"signup_enabled"`
	SessionTimeoutHours       int     `json:"session_timeout_hours"`
	PasswordMinLength         int     `json:"password_min_length"`
	GlobalRateLimitRpm        int     `json:"global_rate_limit_rpm"`
	GlobalRateLimitRpd        int     `json:"global_rate_limit_rpd"`
	MaxRequestBodySizeMB      int     `json:"max_request_body_size_mb"`
	RequestTimeoutSeconds     int     `json:"request_timeout_seconds"`
	DefaultMaxTokens          int     `json:"default_max_tokens"`
	LogRequestBodies          bool    `json:"log_request_bodies"`
	LogResponseBodies         bool    `json:"log_response_bodies"`
	WebhookTimeoutSeconds     int     `json:"webhook_timeout_seconds"`
	WebhookRetryCount         int     `json:"webhook_retry_count"`
	EmailNotificationsEnabled bool    `json:"email_notifications_enabled"`
	NotifyOnBudgetExceeded    bool    `json:"notify_on_budget_exceeded"`
	NotifyOnProviderErrorSpike bool   `json:"notify_on_provider_error_spike"`
}

var defaults = map[string]string{
	"analytics_retention_days":      "365",
	"default_max_tokens":            "4096",
	"email_notifications_enabled":   "false",
	"global_rate_limit_rpd":         "1000",
	"global_rate_limit_rpm":         "60",
	"instance_name":                 "Raven",
	"instance_url":                  "",
	"log_request_bodies":            "true",
	"log_response_bodies":           "false",
	"max_request_body_size_mb":      "10",
	"notify_on_budget_exceeded":     "true",
	"notify_on_provider_error_spike": "true",
	"password_min_length":           "8",
	"request_timeout_seconds":       "300",
	"session_timeout_hours":         "24",
	"signup_enabled":                "true",
	"webhook_retry_count":           "3",
	"webhook_timeout_seconds":       "10",
}

// GetInstanceSettings loads settings from Redis cache or the database.
func GetInstanceSettings(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client) (*InstanceSettings, error) {
	// Try Redis cache first
	if rdb != nil {
		cached, err := rdb.Get(ctx, settingsCacheKey).Result()
		if err == nil && cached != "" {
			var s InstanceSettings
			if jsonErr := json.Unmarshal([]byte(cached), &s); jsonErr == nil {
				return &s, nil
			}
		}
	}

	// Load from database
	rows, err := pool.Query(ctx, `SELECT key, value FROM settings`)
	if err != nil {
		return nil, fmt.Errorf("query settings: %w", err)
	}
	defer rows.Close()

	raw := make(map[string]string)
	for k, v := range defaults {
		raw[k] = v
	}

	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		if _, ok := defaults[key]; ok {
			raw[key] = value
		}
	}

	settings := parse(raw)

	// Cache in Redis
	if rdb != nil {
		data, err := json.Marshal(settings)
		if err == nil {
			if setErr := rdb.Set(ctx, settingsCacheKey, data, 0).Err(); setErr != nil {
				logger.Warn("failed to cache instance settings", "error", setErr)
			}
		}
	}

	return settings, nil
}

// InvalidateSettingsCache removes the cached settings from Redis.
func InvalidateSettingsCache(ctx context.Context, rdb *redis.Client) error {
	if rdb == nil {
		return nil
	}
	return rdb.Del(ctx, settingsCacheKey).Err()
}

func parse(raw map[string]string) *InstanceSettings {
	return &InstanceSettings{
		InstanceName:               strDefault(raw["instance_name"], "Raven"),
		InstanceURL:                raw["instance_url"],
		AnalyticsRetentionDays:     toInt(raw["analytics_retention_days"], 365),
		SignupEnabled:              toBool(raw["signup_enabled"]),
		SessionTimeoutHours:        toInt(raw["session_timeout_hours"], 24),
		PasswordMinLength:          toInt(raw["password_min_length"], 8),
		GlobalRateLimitRpm:         toInt(raw["global_rate_limit_rpm"], 60),
		GlobalRateLimitRpd:         toInt(raw["global_rate_limit_rpd"], 1000),
		MaxRequestBodySizeMB:       toInt(raw["max_request_body_size_mb"], 10),
		RequestTimeoutSeconds:      toInt(raw["request_timeout_seconds"], 300),
		DefaultMaxTokens:           toInt(raw["default_max_tokens"], 4096),
		LogRequestBodies:           toBool(raw["log_request_bodies"]),
		LogResponseBodies:          toBool(raw["log_response_bodies"]),
		WebhookTimeoutSeconds:      toInt(raw["webhook_timeout_seconds"], 10),
		WebhookRetryCount:          toInt(raw["webhook_retry_count"], 3),
		EmailNotificationsEnabled:  toBool(raw["email_notifications_enabled"]),
		NotifyOnBudgetExceeded:     toBool(raw["notify_on_budget_exceeded"]),
		NotifyOnProviderErrorSpike: toBool(raw["notify_on_provider_error_spike"]),
	}
}

func toBool(v string) bool {
	return v == "true"
}

func toInt(v string, fallback int) int {
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func strDefault(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}

// Unused but preserves the time import for cache TTL operations if needed.
var _ = time.Second
