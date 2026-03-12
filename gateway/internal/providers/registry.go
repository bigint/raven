// Package providers manages AI provider registration, lookup, and health.
package providers

import (
	"context"
	"embed"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/bigint-studio/raven/pkg/types"
	"gopkg.in/yaml.v3"
)

//go:embed specs/*.yaml
var specsFS embed.FS

// ProviderCredentials holds the API key and optional base URL override for a provider.
type ProviderCredentials struct {
	APIKey  string
	BaseURL string
}

// CredentialStore is the interface needed to load provider configs from the database.
type CredentialStore interface {
	ListProviderConfigs(ctx context.Context) ([]*ProviderConfigEntry, error)
}

// ProviderConfigEntry mirrors the store.ProviderConfig fields needed by the registry.
// This avoids a circular import with the store package.
type ProviderConfigEntry struct {
	Name    string
	APIKey  string
	BaseURL string
	Enabled bool
}

// Registry manages provider specifications and adapters.
type Registry struct {
	mu          sync.RWMutex
	specs       map[string]*types.ProviderSpec
	adapters    map[string]Adapter
	modelMap    map[string]string // model ID -> provider name
	credentials map[string]ProviderCredentials
}

// NewRegistry creates a new provider registry and loads embedded specs.
func NewRegistry() (*Registry, error) {
	r := &Registry{
		specs:       make(map[string]*types.ProviderSpec),
		adapters:    make(map[string]Adapter),
		modelMap:    make(map[string]string),
		credentials: make(map[string]ProviderCredentials),
	}

	if err := r.loadSpecs(); err != nil {
		return nil, fmt.Errorf("loading provider specs: %w", err)
	}

	r.registerDefaultAdapters()

	return r, nil
}

// loadSpecs reads provider spec YAML files from the embedded filesystem.
func (r *Registry) loadSpecs() error {
	entries, err := specsFS.ReadDir("specs")
	if err != nil {
		return fmt.Errorf("reading specs directory: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".yaml") {
			continue
		}

		data, err := specsFS.ReadFile("specs/" + entry.Name())
		if err != nil {
			return fmt.Errorf("reading spec %s: %w", entry.Name(), err)
		}

		spec := &types.ProviderSpec{}
		if err := yaml.Unmarshal(data, spec); err != nil {
			return fmt.Errorf("parsing spec %s: %w", entry.Name(), err)
		}

		r.specs[spec.Name] = spec

		// Build model -> provider mapping.
		for _, model := range spec.Models {
			r.modelMap[model.ID] = spec.Name
			// Also map with provider prefix.
			r.modelMap[spec.Name+"/"+model.ID] = spec.Name
		}

		slog.Debug("loaded provider spec", "provider", spec.Name, "models", len(spec.Models))
	}

	return nil
}

// registerDefaultAdapters sets up the built-in adapter for each provider.
func (r *Registry) registerDefaultAdapters() {
	for name, spec := range r.specs {
		switch spec.CompatibleWith {
		case "anthropic":
			r.adapters[name] = NewAnthropicAdapter(spec)
		default:
			r.adapters[name] = NewOpenAIAdapter(name, spec)
		}
	}
}

// GetSpec returns the provider spec for the given name.
func (r *Registry) GetSpec(name string) (*types.ProviderSpec, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	spec, ok := r.specs[name]
	return spec, ok
}

// GetAdapter returns the adapter for the given provider name.
func (r *Registry) GetAdapter(name string) (Adapter, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	adapter, ok := r.adapters[name]
	return adapter, ok
}

// ResolveModel resolves a model string to provider name and model ID.
// Supports formats like "anthropic/claude-sonnet-4-20250514" or just "gpt-4o".
func (r *Registry) ResolveModel(model string) (provider, modelID string, ok bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Check for explicit provider prefix.
	if idx := strings.Index(model, "/"); idx > 0 {
		p := model[:idx]
		m := model[idx+1:]
		if _, exists := r.specs[p]; exists {
			return p, m, true
		}
	}

	// Look up by model ID.
	if p, exists := r.modelMap[model]; exists {
		return p, model, true
	}

	return "", model, false
}

// ListProviders returns all registered provider names.
func (r *Registry) ListProviders() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	names := make([]string, 0, len(r.specs))
	for name := range r.specs {
		names = append(names, name)
	}
	return names
}

// ListModels returns all models across all providers.
func (r *Registry) ListModels() []types.ModelInfo {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var models []types.ModelInfo
	for name, spec := range r.specs {
		for _, m := range spec.Models {
			models = append(models, types.ModelInfo{
				ID:      m.ID,
				Object:  "model",
				OwnedBy: name,
			})
		}
	}
	return models
}

// GetModelSpec returns the model spec for a given provider and model ID.
func (r *Registry) GetModelSpec(provider, modelID string) (*types.ModelSpec, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	spec, ok := r.specs[provider]
	if !ok {
		return nil, false
	}

	for _, m := range spec.Models {
		if m.ID == modelID {
			return &m, true
		}
	}
	return nil, false
}

// SetCredentials stores the API key and optional base URL override for a provider.
func (r *Registry) SetCredentials(name, apiKey, baseURL string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.credentials[name] = ProviderCredentials{
		APIKey:  apiKey,
		BaseURL: baseURL,
	}
}

// GetCredentials returns the API key and base URL for a provider.
func (r *Registry) GetCredentials(name string) (apiKey string, baseURL string, ok bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	cred, exists := r.credentials[name]
	if !exists {
		return "", "", false
	}
	return cred.APIKey, cred.BaseURL, true
}

// LoadCredentialsFromStore loads all enabled provider configs from the database into the registry.
func (r *Registry) LoadCredentialsFromStore(st CredentialStore) error {
	configs, err := st.ListProviderConfigs(context.Background())
	if err != nil {
		return fmt.Errorf("loading provider credentials from store: %w", err)
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	for _, cfg := range configs {
		if !cfg.Enabled {
			continue
		}
		r.credentials[cfg.Name] = ProviderCredentials{
			APIKey:  cfg.APIKey,
			BaseURL: cfg.BaseURL,
		}
		slog.Debug("loaded provider credentials", "provider", cfg.Name)
	}

	return nil
}

// TestAPIKey validates an API key by making a lightweight request to the provider's models endpoint.
func (r *Registry) TestAPIKey(name, apiKey, baseURL string) error {
	adapter, ok := r.GetAdapter(name)
	if !ok {
		return fmt.Errorf("unknown provider: %s", name)
	}

	targetURL := baseURL
	if targetURL == "" {
		targetURL = adapter.BaseURL()
	}

	req, err := http.NewRequest(http.MethodGet, targetURL+"/models", nil)
	if err != nil {
		return fmt.Errorf("creating request: %w", err)
	}

	for k, v := range adapter.AuthHeaders(apiKey) {
		req.Header.Set(k, v)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("connecting to provider: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return fmt.Errorf("invalid API key")
	}

	if resp.StatusCode >= 500 {
		return fmt.Errorf("provider returned status %d", resp.StatusCode)
	}

	return nil
}
