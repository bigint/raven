package ratelimit

import (
	"sync"
	"time"
)

// windowEntry tracks requests in a time window.
type windowEntry struct {
	count     int
	windowEnd time.Time
}

// SlidingWindowLimiter implements a sliding window rate limiter.
type SlidingWindowLimiter struct {
	mu      sync.Mutex
	windows map[string]*windowEntry
	limit   int
	window  time.Duration
}

// NewSlidingWindowLimiter creates a new sliding window rate limiter.
func NewSlidingWindowLimiter(limit int, window time.Duration) *SlidingWindowLimiter {
	return &SlidingWindowLimiter{
		windows: make(map[string]*windowEntry),
		limit:   limit,
		window:  window,
	}
}

// Allow checks if a request is allowed under the rate limit.
func (l *SlidingWindowLimiter) Allow(key string, cost int) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	entry, exists := l.windows[key]

	if !exists || now.After(entry.windowEnd) {
		l.windows[key] = &windowEntry{
			count:     cost,
			windowEnd: now.Add(l.window),
		}
		return true
	}

	if entry.count+cost > l.limit {
		return false
	}

	entry.count += cost
	return true
}

// Reset resets the rate limit for a key.
func (l *SlidingWindowLimiter) Reset(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.windows, key)
}
