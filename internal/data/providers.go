package data

type ProviderConfig struct {
	Label            string
	BaseURL          string
	ChatEndpoint     string
	ModelsEndpoint   string
	ValidationPath   string
	ValidationMethod string
	ValidationBody   string
	AuthHeaders      func(apiKey string) map[string]string
}

var SupportedProviders = []struct {
	Name string
	Slug string
}{
	{Name: "Anthropic", Slug: "anthropic"},
	{Name: "Google", Slug: "google"},
	{Name: "OpenAI", Slug: "openai"},
}

func BearerAuth(apiKey string) map[string]string {
	return map[string]string{"Authorization": "Bearer " + apiKey}
}

var Providers = map[string]ProviderConfig{
	"anthropic": {
		Label:        "Anthropic",
		BaseURL:      "https://api.anthropic.com/v1",
		ChatEndpoint: "/messages",
		ModelsEndpoint: "/models?limit=100",
		ValidationPath:   "/messages",
		ValidationMethod: "POST",
		ValidationBody:   `{"max_tokens":1,"messages":[{"content":"hi","role":"user"}],"model":"claude-sonnet-4-20250514"}`,
		AuthHeaders: func(apiKey string) map[string]string {
			return map[string]string{
				"anthropic-version": "2023-06-01",
				"Content-Type":     "application/json",
				"x-api-key":        apiKey,
			}
		},
	},
	"google": {
		Label:          "Google",
		BaseURL:        "https://generativelanguage.googleapis.com/v1beta",
		ChatEndpoint:   "/chat/completions",
		ModelsEndpoint: "/models",
		ValidationPath: "/models",
		AuthHeaders: func(apiKey string) map[string]string {
			return map[string]string{"x-goog-api-key": apiKey}
		},
	},
	"openai": {
		Label:          "OpenAI",
		BaseURL:        "https://api.openai.com/v1",
		ChatEndpoint:   "/chat/completions",
		ModelsEndpoint: "/models",
		ValidationPath: "/models",
		AuthHeaders:    BearerAuth,
	},
}

func GetProviderConfig(provider string) (ProviderConfig, bool) {
	p, ok := Providers[provider]
	return p, ok
}
