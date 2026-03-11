package store

import "time"

// BudgetConfig represents a budget configuration for an entity.
type BudgetConfig struct {
	ID             string    `json:"id"`
	EntityType     string    `json:"entity_type"` // org, team, key
	EntityID       string    `json:"entity_id"`
	Limit          float64   `json:"limit"`
	Period         string    `json:"period"` // daily, weekly, monthly
	CurrentUsage   float64   `json:"current_usage"`
	AlertThreshold float64   `json:"alert_threshold"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
