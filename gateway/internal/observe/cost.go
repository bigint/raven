package observe

import (
	"github.com/bigint-studio/raven/internal/providers"
	"github.com/bigint-studio/raven/pkg/types"
)

// CostCalculator computes the cost of API requests.
type CostCalculator struct {
	registry *providers.Registry
}

// NewCostCalculator creates a new cost calculator.
func NewCostCalculator(registry *providers.Registry) *CostCalculator {
	return &CostCalculator{registry: registry}
}

// Calculate computes the cost based on token usage and provider pricing.
func (c *CostCalculator) Calculate(provider, model string, usage *types.Usage) float64 {
	if usage == nil {
		return 0
	}

	spec, ok := c.registry.GetModelSpec(provider, model)
	if !ok {
		return 0
	}

	inputCost := float64(usage.PromptTokens) * spec.InputPricePer1M / 1_000_000
	outputCost := float64(usage.CompletionTokens) * spec.OutputPricePer1M / 1_000_000

	return inputCost + outputCost
}
