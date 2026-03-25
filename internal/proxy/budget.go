package proxy

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/errors"
	"github.com/bigint/raven/internal/logger"
)

var periodTTL = map[string]time.Duration{
	"daily":   86400 * time.Second,
	"monthly": 2592000 * time.Second,
}

type budget struct {
	ID             string  `json:"id"`
	EntityID       string  `json:"entityId"`
	EntityType     string  `json:"entityType"`
	LimitAmount    string  `json:"limitAmount"`
	AlertThreshold string  `json:"alertThreshold"`
	Period         string  `json:"period"`
}

func budgetRedisKey(budgetID string) string {
	return "budget:" + budgetID + ":spent"
}

func loadBudgets(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client, virtualKeyID string) ([]budget, error) {
	cacheKey := "budgets:" + virtualKeyID

	// Try cache
	if rdb != nil {
		cached, err := rdb.Get(ctx, cacheKey).Result()
		if err == nil && cached != "" {
			var budgets []budget
			if jsonErr := json.Unmarshal([]byte(cached), &budgets); jsonErr == nil {
				return budgets, nil
			}
		}
	}

	rows, err := pool.Query(ctx,
		"SELECT id, entity_id, entity_type, limit_amount, alert_threshold, period FROM budgets WHERE entity_id = $1",
		virtualKeyID,
	)
	if err != nil {
		return nil, fmt.Errorf("query budgets: %w", err)
	}
	defer rows.Close()

	var budgets []budget
	for rows.Next() {
		var b budget
		if err := rows.Scan(&b.ID, &b.EntityID, &b.EntityType, &b.LimitAmount, &b.AlertThreshold, &b.Period); err != nil {
			return nil, fmt.Errorf("scan budget: %w", err)
		}
		budgets = append(budgets, b)
	}

	// Cache for 15 seconds
	if rdb != nil && budgets != nil {
		data, jsonErr := json.Marshal(budgets)
		if jsonErr == nil {
			rdb.Set(ctx, cacheKey, data, 15*time.Second)
		}
	}

	return budgets, nil
}

func CheckBudgets(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client, virtualKeyID string) error {
	budgets, err := loadBudgets(ctx, pool, rdb, virtualKeyID)
	if err != nil {
		return err
	}

	if len(budgets) == 0 {
		return nil
	}

	// Gather all Redis keys to MGET
	keys := make([]string, len(budgets))
	for i, b := range budgets {
		keys[i] = budgetRedisKey(b.ID)
	}

	spentValues, err := rdb.MGet(ctx, keys...).Result()
	if err != nil {
		return fmt.Errorf("mget budget spent: %w", err)
	}

	for i, b := range budgets {
		spent := 0.0
		if spentValues[i] != nil {
			if s, ok := spentValues[i].(string); ok {
				spent, _ = strconv.ParseFloat(s, 64)
			}
		}

		limit, _ := strconv.ParseFloat(b.LimitAmount, 64)
		threshold, _ := strconv.ParseFloat(b.AlertThreshold, 64)

		if spent >= limit {
			return errors.BudgetExceeded(
				fmt.Sprintf("Budget limit of $%.2f exceeded for %s %q", limit, b.EntityType, b.EntityID),
				map[string]any{
					"budgetId":   b.ID,
					"entityId":   b.EntityID,
					"entityType": b.EntityType,
					"limitAmount": limit,
					"spent":      spent,
				},
			)
		}

		// Alert check
		if threshold > 0 && spent >= threshold*limit {
			debounceKey := "budget:alert:" + b.ID
			isNew, setErr := rdb.SetNX(ctx, debounceKey, "1", time.Hour).Result()
			if setErr == nil && isNew {
				PublishEvent(ctx, rdb, "budget.alert", map[string]any{
					"budgetId":    b.ID,
					"entityId":    b.EntityID,
					"entityType":  b.EntityType,
					"limitAmount": limit,
					"spent":       spent,
					"threshold":   threshold,
				})
			}
		}
	}

	return nil
}

func IncrementBudgetSpend(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client, virtualKeyID string, cost float64) {
	if cost <= 0 {
		return
	}

	budgets, err := loadBudgets(ctx, pool, rdb, virtualKeyID)
	if err != nil {
		logger.Warn("failed to load budgets for increment", "error", err)
		return
	}

	if len(budgets) == 0 {
		return
	}

	pipe := rdb.Pipeline()
	for _, b := range budgets {
		key := budgetRedisKey(b.ID)
		ttl, ok := periodTTL[b.Period]
		if !ok {
			ttl = 2592000 * time.Second
		}
		pipe.IncrByFloat(ctx, key, cost)
		pipe.Expire(ctx, key, ttl)
	}

	if _, err := pipe.Exec(ctx); err != nil {
		logger.Warn("failed to increment budget spend", "error", err)
	}
}

// PublishEvent publishes an event to the Redis event bus.
func PublishEvent(ctx context.Context, rdb *redis.Client, eventType string, data any) {
	if rdb == nil {
		return
	}

	event := map[string]any{
		"type":      eventType,
		"data":      data,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	}

	payload, err := json.Marshal(event)
	if err != nil {
		logger.Warn("failed to marshal event", "error", err)
		return
	}

	if err := rdb.Publish(ctx, "raven:events", payload).Err(); err != nil {
		logger.Warn("failed to publish event", "type", eventType, "error", err)
	}
}
