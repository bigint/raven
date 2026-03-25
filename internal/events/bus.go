package events

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/logger"
)

const channel = "raven:events"

var rdb *redis.Client

// InitEventBus stores the Redis client used for publishing events.
func InitEventBus(client *redis.Client) {
	rdb = client
}

// Event is the envelope published to the event channel.
type Event struct {
	Type      string `json:"type"`
	Data      any    `json:"data"`
	Timestamp string `json:"timestamp"`
}

// PublishEvent publishes a JSON event to the raven:events channel.
// Errors are logged but not returned so callers can fire-and-forget.
func PublishEvent(ctx context.Context, eventType string, data any) {
	if rdb == nil {
		return
	}

	evt := Event{
		Type:      eventType,
		Data:      data,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	payload, err := json.Marshal(evt)
	if err != nil {
		logger.Error("failed to marshal event", err, "type", eventType)
		return
	}

	if err := rdb.Publish(ctx, channel, payload).Err(); err != nil {
		logger.Error("failed to publish event", err, "type", eventType)
	}
}
