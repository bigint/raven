package providers

import (
	"bytes"
	"fmt"
	"net/http"
	"strings"

	"github.com/bigint/raven/internal/data"
)

// strippedHeaders are headers that should not be forwarded to upstream providers.
var strippedHeaders = map[string]struct{}{
	"authorization":      {},
	"connection":         {},
	"content-length":     {},
	"host":               {},
	"origin":             {},
	"referer":            {},
	"sec-ch-ua":          {},
	"sec-ch-ua-mobile":   {},
	"sec-ch-ua-platform": {},
	"sec-fetch-dest":     {},
	"sec-fetch-mode":     {},
	"sec-fetch-site":     {},
	"transfer-encoding":  {},
	"user-agent":         {},
}

// FilterPassthroughHeaders removes headers that should not be forwarded to providers.
func FilterPassthroughHeaders(headers map[string]string) map[string]string {
	filtered := make(map[string]string)
	for k, v := range headers {
		if _, skip := strippedHeaders[strings.ToLower(k)]; !skip {
			filtered[k] = v
		}
	}
	return filtered
}

// CreateProviderRequest builds an HTTP request for the given provider.
func CreateProviderRequest(
	provider, apiKey, baseURL, model, upstreamPath string,
	body []byte,
	headers map[string]string,
	isStreaming bool,
) (*http.Request, error) {
	cfg, ok := data.GetProviderConfig(provider)
	if !ok {
		// Unknown provider: assume OpenAI-compatible
		cfg = data.Providers["openai"]
	}

	if baseURL == "" {
		baseURL = cfg.BaseURL
	}

	endpoint := upstreamPath
	if endpoint == "" || endpoint == "/" {
		endpoint = cfg.ChatEndpoint
	}

	url := strings.TrimRight(baseURL, "/") + endpoint

	// For Google, append the model to the URL if using the native endpoint
	if provider == "google" && strings.Contains(endpoint, "models") {
		url = strings.TrimRight(baseURL, "/") + "/models/" + model + ":generateContent"
		if isStreaming {
			url = strings.TrimRight(baseURL, "/") + "/models/" + model + ":streamGenerateContent?alt=sse"
		}
	}

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	// Set provider-specific auth headers
	authHeaders := cfg.AuthHeaders(apiKey)
	for k, v := range authHeaders {
		req.Header.Set(k, v)
	}

	// Forward passthrough headers (already filtered by caller)
	for k, v := range headers {
		if _, skip := strippedHeaders[strings.ToLower(k)]; !skip {
			req.Header.Set(k, v)
		}
	}

	// Provider-specific streaming headers
	if isStreaming && provider == "anthropic" {
		req.Header.Set("Accept", "text/event-stream")
	}

	return req, nil
}
