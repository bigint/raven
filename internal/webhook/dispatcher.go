package webhook

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/crypto"
	"github.com/bigint/raven/internal/logger"
)

const (
	eventsChannel  = "raven:events"
	maxConcurrent  = 10
	configCacheTTL = 30 * time.Second
)

type eventPayload struct {
	Type      string `json:"type"`
	Data      any    `json:"data"`
	Timestamp string `json:"timestamp"`
}

type webhookConfig struct {
	ID     string   `json:"id"`
	URL    string   `json:"url"`
	Secret string   `json:"secret"`
	Events []string `json:"events"`
}

type configCache struct {
	mu        sync.RWMutex
	configs   []webhookConfig
	expiresAt time.Time
}

// InitDispatcher subscribes to Redis pub/sub and dispatches webhook deliveries.
func InitDispatcher(pool *pgxpool.Pool, rdb *redis.Client) {
	cache := &configCache{}
	semaphore := make(chan struct{}, maxConcurrent)
	subscriber := rdb.Subscribe(context.Background(), eventsChannel)

	go func() {
		ch := subscriber.Channel()
		for msg := range ch {
			var event eventPayload
			if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
				logger.Warn("webhook dispatcher: invalid event payload", "error", err)
				continue
			}

			go func(evt eventPayload) {
				ctx := context.Background()

				configs, err := getWebhookConfigs(ctx, pool, cache)
				if err != nil {
					logger.Error("webhook dispatcher: load configs failed", err)
					return
				}

				timeoutSec, retries := loadWebhookSettings(ctx, pool)

				for _, cfg := range configs {
					if !matchesEvent(cfg.Events, evt.Type) {
						continue
					}

					body, err := json.Marshal(map[string]any{
						"event":     evt.Type,
						"data":      evt.Data,
						"timestamp": evt.Timestamp,
						"webhookId": cfg.ID,
					})
					if err != nil {
						logger.Error("webhook dispatcher: marshal payload failed", err)
						continue
					}

					wh := cfg
					payload := body
					semaphore <- struct{}{}
					go func() {
						defer func() { <-semaphore }()
						deliverWebhook(ctx, wh.URL, payload, wh.Secret, timeoutSec, retries)
					}()
				}
			}(event)
		}
	}()

	logger.Info("webhook dispatcher: listening for events")
}

func getWebhookConfigs(ctx context.Context, pool *pgxpool.Pool, cache *configCache) ([]webhookConfig, error) {
	cache.mu.RLock()
	if time.Now().Before(cache.expiresAt) {
		configs := cache.configs
		cache.mu.RUnlock()
		return configs, nil
	}
	cache.mu.RUnlock()

	cache.mu.Lock()
	defer cache.mu.Unlock()

	// Double-check after acquiring write lock
	if time.Now().Before(cache.expiresAt) {
		return cache.configs, nil
	}

	rows, err := pool.Query(ctx,
		`SELECT id, url, secret, events FROM webhooks WHERE is_enabled = true`,
	)
	if err != nil {
		return nil, fmt.Errorf("query webhooks: %w", err)
	}
	defer rows.Close()

	var configs []webhookConfig
	for rows.Next() {
		var cfg webhookConfig
		var events []string
		if err := rows.Scan(&cfg.ID, &cfg.URL, &cfg.Secret, &events); err != nil {
			logger.Warn("webhook dispatcher: scan webhook config failed", "error", err)
			continue
		}
		cfg.Events = events
		configs = append(configs, cfg)
	}

	cache.configs = configs
	cache.expiresAt = time.Now().Add(configCacheTTL)

	return configs, nil
}

func matchesEvent(events []string, eventType string) bool {
	for _, e := range events {
		if e == eventType {
			return true
		}
	}
	return false
}

func deliverWebhook(ctx context.Context, url string, body []byte, secret string, timeoutSeconds, maxRetries int) {
	signature := crypto.SignHMAC(string(body), secret)
	timeout := time.Duration(timeoutSeconds) * time.Second

	var lastErr error
	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			backoff := time.Duration(math.Pow(2, float64(attempt))) * time.Second
			time.Sleep(backoff)
		}

		reqCtx, cancel := context.WithTimeout(ctx, timeout)
		req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, url, bytes.NewReader(body))
		if err != nil {
			cancel()
			logger.Error("webhook dispatcher: create request failed", err, "url", url)
			return
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Raven-Signature", signature)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			cancel()
			lastErr = err
			logger.Error("webhook dispatcher: delivery attempt failed", err, "url", url, "attempt", attempt+1)
			continue
		}
		io.Copy(io.Discard, resp.Body)
		resp.Body.Close()
		cancel()

		if resp.StatusCode < 400 {
			return
		}

		lastErr = fmt.Errorf("status %d", resp.StatusCode)
		logger.Warn("webhook dispatcher: delivery got error status", "url", url, "status", resp.StatusCode, "attempt", attempt+1)
	}

	logger.Error("webhook dispatcher: delivery failed after all retries", lastErr, "url", url)
}

func loadWebhookSettings(ctx context.Context, pool *pgxpool.Pool) (timeoutSeconds, retryCount int) {
	timeoutSeconds = 10
	retryCount = 3

	rows, err := pool.Query(ctx,
		`SELECT key, value FROM settings WHERE key IN ('webhook_timeout_seconds', 'webhook_retry_count')`,
	)
	if err != nil {
		return
	}
	defer rows.Close()

	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		switch key {
		case "webhook_timeout_seconds":
			if n := parseInt(value, 10); n > 0 {
				timeoutSeconds = n
			}
		case "webhook_retry_count":
			if n := parseInt(value, 3); n >= 0 {
				retryCount = n
			}
		}
	}

	return
}

func parseInt(s string, fallback int) int {
	n := 0
	for _, c := range s {
		if c < '0' || c > '9' {
			return fallback
		}
		n = n*10 + int(c-'0')
	}
	if n == 0 && s != "0" {
		return fallback
	}
	return n
}
