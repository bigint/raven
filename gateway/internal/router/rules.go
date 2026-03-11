package router

import (
	"context"
	"fmt"

	"github.com/bigint-studio/raven/internal/providers"
	"github.com/bigint-studio/raven/pkg/types"
)

// RulesRouter routes based on model name parsing rules.
type RulesRouter struct {
	registry *providers.Registry
}

// NewRulesRouter creates a new rules-based router.
func NewRulesRouter(registry *providers.Registry) *RulesRouter {
	return &RulesRouter{registry: registry}
}

// Route resolves the provider from the model name.
func (r *RulesRouter) Route(_ context.Context, req *types.ProxyRequest) (*types.RouteDecision, error) {
	provider, modelID, ok := r.registry.ResolveModel(req.OriginalModel)
	if !ok {
		return nil, fmt.Errorf("cannot resolve model %q to a provider", req.OriginalModel)
	}

	spec, exists := r.registry.GetSpec(provider)
	if !exists {
		return nil, fmt.Errorf("provider %q not found in registry", provider)
	}

	req.Provider = provider
	req.Model = modelID

	return &types.RouteDecision{
		Provider: provider,
		Model:    modelID,
		BaseURL:  spec.BaseURL,
	}, nil
}
