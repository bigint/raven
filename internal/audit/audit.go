package audit

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/bigint/raven/internal/events"
	"github.com/bigint/raven/internal/logger"
)

// Options configures the audit entry.
type Options struct {
	ResourceID string
	Data       any
	Metadata   map[string]any
}

// AuditAndPublish inserts an audit log entry into the database and
// publishes the corresponding event. Both operations are best-effort:
// failures are logged but do not propagate to the caller.
func AuditAndPublish(
	ctx context.Context,
	pool *pgxpool.Pool,
	userID string,
	resourceType string,
	action string,
	opts Options,
) {
	eventName := fmt.Sprintf("%s.%s", resourceType, action)

	// Publish event (fire-and-forget)
	eventData := opts.Data
	if eventData == nil {
		eventData = map[string]string{"id": opts.ResourceID}
	}
	go events.PublishEvent(ctx, eventName, eventData)

	// Insert audit log row
	go insertAuditLog(ctx, pool, userID, eventName, resourceType, opts)
}

const insertSQL = `
INSERT INTO audit_logs (id, action, actor_id, resource_type, resource_id, metadata)
VALUES ($1, $2, $3, $4, $5, $6)
`

func insertAuditLog(
	ctx context.Context,
	pool *pgxpool.Pool,
	userID string,
	action string,
	resourceType string,
	opts Options,
) {
	id := newID()

	var metadataJSON []byte
	if opts.Metadata != nil {
		var err error
		metadataJSON, err = json.Marshal(opts.Metadata)
		if err != nil {
			logger.Error("failed to marshal audit metadata", err)
			metadataJSON = nil
		}
	}

	_, err := pool.Exec(ctx, insertSQL,
		id,
		action,
		userID,
		resourceType,
		opts.ResourceID,
		metadataJSON,
	)
	if err != nil {
		logger.Error("failed to insert audit log", err,
			"action", action,
			"resourceType", resourceType,
			"resourceId", opts.ResourceID,
		)
	}
}

// newID generates a random 24-character hex string for use as a primary key.
func newID() string {
	b := make([]byte, 12)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%x", b)
}
