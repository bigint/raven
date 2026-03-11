package types

// ProviderSpec defines a provider's configuration loaded from YAML spec files.
type ProviderSpec struct {
	Name           string      `yaml:"name" json:"name"`
	DisplayName    string      `yaml:"display_name" json:"display_name"`
	BaseURL        string      `yaml:"base_url" json:"base_url"`
	AuthType       string      `yaml:"auth_type" json:"auth_type"`
	CompatibleWith string      `yaml:"compatible_with" json:"compatible_with"`
	Models         []ModelSpec `yaml:"models" json:"models"`
}

// ModelSpec defines a model's capabilities and pricing.
type ModelSpec struct {
	ID                string  `yaml:"id" json:"id"`
	ContextWindow     int     `yaml:"context_window" json:"context_window"`
	InputPricePer1M   float64 `yaml:"input_price_per_1m" json:"input_price_per_1m"`
	OutputPricePer1M  float64 `yaml:"output_price_per_1m" json:"output_price_per_1m"`
	SupportsStreaming bool    `yaml:"supports_streaming" json:"supports_streaming"`
	SupportsTools     bool    `yaml:"supports_tools" json:"supports_tools"`
	SupportsVision    bool    `yaml:"supports_vision" json:"supports_vision"`
}

// ProviderHealth represents the health status of a provider.
type ProviderHealth struct {
	Name          string  `json:"name"`
	Healthy       bool    `json:"healthy"`
	Latency       float64 `json:"latency_ms"`
	FailureCount  int     `json:"failure_count"`
	CircuitState  string  `json:"circuit_state"`
	LastCheckUnix int64   `json:"last_check_unix"`
}
