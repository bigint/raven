package cache

import (
	"context"
	"sync"
	"sync/atomic"
	"time"
)

// lruEntry is a cache entry with expiration tracking.
type lruEntry struct {
	entry     *CacheEntry
	expiresAt time.Time
	key       string
}

// ExactCache implements an in-memory LRU cache with TTL support.
type ExactCache struct {
	mu         sync.RWMutex
	entries    map[string]*lruEntry
	order      []string
	maxEntries int
	hits       atomic.Int64
	misses     atomic.Int64
}

// NewExactCache creates a new exact-match cache.
func NewExactCache(maxEntries int) *ExactCache {
	return &ExactCache{
		entries:    make(map[string]*lruEntry),
		order:      make([]string, 0),
		maxEntries: maxEntries,
	}
}

// Get retrieves a cached entry by key hash.
func (c *ExactCache) Get(_ context.Context, key CacheKey) (*CacheEntry, error) {
	hash := key.Hash()

	c.mu.RLock()
	entry, exists := c.entries[hash]
	c.mu.RUnlock()

	if !exists {
		c.misses.Add(1)
		return nil, nil
	}

	// Check TTL.
	if time.Now().After(entry.expiresAt) {
		c.mu.Lock()
		delete(c.entries, hash)
		c.removeFromOrder(hash)
		c.mu.Unlock()
		c.misses.Add(1)
		return nil, nil
	}

	c.hits.Add(1)

	// Move to front (most recently used).
	c.mu.Lock()
	c.moveToFront(hash)
	c.mu.Unlock()

	return entry.entry, nil
}

// Set stores a cache entry with TTL.
func (c *ExactCache) Set(_ context.Context, key CacheKey, entry *CacheEntry, ttl time.Duration) error {
	hash := key.Hash()

	c.mu.Lock()
	defer c.mu.Unlock()

	// Evict if at capacity.
	for len(c.entries) >= c.maxEntries && len(c.order) > 0 {
		oldest := c.order[len(c.order)-1]
		delete(c.entries, oldest)
		c.order = c.order[:len(c.order)-1]
	}

	c.entries[hash] = &lruEntry{
		entry:     entry,
		expiresAt: time.Now().Add(ttl),
		key:       hash,
	}

	// Add to front.
	c.order = append([]string{hash}, c.order...)

	return nil
}

// Invalidate removes a cached entry.
func (c *ExactCache) Invalidate(_ context.Context, key CacheKey) error {
	hash := key.Hash()

	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.entries, hash)
	c.removeFromOrder(hash)
	return nil
}

// Stats returns cache statistics.
func (c *ExactCache) Stats() CacheStats {
	c.mu.RLock()
	entries := len(c.entries)
	c.mu.RUnlock()

	hits := c.hits.Load()
	misses := c.misses.Load()
	total := hits + misses

	var ratio float64
	if total > 0 {
		ratio = float64(hits) / float64(total)
	}

	return CacheStats{
		Hits:     hits,
		Misses:   misses,
		Entries:  entries,
		HitRatio: ratio,
	}
}

// moveToFront moves a key to the front of the order list.
func (c *ExactCache) moveToFront(key string) {
	c.removeFromOrder(key)
	c.order = append([]string{key}, c.order...)
}

// removeFromOrder removes a key from the order list.
func (c *ExactCache) removeFromOrder(key string) {
	for i, k := range c.order {
		if k == key {
			c.order = append(c.order[:i], c.order[i+1:]...)
			return
		}
	}
}
