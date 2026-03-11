package budget

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/bigint-studio/raven/internal/store"
)

// Tracker tracks spend per organization, team, user, and key.
type Tracker struct {
	store store.Store
}

// NewTracker creates a new spend tracker.
func NewTracker(st store.Store) *Tracker {
	return &Tracker{store: st}
}

// RecordSpend records spend for all relevant entities.
func (t *Tracker) RecordSpend(ctx context.Context, keyID, userID, teamID, orgID string, amount float64) error {
	entities := []struct {
		entityType string
		entityID   string
	}{
		{"key", keyID},
		{"user", userID},
		{"team", teamID},
		{"org", orgID},
	}

	for _, e := range entities {
		if e.entityID == "" {
			continue
		}

		if err := t.store.IncrementSpend(ctx, e.entityType, e.entityID, amount); err != nil {
			slog.Error("failed to increment spend",
				"entity_type", e.entityType,
				"entity_id", e.entityID,
				"amount", amount,
				"error", err)
			return fmt.Errorf("incrementing %s spend: %w", e.entityType, err)
		}
	}

	return nil
}

// GetSpend returns the current spend for an entity.
func (t *Tracker) GetSpend(ctx context.Context, entityType, entityID string) (float64, error) {
	return t.store.GetSpend(ctx, entityType, entityID, currentPeriod())
}
