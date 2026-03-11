// Package cache provides request caching for the Raven gateway.
package cache

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/bigint-studio/raven/pkg/types"
)

// CacheKey uniquely identifies a cacheable request.
type CacheKey struct {
	Provider    string
	Model       string
	Messages    string
	Temperature string
	TopP        string
	Seed        string
}

// Hash returns the SHA-256 hash of the cache key.
func (k CacheKey) Hash() string {
	data := fmt.Sprintf("%s:%s:%s:%s:%s:%s", k.Provider, k.Model, k.Messages, k.Temperature, k.TopP, k.Seed)
	h := sha256.Sum256([]byte(data))
	return hex.EncodeToString(h[:])
}

// CacheEntry represents a cached response.
type CacheEntry struct {
	Response  []byte    `json:"response"`
	Usage     *types.Usage `json:"usage,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// CacheStats holds cache statistics.
type CacheStats struct {
	Hits       int64   `json:"hits"`
	Misses     int64   `json:"misses"`
	Entries    int     `json:"entries"`
	HitRatio   float64 `json:"hit_ratio"`
}

// Cache defines the interface for response caching.
type Cache interface {
	// Get retrieves a cached response by key.
	Get(ctx context.Context, key CacheKey) (*CacheEntry, error)
	// Set stores a response in the cache.
	Set(ctx context.Context, key CacheKey, entry *CacheEntry, ttl time.Duration) error
	// Invalidate removes a cached response.
	Invalidate(ctx context.Context, key CacheKey) error
	// Stats returns cache statistics.
	Stats() CacheStats
}

// Orchestrator manages cache tiers.
type Orchestrator struct {
	exact   Cache
	enabled bool
}

// NewOrchestrator creates a new cache orchestrator.
func NewOrchestrator(exact Cache, enabled bool) *Orchestrator {
	return &Orchestrator{exact: exact, enabled: enabled}
}

// Get retrieves from the cache hierarchy.
func (o *Orchestrator) Get(ctx context.Context, key CacheKey) (*CacheEntry, error) {
	if !o.enabled || o.exact == nil {
		return nil, nil
	}
	return o.exact.Get(ctx, key)
}

// Set stores in the cache hierarchy.
func (o *Orchestrator) Set(ctx context.Context, key CacheKey, entry *CacheEntry, ttl time.Duration) error {
	if !o.enabled || o.exact == nil {
		return nil
	}
	return o.exact.Set(ctx, key, entry, ttl)
}

// Stats returns combined cache stats.
func (o *Orchestrator) Stats() CacheStats {
	if o.exact == nil {
		return CacheStats{}
	}
	return o.exact.Stats()
}

// BuildCacheKey builds a CacheKey from a proxy request.
func BuildCacheKey(req *types.ProxyRequest) CacheKey {
	key := CacheKey{
		Provider: req.Provider,
		Model:    req.Model,
	}

	if req.ChatRequest != nil {
		messagesJSON, _ := json.Marshal(req.ChatRequest.Messages)
		key.Messages = string(messagesJSON)
		if req.ChatRequest.Temperature != nil {
			key.Temperature = fmt.Sprintf("%f", *req.ChatRequest.Temperature)
		}
		if req.ChatRequest.TopP != nil {
			key.TopP = fmt.Sprintf("%f", *req.ChatRequest.TopP)
		}
		if req.ChatRequest.Seed != nil {
			key.Seed = fmt.Sprintf("%d", *req.ChatRequest.Seed)
		}
	}

	return key
}
