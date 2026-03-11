package pipeline

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/bigint-studio/raven/internal/plugin"
	"github.com/bigint-studio/raven/pkg/types"
)

// Executor runs plugins in phase order.
type Executor struct {
	registry *plugin.Registry
}

// NewExecutor creates a new pipeline executor.
func NewExecutor(registry *plugin.Registry) *Executor {
	return &Executor{registry: registry}
}

// ExecutePhase runs all plugins registered for a given phase.
func (e *Executor) ExecutePhase(ctx context.Context, phase Phase, req *types.ProxyRequest, resp *types.ProxyResponse) error {
	plugins := e.registry.GetPlugins(phase.String())

	for _, p := range plugins {
		slog.Debug("executing plugin", "plugin", p.Name(), "phase", phase.String())

		if err := p.Execute(ctx, req, resp); err != nil {
			return fmt.Errorf("plugin %s failed in phase %s: %w", p.Name(), phase.String(), err)
		}
	}

	return nil
}
