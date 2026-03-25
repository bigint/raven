package proxy

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/errors"
	"github.com/bigint/raven/internal/logger"
)

const (
	rpmTTL = 60 * time.Second
	rpdTTL = 86400 * time.Second
)

func CheckRateLimit(ctx context.Context, rdb *redis.Client, keyID string, rpm, rpd *int) error {
	if rpm == nil && rpd == nil {
		return nil
	}

	// Check RPM first
	if rpm != nil {
		rpmKey := "rl:rpm:" + keyID
		count, err := rdb.Incr(ctx, rpmKey).Result()
		if err != nil {
			return errors.Internal("Rate limit check failed")
		}
		if count == 1 {
			rdb.Expire(ctx, rpmKey, rpmTTL)
		}
		if count > int64(*rpm) {
			// Undo the increment since we're rejecting
			rdb.Decr(ctx, rpmKey)
			return errors.RateLimit("Rate limit exceeded (requests per minute)")
		}
	}

	// Check RPD second; if it fails, refund the RPM token
	if rpd != nil {
		rpdKey := "rl:rpd:" + keyID
		count, err := rdb.Incr(ctx, rpdKey).Result()
		if err != nil {
			return errors.Internal("Rate limit check failed")
		}
		if count == 1 {
			rdb.Expire(ctx, rpdKey, rpdTTL)
		}
		if count > int64(*rpd) {
			// Undo the RPD increment
			rdb.Decr(ctx, rpdKey)
			// Best-effort refund of RPM token
			if rpm != nil {
				rpmKey := "rl:rpm:" + keyID
				if err := rdb.Decr(ctx, rpmKey).Err(); err != nil {
					logger.Warn("failed to refund RPM token", "error", err)
				}
			}
			return errors.RateLimit("Rate limit exceeded (requests per day)")
		}
	}

	return nil
}
