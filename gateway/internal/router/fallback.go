package router

import (
	"context"
	"fmt"

	"github.com/bigint-studio/raven/internal/config"
	"github.com/bigint-studio/raven/internal/providers"
	"github.com/bigint-studio/raven/pkg/types"
)

// FallbackRouter tries providers in order from a fallback chain.
type FallbackRouter struct {
	cfg      *config.Config
	registry *providers.Registry
	health   *providers.HealthChecker
}

// NewFallbackRouter creates a new fallback router.
func NewFallbackRouter(cfg *config.Config, registry *providers.Registry, health *providers.HealthChecker) *FallbackRouter {
	return &FallbackRouter{cfg: cfg, registry: registry, health: health}
}

// Route selects the first healthy provider from the fallback chain.
func (r *FallbackRouter) Route(_ context.Context, req *types.ProxyRequest) (*types.RouteDecision, error) {
	chain := r.cfg.Routing.FallbackChain

	// If no fallback chain configured, try to resolve from model name.
	if len(chain) == 0 {
		provider, modelID, ok := r.registry.ResolveModel(req.OriginalModel)
		if !ok {
			return nil, fmt.Errorf("cannot resolve model %q and no fallback chain configured", req.OriginalModel)
		}
		chain = []string{provider}
		req.Model = modelID
	}

	for _, providerName := range chain {
		if !r.health.IsHealthy(providerName) {
			continue
		}

		spec, exists := r.registry.GetSpec(providerName)
		if !exists {
			continue
		}

		req.Provider = providerName

		return &types.RouteDecision{
			Provider: providerName,
			Model:    req.Model,
			BaseURL:  spec.BaseURL,
		}, nil
	}

	return nil, fmt.Errorf("all providers in fallback chain are unhealthy")
}
