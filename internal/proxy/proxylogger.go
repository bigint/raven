package proxy

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/logger"
)

const (
	flushInterval = 2 * time.Second
	maxBuffer     = 100
)

type LogData struct {
	VirtualKeyID       string            `json:"virtualKeyId"`
	Provider           string            `json:"provider"`
	ProviderConfigID   string            `json:"providerConfigId"`
	ProviderConfigName string            `json:"providerConfigName"`
	Model              string            `json:"model"`
	Method             string            `json:"method"`
	Path               string            `json:"path"`
	StatusCode         int               `json:"statusCode"`
	InputTokens        int               `json:"inputTokens"`
	OutputTokens       int               `json:"outputTokens"`
	ReasoningTokens    int               `json:"reasoningTokens"`
	Cost               float64           `json:"cost"`
	LatencyMs          int64             `json:"latencyMs"`
	CachedTokens       int               `json:"cachedTokens"`
	CacheHit           bool              `json:"cacheHit"`
	EndUser            string            `json:"endUser"`
	HasImages          bool              `json:"hasImages"`
	ImageCount         int               `json:"imageCount"`
	HasToolUse         bool              `json:"hasToolUse"`
	ToolCount          int               `json:"toolCount"`
	ToolNames          []string          `json:"toolNames"`
	SessionID          string            `json:"sessionId"`
	UserAgent          string            `json:"userAgent"`
	RequestBody        string            `json:"requestBody,omitempty"`
	ResponseBody       string            `json:"responseBody,omitempty"`
	GuardrailMatches   []GuardrailMatch  `json:"guardrailMatches,omitempty"`
}

type logBuffer struct {
	mu      sync.Mutex
	entries []LogData
	pool    *pgxpool.Pool
	timer   *time.Ticker
	done    chan struct{}
	started bool
}

var globalLogBuffer = &logBuffer{
	done: make(chan struct{}),
}

func initLogBuffer(pool *pgxpool.Pool) {
	globalLogBuffer.mu.Lock()
	defer globalLogBuffer.mu.Unlock()

	if globalLogBuffer.started {
		return
	}

	globalLogBuffer.pool = pool
	globalLogBuffer.timer = time.NewTicker(flushInterval)
	globalLogBuffer.started = true

	go func() {
		for {
			select {
			case <-globalLogBuffer.timer.C:
				flushLogBuffer()
			case <-globalLogBuffer.done:
				return
			}
		}
	}()
}

func flushLogBuffer() {
	globalLogBuffer.mu.Lock()
	if len(globalLogBuffer.entries) == 0 || globalLogBuffer.pool == nil {
		globalLogBuffer.mu.Unlock()
		return
	}

	batch := make([]LogData, len(globalLogBuffer.entries))
	copy(batch, globalLogBuffer.entries)
	globalLogBuffer.entries = globalLogBuffer.entries[:0]
	pool := globalLogBuffer.pool
	globalLogBuffer.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	for _, d := range batch {
		var toolNames any
		if len(d.ToolNames) > 0 {
			toolNames = d.ToolNames
		}

		_, err := pool.Exec(ctx,
			`INSERT INTO request_logs (
				virtual_key_id, provider, provider_config_id, model, method, path,
				status_code, input_tokens, output_tokens, reasoning_tokens, cost,
				latency_ms, cached_tokens, cache_hit, end_user, has_images,
				image_count, has_tool_use, tool_count, tool_names, session_id, user_agent
			) VALUES (
				$1, $2, $3, $4, $5, $6,
				$7, $8, $9, $10, $11,
				$12, $13, $14, $15, $16,
				$17, $18, $19, $20, $21, $22
			)`,
			d.VirtualKeyID, d.Provider, d.ProviderConfigID, d.Model, d.Method, d.Path,
			d.StatusCode, d.InputTokens, d.OutputTokens, d.ReasoningTokens, fmt.Sprintf("%.6f", d.Cost),
			d.LatencyMs, d.CachedTokens, d.CacheHit, nilIfEmpty(d.EndUser), d.HasImages,
			d.ImageCount, d.HasToolUse, d.ToolCount, toolNames, nilIfEmpty(d.SessionID), nilIfEmpty(d.UserAgent),
		)
		if err != nil {
			logger.Warn("failed to insert request log", "error", err)
		}
	}
}

func nilIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func LogAndPublish(pool *pgxpool.Pool, data LogData, rdb *redis.Client) {
	initLogBuffer(pool)

	// Publish event
	ctx := context.Background()
	PublishEvent(ctx, rdb, "request.created", data)

	// Buffer log entry
	globalLogBuffer.mu.Lock()
	globalLogBuffer.entries = append(globalLogBuffer.entries, data)
	needsFlush := len(globalLogBuffer.entries) >= maxBuffer
	globalLogBuffer.mu.Unlock()

	if needsFlush {
		go flushLogBuffer()
	}

	// Increment budget spend
	if data.Cost > 0 {
		go IncrementBudgetSpend(ctx, pool, rdb, data.VirtualKeyID, data.Cost)
	}
}

// StopLogBuffer stops the background flush timer and flushes remaining entries.
func StopLogBuffer() {
	globalLogBuffer.mu.Lock()
	if globalLogBuffer.timer != nil {
		globalLogBuffer.timer.Stop()
	}
	close(globalLogBuffer.done)
	globalLogBuffer.mu.Unlock()

	flushLogBuffer()
}
