// Package router provides request routing for the Raven gateway.
package router

import (
	"context"

	"github.com/bigint-studio/raven/internal/config"
	"github.com/bigint-studio/raven/internal/providers"
	"github.com/bigint-studio/raven/pkg/types"
)

// Router decides which provider to route a request to.
type Router interface {
	// Route selects the target provider for a request.
	Route(ctx context.Context, req *types.ProxyRequest) (*types.RouteDecision, error)
}

// DefaultRouter combines routing strategies.
type DefaultRouter struct {
	cfg      *config.Config
	registry *providers.Registry
	health   *providers.HealthChecker
	rules    *RulesRouter
	fallback *FallbackRouter
	lb       *LoadBalancer
	cost     *CostRouter
}

// NewRouter creates a new default router.
func NewRouter(cfg *config.Config, registry *providers.Registry, health *providers.HealthChecker) *DefaultRouter {
	return &DefaultRouter{
		cfg:      cfg,
		registry: registry,
		health:   health,
		rules:    NewRulesRouter(registry),
		fallback: NewFallbackRouter(cfg, registry, health),
		lb:       NewLoadBalancer(registry, health),
		cost:     NewCostRouter(registry, health),
	}
}

// Route selects a provider based on the configured routing strategy.
func (r *DefaultRouter) Route(ctx context.Context, req *types.ProxyRequest) (*types.RouteDecision, error) {
	switch r.cfg.Routing.Strategy {
	case "fallback":
		return r.fallback.Route(ctx, req)
	case "round-robin", "weighted", "least-latency":
		return r.lb.Route(ctx, req)
	case "cost":
		return r.cost.Route(ctx, req)
	default:
		return r.rules.Route(ctx, req)
	}
}
