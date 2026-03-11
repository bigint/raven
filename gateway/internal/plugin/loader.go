package plugin

import (
	"fmt"
	"log/slog"

	"github.com/bigint-studio/raven/internal/config"
)

// Loader discovers and loads plugins from configuration.
type Loader struct {
	registry *Registry
}

// NewLoader creates a new plugin loader.
func NewLoader(registry *Registry) *Loader {
	return &Loader{registry: registry}
}

// LoadFromConfig loads plugins from the configuration.
func (l *Loader) LoadFromConfig(plugins []config.PluginConfig) error {
	for _, cfg := range plugins {
		if !cfg.Enabled {
			slog.Debug("plugin disabled, skipping", "name", cfg.Name)
			continue
		}

		p, err := l.createPlugin(cfg)
		if err != nil {
			return fmt.Errorf("loading plugin %s: %w", cfg.Name, err)
		}

		if err := p.Init(cfg.Config); err != nil {
			return fmt.Errorf("initializing plugin %s: %w", cfg.Name, err)
		}

		l.registry.Register(p)
	}

	return nil
}

// createPlugin creates a plugin instance by name.
func (l *Loader) createPlugin(cfg config.PluginConfig) (Plugin, error) {
	// TODO: Implement plugin discovery (built-in registry, shared libraries, etc.)
	return nil, fmt.Errorf("unknown plugin: %s", cfg.Name)
}
