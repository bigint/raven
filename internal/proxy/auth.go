package proxy

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/crypto"
	"github.com/bigint/raven/internal/errors"
	"github.com/bigint/raven/internal/logger"
)

var keyPattern = regexp.MustCompile(`^Bearer (rk_(?:live|test)_.+)$`)

const virtualKeyCacheTTL = 60 * time.Second

type VirtualKey struct {
	ID           string     `json:"id"`
	IsActive     bool       `json:"isActive"`
	ExpiresAt    *time.Time `json:"expiresAt"`
	RateLimitRpm *int       `json:"rateLimitRpm"`
	RateLimitRpd *int       `json:"rateLimitRpd"`
}

func AuthenticateKey(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client, authHeader string) (*VirtualKey, error) {
	match := keyPattern.FindStringSubmatch(authHeader)
	if match == nil {
		return nil, errors.Unauthorized("Missing or invalid Authorization header")
	}

	rawKey := match[1]
	keyHash := crypto.HashSHA256(rawKey)

	// Try Redis cache first
	if rdb != nil {
		cacheKey := fmt.Sprintf("vk:%s", keyHash)
		cached, err := rdb.Get(ctx, cacheKey).Result()
		if err == nil && cached != "" {
			var vk VirtualKey
			if jsonErr := json.Unmarshal([]byte(cached), &vk); jsonErr == nil {
				return validateVirtualKey(&vk)
			}
		}
	}

	// Query database
	var vk VirtualKey
	err := pool.QueryRow(ctx,
		"SELECT id, is_active, expires_at, rate_limit_rpm, rate_limit_rpd FROM virtual_keys WHERE key_hash = $1 LIMIT 1",
		keyHash,
	).Scan(&vk.ID, &vk.IsActive, &vk.ExpiresAt, &vk.RateLimitRpm, &vk.RateLimitRpd)
	if err != nil {
		return nil, errors.Unauthorized("Invalid virtual key")
	}

	// Cache in Redis
	if rdb != nil {
		cacheKey := fmt.Sprintf("vk:%s", keyHash)
		data, jsonErr := json.Marshal(&vk)
		if jsonErr == nil {
			if setErr := rdb.Set(ctx, cacheKey, data, virtualKeyCacheTTL).Err(); setErr != nil {
				logger.Warn("failed to cache virtual key", "error", setErr)
			}
		}
	}

	return validateVirtualKey(&vk)
}

func validateVirtualKey(vk *VirtualKey) (*VirtualKey, error) {
	if !vk.IsActive {
		return nil, errors.Unauthorized("Virtual key is inactive")
	}

	if vk.ExpiresAt != nil && vk.ExpiresAt.Before(time.Now()) {
		return nil, errors.Unauthorized("Virtual key has expired")
	}

	return vk, nil
}
