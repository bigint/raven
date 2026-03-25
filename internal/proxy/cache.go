package proxy

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/crypto"
)

// CacheResult is defined in pipeline.go

const defaultCacheTTL = time.Hour

func buildCacheKey(provider, model string, body map[string]any) string {
	content := body["messages"]
	if content == nil {
		content = body["input"]
	}
	if content == nil {
		content = []any{}
	}

	temperature := body["temperature"]
	system := body["system"]
	tools := body["tools"]

	contentJSON, _ := json.Marshal(content)
	systemJSON, _ := json.Marshal(system)
	toolsJSON, _ := json.Marshal(tools)

	tempStr := "null"
	if temperature != nil {
		tempBytes, _ := json.Marshal(temperature)
		tempStr = string(tempBytes)
	}

	payload := provider + ":" + model + ":" + string(contentJSON) + ":" + tempStr + ":" + string(systemJSON) + ":" + string(toolsJSON)
	hash := crypto.HashSHA256(payload)
	return "cache:resp:" + hash
}

// CheckResponseCache checks if a cached response exists for the given request.
func CheckResponseCache(ctx context.Context, rdb *redis.Client, provider string, requestBody map[string]any) *CacheResult {
	// Skip caching for streaming requests
	if stream, ok := requestBody["stream"].(bool); ok && stream {
		return &CacheResult{Hit: false}
	}

	model := "unknown"
	if m, ok := requestBody["model"].(string); ok {
		model = m
	}

	key := buildCacheKey(provider, model, requestBody)
	cached, err := rdb.Get(ctx, key).Result()
	if err != nil {
		return &CacheResult{Hit: false}
	}

	return &CacheResult{
		Hit:  true,
		Body: cached,
	}
}

// StoreResponseCache stores a response in the cache with the given TTL.
func StoreResponseCache(ctx context.Context, rdb *redis.Client, provider string, requestBody map[string]any, responseBody string, ttl time.Duration) {
	// Skip caching for streaming requests
	if stream, ok := requestBody["stream"].(bool); ok && stream {
		return
	}

	if ttl == 0 {
		ttl = defaultCacheTTL
	}

	model := "unknown"
	if m, ok := requestBody["model"].(string); ok {
		model = m
	}

	key := buildCacheKey(provider, model, requestBody)
	rdb.Set(ctx, key, responseBody, ttl)
}
