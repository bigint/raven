package plugin

import (
	"log/slog"
	"sync"
)

// Registry manages registered plugins.
type Registry struct {
	mu      sync.RWMutex
	plugins map[string][]Plugin
	all     []Plugin
}

// NewRegistry creates a new plugin registry.
func NewRegistry() *Registry {
	return &Registry{
		plugins: make(map[string][]Plugin),
	}
}

// Register adds a plugin to the registry.
func (r *Registry) Register(p Plugin) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.all = append(r.all, p)

	for _, phase := range p.Phases() {
		r.plugins[phase] = append(r.plugins[phase], p)
	}

	slog.Info("plugin registered", "name", p.Name(), "phases", p.Phases())
}

// GetPlugins returns all plugins registered for a phase.
func (r *Registry) GetPlugins(phase string) []Plugin {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.plugins[phase]
}

// CloseAll closes all registered plugins.
func (r *Registry) CloseAll() {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, p := range r.all {
		if err := p.Close(); err != nil {
			slog.Error("error closing plugin", "name", p.Name(), "error", err)
		}
	}
}
