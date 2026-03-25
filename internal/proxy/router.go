package proxy

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/errors"
)

type RoutingStrategy string

const (
	StrategyRandom       RoutingStrategy = "random"
	StrategyRoundRobin   RoutingStrategy = "round-robin"
	StrategyLeastLatency RoutingStrategy = "least-latency"
	StrategyLeastCost    RoutingStrategy = "least-cost"
)

type providerConfigID struct {
	ID string `json:"id"`
}

func ResolveWithStrategy(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client, providerName string, strategy RoutingStrategy) (string, error) {
	// Load enabled configs for the provider (cached)
	configs, err := loadProviderConfigs(ctx, pool, rdb, providerName)
	if err != nil {
		return "", err
	}

	if len(configs) == 0 {
		return "", errors.NotFound(fmt.Sprintf("No enabled configs for provider '%s'", providerName))
	}

	if len(configs) == 1 {
		return configs[0].ID, nil
	}

	switch strategy {
	case StrategyRoundRobin:
		return roundRobin(ctx, rdb, providerName, configs)
	case StrategyLeastLatency:
		return leastLatency(ctx, rdb, configs)
	case StrategyLeastCost:
		return leastCost(ctx, rdb, configs)
	default:
		return pickRandom(configs), nil
	}
}

func loadProviderConfigs(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client, providerName string) ([]providerConfigID, error) {
	cacheKey := "pc:" + providerName

	if rdb != nil {
		cached, err := rdb.Get(ctx, cacheKey).Result()
		if err == nil && cached != "" {
			var configs []providerConfigID
			if jsonErr := json.Unmarshal([]byte(cached), &configs); jsonErr == nil {
				return configs, nil
			}
		}
	}

	rows, err := pool.Query(ctx,
		"SELECT id FROM provider_configs WHERE provider = $1 AND is_enabled = true LIMIT 50",
		providerName,
	)
	if err != nil {
		return nil, fmt.Errorf("query provider configs: %w", err)
	}
	defer rows.Close()

	var configs []providerConfigID
	for rows.Next() {
		var c providerConfigID
		if err := rows.Scan(&c.ID); err != nil {
			return nil, fmt.Errorf("scan provider config: %w", err)
		}
		configs = append(configs, c)
	}

	if rdb != nil && configs != nil {
		data, jsonErr := json.Marshal(configs)
		if jsonErr == nil {
			rdb.Set(ctx, cacheKey, data, 60*time.Second)
		}
	}

	return configs, nil
}

func pickRandom(configs []providerConfigID) string {
	return configs[rand.Intn(len(configs))].ID
}

func roundRobin(ctx context.Context, rdb *redis.Client, provider string, configs []providerConfigID) (string, error) {
	key := "rr:" + provider
	counter, err := rdb.Incr(ctx, key).Result()
	if err != nil {
		return pickRandom(configs), nil
	}
	rdb.Expire(ctx, key, 86400*time.Second)
	idx := (counter - 1) % int64(len(configs))
	return configs[idx].ID, nil
}

func leastLatency(ctx context.Context, rdb *redis.Client, configs []providerConfigID) (string, error) {
	keys := make([]string, len(configs))
	for i, c := range configs {
		keys[i] = "latency:" + c.ID
	}

	values, err := rdb.MGet(ctx, keys...).Result()
	if err != nil {
		return pickRandom(configs), nil
	}

	bestIdx := -1
	bestLatency := math.Inf(1)

	for i, raw := range values {
		if raw == nil {
			continue
		}
		s, ok := raw.(string)
		if !ok {
			continue
		}
		latency, err := strconv.ParseFloat(s, 64)
		if err != nil {
			continue
		}
		if latency < bestLatency {
			bestLatency = latency
			bestIdx = i
		}
	}

	if bestIdx == -1 {
		return pickRandom(configs), nil
	}

	return configs[bestIdx].ID, nil
}

func leastCost(ctx context.Context, rdb *redis.Client, configs []providerConfigID) (string, error) {
	now := time.Now().UTC()
	monthKey := fmt.Sprintf("%d-%02d", now.Year(), now.Month())

	keys := make([]string, len(configs))
	for i, c := range configs {
		keys[i] = fmt.Sprintf("cost:%s:%s", c.ID, monthKey)
	}

	values, err := rdb.MGet(ctx, keys...).Result()
	if err != nil {
		return pickRandom(configs), nil
	}

	bestIdx := -1
	bestCost := math.Inf(1)

	for i, raw := range values {
		cost := 0.0
		if raw != nil {
			if s, ok := raw.(string); ok {
				cost, _ = strconv.ParseFloat(s, 64)
			}
		}
		if cost < bestCost {
			bestCost = cost
			bestIdx = i
		}
	}

	if bestIdx == -1 {
		return pickRandom(configs), nil
	}

	return configs[bestIdx].ID, nil
}
