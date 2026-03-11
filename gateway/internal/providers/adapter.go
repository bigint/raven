package providers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/bigint-studio/raven/pkg/types"
)

// Adapter defines the interface for provider-specific request/response transformations.
type Adapter interface {
	// Name returns the provider name.
	Name() string
	// BaseURL returns the provider's base URL.
	BaseURL() string
	// TransformRequest transforms a proxy request into a provider-specific HTTP request.
	TransformRequest(req *types.ProxyRequest) (*http.Request, error)
	// TransformResponse transforms a provider HTTP response into a proxy response.
	TransformResponse(resp *http.Response) (*types.ProxyResponse, error)
	// TransformStreamChunk transforms a provider-specific stream chunk to OpenAI format.
	TransformStreamChunk(chunk []byte) ([]byte, error)
	// SupportsStreaming returns whether the provider supports streaming.
	SupportsStreaming() bool
	// AuthHeaders returns the authentication headers for the given API key.
	AuthHeaders(apiKey string) map[string]string
	// Models returns the list of model IDs supported by this provider.
	Models() []string
}

// --- OpenAI-compatible adapter ---

// OpenAIAdapter handles providers with OpenAI-compatible APIs.
type OpenAIAdapter struct {
	name string
	spec *types.ProviderSpec
}

// NewOpenAIAdapter creates a new OpenAI-compatible adapter.
func NewOpenAIAdapter(name string, spec *types.ProviderSpec) *OpenAIAdapter {
	return &OpenAIAdapter{name: name, spec: spec}
}

// Name returns the provider name.
func (a *OpenAIAdapter) Name() string { return a.name }

// BaseURL returns the provider's base URL.
func (a *OpenAIAdapter) BaseURL() string { return a.spec.BaseURL }

// TransformRequest creates an HTTP request for an OpenAI-compatible API.
func (a *OpenAIAdapter) TransformRequest(req *types.ProxyRequest) (*http.Request, error) {
	endpoint := "/chat/completions"
	switch req.Endpoint {
	case "completions":
		endpoint = "/completions"
	case "embeddings":
		endpoint = "/embeddings"
	}

	url := a.spec.BaseURL + endpoint

	httpReq, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(req.Body))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	return httpReq, nil
}

// TransformResponse passes through the response from an OpenAI-compatible API.
func (a *OpenAIAdapter) TransformResponse(resp *http.Response) (*types.ProxyResponse, error) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	headers := make(map[string]string)
	for k, v := range resp.Header {
		if len(v) > 0 {
			headers[k] = v[0]
		}
	}

	proxyResp := &types.ProxyResponse{
		StatusCode: resp.StatusCode,
		Headers:    headers,
		Body:       body,
	}

	// Parse usage if available.
	if resp.StatusCode == http.StatusOK {
		var chatResp types.ChatCompletionResponse
		if err := json.Unmarshal(body, &chatResp); err == nil && chatResp.Usage != nil {
			proxyResp.Usage = chatResp.Usage
		}
	}

	return proxyResp, nil
}

// TransformStreamChunk passes through OpenAI-format stream chunks.
func (a *OpenAIAdapter) TransformStreamChunk(chunk []byte) ([]byte, error) {
	return chunk, nil
}

// SupportsStreaming returns true for OpenAI-compatible providers.
func (a *OpenAIAdapter) SupportsStreaming() bool { return true }

// AuthHeaders returns bearer token auth headers.
func (a *OpenAIAdapter) AuthHeaders(apiKey string) map[string]string {
	if apiKey == "" {
		return nil
	}
	return map[string]string{"Authorization": "Bearer " + apiKey}
}

// Models returns all model IDs for this provider.
func (a *OpenAIAdapter) Models() []string {
	models := make([]string, len(a.spec.Models))
	for i, m := range a.spec.Models {
		models[i] = m.ID
	}
	return models
}

// --- Anthropic adapter ---

// AnthropicAdapter handles the Anthropic Messages API.
type AnthropicAdapter struct {
	spec *types.ProviderSpec
}

// NewAnthropicAdapter creates a new Anthropic adapter.
func NewAnthropicAdapter(spec *types.ProviderSpec) *AnthropicAdapter {
	return &AnthropicAdapter{spec: spec}
}

// Name returns the provider name.
func (a *AnthropicAdapter) Name() string { return "anthropic" }

// BaseURL returns the provider's base URL.
func (a *AnthropicAdapter) BaseURL() string { return a.spec.BaseURL }

// anthropicRequest represents an Anthropic Messages API request.
type anthropicRequest struct {
	Model     string `json:"model"`
	MaxTokens int    `json:"max_tokens"`
	System    string `json:"system,omitempty"`
	Messages  []any  `json:"messages"`
	Stream    bool   `json:"stream,omitempty"`
	Tools     []any  `json:"tools,omitempty"`
}

// anthropicMessage represents a message in Anthropic format.
type anthropicMessage struct {
	Role    string `json:"role"`
	Content any    `json:"content"`
}

// TransformRequest transforms an OpenAI chat request to the Anthropic Messages API format.
func (a *AnthropicAdapter) TransformRequest(req *types.ProxyRequest) (*http.Request, error) {
	if req.ChatRequest == nil {
		return nil, fmt.Errorf("anthropic adapter requires a chat completion request")
	}

	chat := req.ChatRequest
	anthReq := &anthropicRequest{
		Model:  req.Model,
		Stream: chat.Stream,
	}

	if chat.MaxTokens != nil {
		anthReq.MaxTokens = *chat.MaxTokens
	} else {
		anthReq.MaxTokens = 4096
	}

	// Separate system messages and convert the rest.
	var messages []any
	for _, msg := range chat.Messages {
		if msg.Role == "system" {
			content, ok := msg.Content.(string)
			if ok {
				anthReq.System = content
			}
			continue
		}
		messages = append(messages, anthropicMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}
	anthReq.Messages = messages

	body, err := json.Marshal(anthReq)
	if err != nil {
		return nil, fmt.Errorf("marshalling anthropic request: %w", err)
	}

	url := a.spec.BaseURL + "/messages"
	httpReq, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	return httpReq, nil
}

// anthropicResponse represents an Anthropic Messages API response.
type anthropicResponse struct {
	ID      string `json:"id"`
	Type    string `json:"type"`
	Role    string `json:"role"`
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	Model        string `json:"model"`
	StopReason   string `json:"stop_reason"`
	StopSequence string `json:"stop_sequence"`
	Usage        struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
		CacheRead    int `json:"cache_read_input_tokens"`
	} `json:"usage"`
}

// TransformResponse transforms an Anthropic response to OpenAI format.
func (a *AnthropicAdapter) TransformResponse(resp *http.Response) (*types.ProxyResponse, error) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	headers := make(map[string]string)
	for k, v := range resp.Header {
		if len(v) > 0 {
			headers[k] = v[0]
		}
	}

	// If non-200, pass through the error.
	if resp.StatusCode != http.StatusOK {
		return &types.ProxyResponse{
			StatusCode: resp.StatusCode,
			Headers:    headers,
			Body:       body,
		}, nil
	}

	var anthResp anthropicResponse
	if err := json.Unmarshal(body, &anthResp); err != nil {
		return &types.ProxyResponse{StatusCode: resp.StatusCode, Headers: headers, Body: body}, nil
	}

	// Convert to OpenAI format.
	var content string
	for _, c := range anthResp.Content {
		if c.Type == "text" {
			content = c.Text
		}
	}

	finishReason := mapAnthropicStopReason(anthResp.StopReason)
	openaiResp := types.ChatCompletionResponse{
		ID:      anthResp.ID,
		Object:  "chat.completion",
		Model:   anthResp.Model,
		Choices: []types.Choice{
			{
				Index:        0,
				Message:      &types.Message{Role: "assistant", Content: content},
				FinishReason: &finishReason,
			},
		},
		Usage: &types.Usage{
			PromptTokens:     anthResp.Usage.InputTokens,
			CompletionTokens: anthResp.Usage.OutputTokens,
			TotalTokens:      anthResp.Usage.InputTokens + anthResp.Usage.OutputTokens,
			CachedTokens:     anthResp.Usage.CacheRead,
		},
	}

	openaiBody, err := json.Marshal(openaiResp)
	if err != nil {
		return nil, fmt.Errorf("marshalling openai response: %w", err)
	}

	return &types.ProxyResponse{
		StatusCode: http.StatusOK,
		Headers:    headers,
		Body:       openaiBody,
		Usage:      openaiResp.Usage,
	}, nil
}

// mapAnthropicStopReason maps Anthropic stop reasons to OpenAI finish reasons.
func mapAnthropicStopReason(reason string) string {
	switch reason {
	case "end_turn":
		return "stop"
	case "max_tokens":
		return "length"
	case "tool_use":
		return "tool_calls"
	default:
		return "stop"
	}
}

// TransformStreamChunk transforms an Anthropic SSE chunk to OpenAI format.
func (a *AnthropicAdapter) TransformStreamChunk(chunk []byte) ([]byte, error) {
	// Anthropic uses event-based SSE. For a basic passthrough, we attempt
	// to convert content_block_delta events.
	var event struct {
		Type  string `json:"type"`
		Delta struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"delta"`
		Index int `json:"index"`
	}

	if err := json.Unmarshal(chunk, &event); err != nil {
		return chunk, nil
	}

	switch event.Type {
	case "content_block_delta":
		streamChunk := types.StreamChunk{
			Object: "chat.completion.chunk",
			Choices: []types.StreamChoice{
				{
					Index: event.Index,
					Delta: types.Message{Role: "assistant", Content: event.Delta.Text},
				},
			},
		}
		return json.Marshal(streamChunk)
	case "message_stop":
		return []byte("[DONE]"), nil
	default:
		return nil, nil
	}
}

// SupportsStreaming returns true.
func (a *AnthropicAdapter) SupportsStreaming() bool { return true }

// AuthHeaders returns Anthropic-style auth headers.
func (a *AnthropicAdapter) AuthHeaders(apiKey string) map[string]string {
	if apiKey == "" {
		return nil
	}
	return map[string]string{"x-api-key": apiKey}
}

// Models returns all model IDs for Anthropic.
func (a *AnthropicAdapter) Models() []string {
	models := make([]string, len(a.spec.Models))
	for i, m := range a.spec.Models {
		models[i] = m.ID
	}
	return models
}

