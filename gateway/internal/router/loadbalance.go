package router

import (
	"context"
	"fmt"
	"sync/atomic"

	"github.com/bigint-studio/raven/internal/providers"
	"github.com/bigint-studio/raven/pkg/types"
)

// LoadBalancer distributes requests across providers.
type LoadBalancer struct {
	registry *providers.Registry
	health   *providers.HealthChecker
	counter  atomic.Uint64
}

// NewLoadBalancer creates a new load balancer.
func NewLoadBalancer(registry *providers.Registry, health *providers.HealthChecker) *LoadBalancer {
	return &LoadBalancer{
		registry: registry,
		health:   health,
	}
}

// Route selects a provider using round-robin across healthy providers.
func (lb *LoadBalancer) Route(_ context.Context, req *types.ProxyRequest) (*types.RouteDecision, error) {
	allProviders := lb.registry.ListProviders()

	// Filter to healthy providers that have the requested model.
	var candidates []string
	for _, name := range allProviders {
		if !lb.health.IsHealthy(name) {
			continue
		}
		_, exists := lb.registry.GetModelSpec(name, req.Model)
		if exists {
			candidates = append(candidates, name)
		}
	}

	if len(candidates) == 0 {
		// Fallback: try to resolve from model name.
		provider, modelID, ok := lb.registry.ResolveModel(req.OriginalModel)
		if !ok {
			return nil, fmt.Errorf("no healthy providers available for model %q", req.OriginalModel)
		}
		spec, exists := lb.registry.GetSpec(provider)
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

	// Round-robin selection.
	idx := lb.counter.Add(1) % uint64(len(candidates))
	selected := candidates[idx]

	spec, _ := lb.registry.GetSpec(selected)
	req.Provider = selected

	return &types.RouteDecision{
		Provider: selected,
		Model:    req.Model,
		BaseURL:  spec.BaseURL,
	}, nil
}
