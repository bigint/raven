// Package ratelimit provides rate limiting for the Raven gateway.
package ratelimit

import (
	"net/http"

	"github.com/bigint-studio/raven/pkg/types"
)

// Limiter defines the rate limiting interface.
type Limiter interface {
	// Allow checks if a request is allowed under the rate limit.
	Allow(key string, cost int) bool
	// Reset resets the rate limit for a key.
	Reset(key string)
}

// Middleware creates rate limiting middleware.
func Middleware(limiter Limiter, keyFunc func(r *http.Request) string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if limiter == nil {
				next.ServeHTTP(w, r)
				return
			}

			key := keyFunc(r)
			if !limiter.Allow(key, 1) {
				types.ErrRateLimited.WriteJSON(w)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
