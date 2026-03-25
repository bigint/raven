package proxy

import (
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/logger"
)

const lastUsedTTL = 300 * time.Second

func UpdateLastUsed(ctx context.Context, rdb *redis.Client, keyID string) {
	key := "lastused:" + keyID
	if err := rdb.Set(ctx, key, strconv.FormatInt(time.Now().UnixMilli(), 10), lastUsedTTL).Err(); err != nil {
		logger.Warn("failed to buffer lastUsedAt", "error", err)
	}
}

// FlushLastUsed scans all buffered lastused:* keys in Redis, batch updates
// the database, and deletes the Redis keys.
func FlushLastUsed(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client) {
	var cursor uint64
	var allKeys []string

	for {
		keys, nextCursor, err := rdb.Scan(ctx, cursor, "lastused:*", 100).Result()
		if err != nil {
			logger.Warn("failed to scan lastused keys", "error", err)
			return
		}
		allKeys = append(allKeys, keys...)
		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}

	if len(allKeys) == 0 {
		return
	}

	// MGET all values
	values, err := rdb.MGet(ctx, allKeys...).Result()
	if err != nil {
		logger.Warn("failed to mget lastused values", "error", err)
		return
	}

	type update struct {
		keyID     string
		timestamp time.Time
	}

	var updates []update
	var keysToDelete []string

	for i, key := range allKeys {
		if values[i] == nil {
			continue
		}
		val, ok := values[i].(string)
		if !ok || val == "" {
			continue
		}
		ms, err := strconv.ParseInt(val, 10, 64)
		if err != nil {
			continue
		}
		keyID := strings.TrimPrefix(key, "lastused:")
		updates = append(updates, update{
			keyID:     keyID,
			timestamp: time.UnixMilli(ms),
		})
		keysToDelete = append(keysToDelete, key)
	}

	if len(updates) == 0 {
		return
	}

	// Batch update database
	for _, u := range updates {
		_, err := pool.Exec(ctx,
			"UPDATE virtual_keys SET last_used_at = $1 WHERE id = $2",
			u.timestamp, u.keyID,
		)
		if err != nil {
			logger.Warn("failed to flush lastUsedAt", "keyId", u.keyID, "error", err)
		}
	}

	// Delete Redis keys
	if len(keysToDelete) > 0 {
		if err := rdb.Del(ctx, keysToDelete...).Err(); err != nil {
			logger.Warn("failed to delete lastUsed Redis keys", "error", err)
		}
	}
}
