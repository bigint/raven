// Package plugin provides the plugin system for the Raven gateway.
package plugin

import (
	"context"

	"github.com/bigint-studio/raven/pkg/types"
)

// Plugin defines the interface that all gateway plugins must implement.
type Plugin interface {
	// Name returns the plugin name.
	Name() string
	// Init initializes the plugin with configuration.
	Init(config map[string]any) error
	// Execute runs the plugin logic.
	Execute(ctx context.Context, req *types.ProxyRequest, resp *types.ProxyResponse) error
	// Phases returns the phases this plugin should run in.
	Phases() []string
	// Close cleans up plugin resources.
	Close() error
}
