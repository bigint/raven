package budget

import (
	"log/slog"
)

// AlertLevel represents the severity of a budget alert.
type AlertLevel string

const (
	// AlertWarning is triggered at 80% budget utilization.
	AlertWarning AlertLevel = "warning"
	// AlertCritical is triggered at 100% budget utilization.
	AlertCritical AlertLevel = "critical"
)

// Alert represents a budget alert.
type Alert struct {
	Level      AlertLevel `json:"level"`
	EntityType string     `json:"entity_type"`
	EntityID   string     `json:"entity_id"`
	Spend      float64    `json:"spend"`
	Limit      float64    `json:"limit"`
	Percentage float64    `json:"percentage"`
	Action     string     `json:"action"`
}

// AlertAction defines what happens when a budget limit is reached.
type AlertAction string

const (
	// ActionReject rejects new requests when budget is exhausted.
	ActionReject AlertAction = "reject"
	// ActionDowngrade switches to a cheaper model.
	ActionDowngrade AlertAction = "downgrade"
	// ActionQueue queues requests for later processing.
	ActionQueue AlertAction = "queue"
)

// CheckAndAlert evaluates a budget result and emits alerts as needed.
func CheckAndAlert(result *BudgetResult, entityType, entityID string) *Alert {
	if result == nil || result.Limit <= 0 {
		return nil
	}

	if result.Percentage >= 100 {
		alert := &Alert{
			Level:      AlertCritical,
			EntityType: entityType,
			EntityID:   entityID,
			Spend:      result.Spend,
			Limit:      result.Limit,
			Percentage: result.Percentage,
			Action:     string(ActionReject),
		}
		slog.Warn("budget limit reached",
			"entity_type", entityType,
			"entity_id", entityID,
			"spend", result.Spend,
			"limit", result.Limit)
		return alert
	}

	if result.Percentage >= 80 {
		alert := &Alert{
			Level:      AlertWarning,
			EntityType: entityType,
			EntityID:   entityID,
			Spend:      result.Spend,
			Limit:      result.Limit,
			Percentage: result.Percentage,
		}
		slog.Info("budget warning threshold reached",
			"entity_type", entityType,
			"entity_id", entityID,
			"spend", result.Spend,
			"limit", result.Limit,
			"percentage", result.Percentage)
		return alert
	}

	return nil
}
