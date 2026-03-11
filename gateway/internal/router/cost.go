package router

import (
	"context"
	"fmt"
	"math"

	"github.com/bigint-studio/raven/internal/providers"
	"github.com/bigint-studio/raven/pkg/types"
)

// CostRouter selects the cheapest available provider for a model.
type CostRouter struct {
	registry *providers.Registry
	health   *providers.HealthChecker
}

// NewCostRouter creates a new cost-optimized router.
func NewCostRouter(registry *providers.Registry, health *providers.HealthChecker) *CostRouter {
	return &CostRouter{registry: registry, health: health}
}

// Route selects the cheapest healthy provider that supports the requested model.
func (r *CostRouter) Route(_ context.Context, req *types.ProxyRequest) (*types.RouteDecision, error) {
	allProviders := r.registry.ListProviders()

	var bestProvider string
	var bestModel string
	bestCost := math.MaxFloat64
	var bestBaseURL string

	for _, name := range allProviders {
		if !r.health.IsHealthy(name) {
			continue
		}

		modelSpec, exists := r.registry.GetModelSpec(name, req.Model)
		if !exists {
			continue
		}

		// Use combined input+output price as cost heuristic.
		cost := modelSpec.InputPricePer1M + modelSpec.OutputPricePer1M
		if cost < bestCost {
			bestCost = cost
			bestProvider = name
			bestModel = modelSpec.ID
			spec, _ := r.registry.GetSpec(name)
			bestBaseURL = spec.BaseURL
		}
	}

	if bestProvider == "" {
		// Fallback to model name resolution.
		provider, modelID, ok := r.registry.ResolveModel(req.OriginalModel)
		if !ok {
			return nil, fmt.Errorf("no provider found for model %q", req.OriginalModel)
		}
		spec, exists := r.registry.GetSpec(provider)
		if !exists {
			return nil, fmt.Errorf("provider %q not found", provider)
		}
		req.Provider = provider
		req.Model = modelID
		return &types.RouteDecision{
			Provider: provider,
			Model:    modelID,
			BaseURL:  spec.BaseURL,
		}, nil
	}

	req.Provider = bestProvider
	req.Model = bestModel

	return &types.RouteDecision{
		Provider: bestProvider,
		Model:    bestModel,
		BaseURL:  bestBaseURL,
	}, nil
}
