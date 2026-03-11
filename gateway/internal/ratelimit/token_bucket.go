package ratelimit

import (
	"sync"
	"time"
)

// bucket represents a single token bucket.
type bucket struct {
	tokens     float64
	maxTokens  float64
	refillRate float64
	lastRefill time.Time
}

// TokenBucketLimiter implements a token bucket rate limiter.
type TokenBucketLimiter struct {
	mu       sync.Mutex
	buckets  map[string]*bucket
	capacity int
	refill   float64 // tokens per second
}

// NewTokenBucketLimiter creates a new token bucket rate limiter.
func NewTokenBucketLimiter(capacity int, refillPerSecond float64) *TokenBucketLimiter {
	return &TokenBucketLimiter{
		buckets:  make(map[string]*bucket),
		capacity: capacity,
		refill:   refillPerSecond,
	}
}

// Allow checks if a request is allowed, consuming tokens.
func (l *TokenBucketLimiter) Allow(key string, cost int) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	b, exists := l.buckets[key]

	if !exists {
		b = &bucket{
			tokens:     float64(l.capacity),
			maxTokens:  float64(l.capacity),
			refillRate: l.refill,
			lastRefill: now,
		}
		l.buckets[key] = b
	}

	// Refill tokens.
	elapsed := now.Sub(b.lastRefill).Seconds()
	b.tokens += elapsed * b.refillRate
	if b.tokens > b.maxTokens {
		b.tokens = b.maxTokens
	}
	b.lastRefill = now

	// Check if enough tokens.
	if b.tokens < float64(cost) {
		return false
	}

	b.tokens -= float64(cost)
	return true
}

// Reset resets the bucket for a key.
func (l *TokenBucketLimiter) Reset(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.buckets, key)
}
