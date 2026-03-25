package proxy

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/logger"
)

const (
	latencyAlpha      = 0.3
	latencyTTL        = 30 * 24 * time.Hour // 30 days
	costTTL           = 35 * 24 * time.Hour // 35 days
)

// Lua script to atomically update latency EMA and cumulative cost.
//
// KEYS[1] = latency key
// KEYS[2] = cost key (may be empty string if cost <= 0)
// ARGV[1] = latencyMs
// ARGV[2] = alpha
// ARGV[3] = latency TTL seconds
// ARGV[4] = cost amount
// ARGV[5] = cost TTL seconds
var updateMetricsLua = redis.NewScript(`
local existing = redis.call('GET', KEYS[1])
local latency = tonumber(ARGV[1])
local alpha = tonumber(ARGV[2])
local newAvg
if existing == false then
  newAvg = latency
else
  newAvg = alpha * latency + (1 - alpha) * tonumber(existing)
end
redis.call('SET', KEYS[1], string.format('%.2f', newAvg), 'EX', tonumber(ARGV[3]))
local cost = tonumber(ARGV[4])
if cost > 0 then
  redis.call('INCRBYFLOAT', KEYS[2], cost)
  redis.call('EXPIRE', KEYS[2], tonumber(ARGV[5]))
end
return 1
`)

func UpdateMetrics(ctx context.Context, rdb *redis.Client, configID string, latencyMs int64, cost float64) {
	latencyKey := "latency:" + configID

	costKey := ""
	if cost > 0 {
		now := time.Now().UTC()
		monthKey := fmt.Sprintf("%d-%02d", now.Year(), now.Month())
		costKey = fmt.Sprintf("cost:%s:%s", configID, monthKey)
	}

	latencyTTLSec := int(latencyTTL.Seconds())
	costTTLSec := int(costTTL.Seconds())

	keys := []string{latencyKey, costKey}
	args := []any{latencyMs, latencyAlpha, latencyTTLSec, cost, costTTLSec}

	if err := updateMetricsLua.Run(ctx, rdb, keys, args...).Err(); err != nil {
		logger.Warn("failed to update metrics", "configId", configID, "error", err)
	}
}
