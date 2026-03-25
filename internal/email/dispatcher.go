package email

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/logger"
)

const eventsChannel = "raven:events"

type eventPayload struct {
	Type      string         `json:"type"`
	Data      map[string]any `json:"data"`
	Timestamp string         `json:"timestamp"`
}

// InitDispatcher subscribes to Redis pub/sub and sends emails for relevant events.
func InitDispatcher(pool *pgxpool.Pool, rdb *redis.Client) {
	subscriber := rdb.Subscribe(context.Background(), eventsChannel)

	go func() {
		ch := subscriber.Channel()
		for msg := range ch {
			var event eventPayload
			if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
				logger.Warn("email dispatcher: invalid event payload", "error", err)
				continue
			}

			go func(evt eventPayload) {
				switch evt.Type {
				case "budget.alert":
					handleBudgetAlert(context.Background(), pool, evt.Data)
				}
			}(event)
		}
	}()

	logger.Info("email dispatcher: listening for events")
}

func handleBudgetAlert(ctx context.Context, pool *pgxpool.Pool, data map[string]any) {
	// Check email settings
	if !checkEmailSettings(ctx, pool) {
		return
	}

	config := getEmailConfig(ctx, pool)
	if config == nil {
		return
	}

	budgetID, _ := data["budgetId"].(string)
	spent, _ := data["spent"].(float64)
	limitAmount, _ := data["limitAmount"].(float64)
	threshold, _ := data["threshold"].(float64)
	if budgetID == "" {
		return
	}

	// Look up budget name
	var entityType, entityID string
	err := pool.QueryRow(ctx,
		`SELECT entity_type, entity_id FROM budgets WHERE id = $1 LIMIT 1`,
		budgetID,
	).Scan(&entityType, &entityID)

	budgetName := budgetID
	if err == nil {
		budgetName = entityType + ":" + entityID
	}

	// Get admin users
	rows, err := pool.Query(ctx, `SELECT email FROM users WHERE role = 'admin'`)
	if err != nil {
		logger.Error("email dispatcher: query admin users failed", err)
		return
	}
	defer rows.Close()

	html := RenderBudgetAlert(budgetName, spent, limitAmount, threshold)
	subject := "Budget alert: " + budgetName + " has reached its threshold"

	for rows.Next() {
		var email string
		if err := rows.Scan(&email); err != nil {
			continue
		}

		if err := SendEmail(ctx, *config, email, subject, html); err != nil {
			logger.Error("email dispatcher: send budget alert failed", err, "to", email)
		}
	}
}

func checkEmailSettings(ctx context.Context, pool *pgxpool.Pool) bool {
	rows, err := pool.Query(ctx,
		`SELECT key, value FROM settings WHERE key IN ('email_notifications_enabled', 'notify_on_budget_exceeded')`,
	)
	if err != nil {
		return false
	}
	defer rows.Close()

	emailEnabled := false
	budgetNotify := true

	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		switch key {
		case "email_notifications_enabled":
			emailEnabled = value == "true"
		case "notify_on_budget_exceeded":
			budgetNotify = value == "true"
		}
	}

	return emailEnabled && budgetNotify
}

func getEmailConfig(ctx context.Context, pool *pgxpool.Pool) *EmailConfig {
	rows, err := pool.Query(ctx,
		`SELECT key, value FROM settings WHERE key IN ('resend_api_key', 'resend_from_email')`,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	kv := make(map[string]string)
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		kv[key] = value
	}

	apiKey := kv["resend_api_key"]
	if apiKey == "" {
		return nil
	}

	return &EmailConfig{
		APIKey:    apiKey,
		FromEmail: kv["resend_from_email"],
	}
}
