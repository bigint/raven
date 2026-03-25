package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/logger"
)

// CachedQuery checks Redis for a cached value under key, returning the
// deserialised result when present. On a cache miss it calls queryFn,
// stores the JSON-encoded result with the given TTL, and returns it.
func CachedQuery[T any](
	ctx context.Context,
	rdb *redis.Client,
	key string,
	ttlSeconds int,
	queryFn func() (T, error),
) (T, error) {
	var zero T

	cached, err := rdb.Get(ctx, key).Result()
	if err == nil {
		var result T
		if uerr := json.Unmarshal([]byte(cached), &result); uerr != nil {
			logger.Warn("cache unmarshal failed, falling through to query", "key", key, "error", uerr.Error())
		} else {
			return result, nil
		}
	}

	result, err := queryFn()
	if err != nil {
		return zero, err
	}

	data, err := json.Marshal(result)
	if err != nil {
		return result, nil // return result even if we cannot cache
	}

	if setErr := rdb.Set(ctx, key, data, time.Duration(ttlSeconds)*time.Second).Err(); setErr != nil {
		logger.Warn("cache set failed", "key", key, "error", setErr.Error())
	}

	return result, nil
}

// Cache key builders

// VirtualKey returns the cache key for a virtual key hash.
func VirtualKey(hash string) string {
	return fmt.Sprintf("vk:%s", hash)
}

// Budgets returns the cache key for a key's budget data.
func Budgets(keyID string) string {
	return fmt.Sprintf("budgets:%s", keyID)
}

// ProviderConfigs returns the cache key for a provider's configuration.
func ProviderConfigs(provider string) string {
	return fmt.Sprintf("pc:%s", provider)
}
