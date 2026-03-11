// Package budget provides budget management for the Raven gateway.
package budget

import (
	"context"
	"fmt"

	"github.com/bigint-studio/raven/internal/store"
)

// Manager handles budget checking and enforcement.
type Manager struct {
	store store.Store
}

// NewManager creates a new budget manager.
func NewManager(st store.Store) *Manager {
	return &Manager{store: st}
}

// BudgetResult represents the result of a budget check.
type BudgetResult struct {
	Allowed    bool    `json:"allowed"`
	Spend      float64 `json:"spend"`
	Limit      float64 `json:"limit"`
	Remaining  float64 `json:"remaining"`
	Percentage float64 `json:"percentage"`
	Action     string  `json:"action,omitempty"`
}

// Check verifies budget compliance using hierarchical resolution.
// The most restrictive budget wins (key -> user -> team -> org).
func (m *Manager) Check(ctx context.Context, keyID, userID, teamID, orgID string) (*BudgetResult, error) {
	// Check in order: key, user, team, org. Most restrictive wins.
	entities := []struct {
		entityType string
		entityID   string
	}{
		{"key", keyID},
		{"user", userID},
		{"team", teamID},
		{"org", orgID},
	}

	var mostRestrictive *BudgetResult

	for _, e := range entities {
		if e.entityID == "" {
			continue
		}

		budget, err := m.getEntityBudget(ctx, e.entityType, e.entityID)
		if err != nil {
			return nil, fmt.Errorf("checking %s budget: %w", e.entityType, err)
		}

		if budget == nil || budget.Limit <= 0 {
			continue
		}

		if mostRestrictive == nil || budget.Remaining < mostRestrictive.Remaining {
			mostRestrictive = budget
		}
	}

	if mostRestrictive == nil {
		return &BudgetResult{Allowed: true}, nil
	}

	return mostRestrictive, nil
}

// getEntityBudget retrieves budget info for an entity.
func (m *Manager) getEntityBudget(ctx context.Context, entityType, entityID string) (*BudgetResult, error) {
	var limit float64

	switch entityType {
	case "org":
		org, err := m.store.GetOrg(ctx, entityID)
		if err != nil {
			return nil, err
		}
		if org == nil {
			return nil, nil
		}
		limit = org.Budget
	case "team":
		team, err := m.store.GetTeam(ctx, entityID)
		if err != nil {
			return nil, err
		}
		if team == nil {
			return nil, nil
		}
		limit = team.Budget
	case "user":
		user, err := m.store.GetUser(ctx, entityID)
		if err != nil {
			return nil, err
		}
		if user == nil {
			return nil, nil
		}
		limit = user.Budget
	case "key":
		key, err := m.store.GetKey(ctx, entityID)
		if err != nil {
			return nil, err
		}
		if key == nil {
			return nil, nil
		}
		limit = key.Budget
	}

	if limit <= 0 {
		return nil, nil
	}

	period := currentPeriod()
	spend, err := m.store.GetSpend(ctx, entityType, entityID, period)
	if err != nil {
		return nil, err
	}

	remaining := limit - spend
	percentage := (spend / limit) * 100

	return &BudgetResult{
		Allowed:    remaining > 0,
		Spend:      spend,
		Limit:      limit,
		Remaining:  remaining,
		Percentage: percentage,
	}, nil
}

// currentPeriod returns the current budget period string (monthly).
func currentPeriod() string {
	return "monthly"
}
