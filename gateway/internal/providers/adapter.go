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

// --- Google Gemini adapter ---

// GeminiAdapter handles the Google Gemini/Generative AI API.
type GeminiAdapter struct {
	spec *types.ProviderSpec
}

// NewGeminiAdapter creates a new Gemini adapter.
func NewGeminiAdapter(spec *types.ProviderSpec) *GeminiAdapter {
	return &GeminiAdapter{spec: spec}
}

// Name returns the provider name.
func (a *GeminiAdapter) Name() string { return "google" }

// BaseURL returns the provider's base URL.
func (a *GeminiAdapter) BaseURL() string { return a.spec.BaseURL }

// geminiRequest represents a Gemini generateContent request.
type geminiRequest struct {
	Contents         []geminiContent        `json:"contents"`
	SystemInstruction *geminiContent        `json:"systemInstruction,omitempty"`
	GenerationConfig map[string]any         `json:"generationConfig,omitempty"`
}

// geminiContent represents content in Gemini format.
type geminiContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []geminiPart `json:"parts"`
}

// geminiPart represents a content part in Gemini format.
type geminiPart struct {
	Text string `json:"text,omitempty"`
}

// TransformRequest transforms an OpenAI chat request to the Gemini format.
func (a *GeminiAdapter) TransformRequest(req *types.ProxyRequest) (*http.Request, error) {
	if req.ChatRequest == nil {
		return nil, fmt.Errorf("gemini adapter requires a chat completion request")
	}

	chat := req.ChatRequest
	gemReq := &geminiRequest{
		GenerationConfig: make(map[string]any),
	}

	if chat.Temperature != nil {
		gemReq.GenerationConfig["temperature"] = *chat.Temperature
	}
	if chat.TopP != nil {
		gemReq.GenerationConfig["topP"] = *chat.TopP
	}
	if chat.MaxTokens != nil {
		gemReq.GenerationConfig["maxOutputTokens"] = *chat.MaxTokens
	}

	for _, msg := range chat.Messages {
		content, _ := msg.Content.(string)
		if msg.Role == "system" {
			gemReq.SystemInstruction = &geminiContent{
				Parts: []geminiPart{{Text: content}},
			}
			continue
		}

		role := msg.Role
		if role == "assistant" {
			role = "model"
		}

		gemReq.Contents = append(gemReq.Contents, geminiContent{
			Role:  role,
			Parts: []geminiPart{{Text: content}},
		})
	}

	body, err := json.Marshal(gemReq)
	if err != nil {
		return nil, fmt.Errorf("marshalling gemini request: %w", err)
	}

	action := "generateContent"
	if chat.Stream {
		action = "streamGenerateContent?alt=sse"
	}

	url := fmt.Sprintf("%s/models/%s:%s", a.spec.BaseURL, req.Model, action)
	httpReq, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	return httpReq, nil
}

// geminiResponse represents a Gemini generateContent response.
type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
			Role string `json:"role"`
		} `json:"content"`
		FinishReason string `json:"finishReason"`
	} `json:"candidates"`
	UsageMetadata struct {
		PromptTokenCount     int `json:"promptTokenCount"`
		CandidatesTokenCount int `json:"candidatesTokenCount"`
		TotalTokenCount      int `json:"totalTokenCount"`
	} `json:"usageMetadata"`
	ModelVersion string `json:"modelVersion"`
}

// TransformResponse transforms a Gemini response to OpenAI format.
func (a *GeminiAdapter) TransformResponse(resp *http.Response) (*types.ProxyResponse, error) {
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

	if resp.StatusCode != http.StatusOK {
		return &types.ProxyResponse{StatusCode: resp.StatusCode, Headers: headers, Body: body}, nil
	}

	var gemResp geminiResponse
	if err := json.Unmarshal(body, &gemResp); err != nil {
		return &types.ProxyResponse{StatusCode: resp.StatusCode, Headers: headers, Body: body}, nil
	}

	var content string
	finishReason := "stop"
	if len(gemResp.Candidates) > 0 {
		candidate := gemResp.Candidates[0]
		if len(candidate.Content.Parts) > 0 {
			content = candidate.Content.Parts[0].Text
		}
		if candidate.FinishReason == "MAX_TOKENS" {
			finishReason = "length"
		}
	}

	openaiResp := types.ChatCompletionResponse{
		Object: "chat.completion",
		Model:  gemResp.ModelVersion,
		Choices: []types.Choice{
			{
				Index:        0,
				Message:      &types.Message{Role: "assistant", Content: content},
				FinishReason: &finishReason,
			},
		},
		Usage: &types.Usage{
			PromptTokens:     gemResp.UsageMetadata.PromptTokenCount,
			CompletionTokens: gemResp.UsageMetadata.CandidatesTokenCount,
			TotalTokens:      gemResp.UsageMetadata.TotalTokenCount,
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

// TransformStreamChunk transforms a Gemini stream chunk to OpenAI format.
func (a *GeminiAdapter) TransformStreamChunk(chunk []byte) ([]byte, error) {
	var gemResp geminiResponse
	if err := json.Unmarshal(chunk, &gemResp); err != nil {
		return chunk, nil
	}

	if len(gemResp.Candidates) == 0 {
		return nil, nil
	}

	var text string
	if len(gemResp.Candidates[0].Content.Parts) > 0 {
		text = gemResp.Candidates[0].Content.Parts[0].Text
	}

	streamChunk := types.StreamChunk{
		Object: "chat.completion.chunk",
		Choices: []types.StreamChoice{
			{
				Index: 0,
				Delta: types.Message{Role: "assistant", Content: text},
			},
		},
	}

	return json.Marshal(streamChunk)
}

// SupportsStreaming returns true.
func (a *GeminiAdapter) SupportsStreaming() bool { return true }

// AuthHeaders returns API key as query param (handled in URL for Gemini).
func (a *GeminiAdapter) AuthHeaders(apiKey string) map[string]string {
	if apiKey == "" {
		return nil
	}
	// Gemini uses query param key= for auth. We pass it as a header for the proxy
	// to add as a query parameter.
	return map[string]string{"x-goog-api-key": apiKey}
}

// Models returns all model IDs for Gemini.
func (a *GeminiAdapter) Models() []string {
	models := make([]string, len(a.spec.Models))
	for i, m := range a.spec.Models {
		models[i] = m.ID
	}
	return models
}

// --- Cohere adapter ---

// CohereAdapter handles the Cohere API.
type CohereAdapter struct {
	spec *types.ProviderSpec
}

// NewCohereAdapter creates a new Cohere adapter.
func NewCohereAdapter(spec *types.ProviderSpec) *CohereAdapter {
	return &CohereAdapter{spec: spec}
}

// Name returns the provider name.
func (a *CohereAdapter) Name() string { return "cohere" }

// BaseURL returns the provider's base URL.
func (a *CohereAdapter) BaseURL() string { return a.spec.BaseURL }

// cohereRequest represents a Cohere chat request.
type cohereRequest struct {
	Model    string      `json:"model"`
	Messages []any       `json:"messages"`
	Stream   bool        `json:"stream,omitempty"`
}

// TransformRequest transforms an OpenAI chat request to Cohere format.
func (a *CohereAdapter) TransformRequest(req *types.ProxyRequest) (*http.Request, error) {
	if req.ChatRequest == nil {
		return nil, fmt.Errorf("cohere adapter requires a chat completion request")
	}

	chat := req.ChatRequest
	cohReq := &cohereRequest{
		Model:  req.Model,
		Stream: chat.Stream,
	}

	var messages []any
	for _, msg := range chat.Messages {
		messages = append(messages, map[string]any{
			"role":    msg.Role,
			"content": msg.Content,
		})
	}
	cohReq.Messages = messages

	body, err := json.Marshal(cohReq)
	if err != nil {
		return nil, fmt.Errorf("marshalling cohere request: %w", err)
	}

	url := a.spec.BaseURL + "/chat"
	httpReq, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	return httpReq, nil
}

// TransformResponse transforms a Cohere response to OpenAI format.
func (a *CohereAdapter) TransformResponse(resp *http.Response) (*types.ProxyResponse, error) {
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

	if resp.StatusCode != http.StatusOK {
		return &types.ProxyResponse{StatusCode: resp.StatusCode, Headers: headers, Body: body}, nil
	}

	// Cohere v2 chat uses a similar structure. Parse and convert.
	var cohResp struct {
		ID      string `json:"id"`
		Message struct {
			Role    string `json:"role"`
			Content []struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
		Usage        struct {
			Tokens struct {
				InputTokens  int `json:"input_tokens"`
				OutputTokens int `json:"output_tokens"`
			} `json:"tokens"`
		} `json:"usage"`
	}

	if err := json.Unmarshal(body, &cohResp); err != nil {
		return &types.ProxyResponse{StatusCode: resp.StatusCode, Headers: headers, Body: body}, nil
	}

	var content string
	for _, c := range cohResp.Message.Content {
		if c.Type == "text" {
			content = c.Text
		}
	}

	finishReason := "stop"
	if cohResp.FinishReason == "MAX_TOKENS" {
		finishReason = "length"
	}

	openaiResp := types.ChatCompletionResponse{
		ID:     cohResp.ID,
		Object: "chat.completion",
		Choices: []types.Choice{
			{
				Index:        0,
				Message:      &types.Message{Role: "assistant", Content: content},
				FinishReason: &finishReason,
			},
		},
		Usage: &types.Usage{
			PromptTokens:     cohResp.Usage.Tokens.InputTokens,
			CompletionTokens: cohResp.Usage.Tokens.OutputTokens,
			TotalTokens:      cohResp.Usage.Tokens.InputTokens + cohResp.Usage.Tokens.OutputTokens,
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

// TransformStreamChunk transforms a Cohere stream chunk to OpenAI format.
func (a *CohereAdapter) TransformStreamChunk(chunk []byte) ([]byte, error) {
	var event struct {
		Type  string `json:"type"`
		Delta struct {
			Message struct {
				Content struct {
					Text string `json:"text"`
				} `json:"content"`
			} `json:"message"`
		} `json:"delta"`
	}

	if err := json.Unmarshal(chunk, &event); err != nil {
		return chunk, nil
	}

	if event.Type == "content-delta" {
		streamChunk := types.StreamChunk{
			Object: "chat.completion.chunk",
			Choices: []types.StreamChoice{
				{
					Index: 0,
					Delta: types.Message{Role: "assistant", Content: event.Delta.Message.Content.Text},
				},
			},
		}
		return json.Marshal(streamChunk)
	}

	if event.Type == "message-end" {
		return []byte("[DONE]"), nil
	}

	return nil, nil
}

// SupportsStreaming returns true.
func (a *CohereAdapter) SupportsStreaming() bool { return true }

// AuthHeaders returns Cohere auth headers.
func (a *CohereAdapter) AuthHeaders(apiKey string) map[string]string {
	if apiKey == "" {
		return nil
	}
	return map[string]string{"Authorization": "Bearer " + apiKey}
}

// Models returns all model IDs for Cohere.
func (a *CohereAdapter) Models() []string {
	models := make([]string, len(a.spec.Models))
	for i, m := range a.spec.Models {
		models[i] = m.ID
	}
	return models
}

// --- Azure OpenAI adapter ---

// AzureOpenAIAdapter handles Azure OpenAI deployments.
type AzureOpenAIAdapter struct {
	spec *types.ProviderSpec
}

// NewAzureOpenAIAdapter creates a new Azure OpenAI adapter.
func NewAzureOpenAIAdapter(spec *types.ProviderSpec) *AzureOpenAIAdapter {
	return &AzureOpenAIAdapter{spec: spec}
}

// Name returns the provider name.
func (a *AzureOpenAIAdapter) Name() string { return "azure-openai" }

// BaseURL returns the provider's base URL.
func (a *AzureOpenAIAdapter) BaseURL() string { return a.spec.BaseURL }

// TransformRequest creates a request for Azure OpenAI.
func (a *AzureOpenAIAdapter) TransformRequest(req *types.ProxyRequest) (*http.Request, error) {
	// Azure uses deployment-based URLs. The base URL template includes {resource} and {deployment}.
	// For now, we pass the body through.
	endpoint := "/chat/completions"
	switch req.Endpoint {
	case "completions":
		endpoint = "/completions"
	case "embeddings":
		endpoint = "/embeddings"
	}

	url := a.spec.BaseURL + endpoint + "?api-version=2024-02-15-preview"

	httpReq, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(req.Body))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	return httpReq, nil
}

// TransformResponse passes through Azure OpenAI responses.
func (a *AzureOpenAIAdapter) TransformResponse(resp *http.Response) (*types.ProxyResponse, error) {
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

	if resp.StatusCode == http.StatusOK {
		var chatResp types.ChatCompletionResponse
		if err := json.Unmarshal(body, &chatResp); err == nil && chatResp.Usage != nil {
			proxyResp.Usage = chatResp.Usage
		}
	}

	return proxyResp, nil
}

// TransformStreamChunk passes through Azure OpenAI stream chunks.
func (a *AzureOpenAIAdapter) TransformStreamChunk(chunk []byte) ([]byte, error) {
	return chunk, nil
}

// SupportsStreaming returns true.
func (a *AzureOpenAIAdapter) SupportsStreaming() bool { return true }

// AuthHeaders returns Azure OpenAI auth headers.
func (a *AzureOpenAIAdapter) AuthHeaders(apiKey string) map[string]string {
	if apiKey == "" {
		return nil
	}
	return map[string]string{"api-key": apiKey}
}

// Models returns all model IDs for Azure OpenAI.
func (a *AzureOpenAIAdapter) Models() []string {
	models := make([]string, len(a.spec.Models))
	for i, m := range a.spec.Models {
		models[i] = m.ID
	}
	return models
}

// --- AWS Bedrock adapter (placeholder) ---

// BedrockAdapter handles AWS Bedrock (placeholder).
type BedrockAdapter struct {
	spec *types.ProviderSpec
}

// NewBedrockAdapter creates a new Bedrock adapter.
func NewBedrockAdapter(spec *types.ProviderSpec) *BedrockAdapter {
	return &BedrockAdapter{spec: spec}
}

// Name returns the provider name.
func (a *BedrockAdapter) Name() string { return "bedrock" }

// BaseURL returns the provider's base URL.
func (a *BedrockAdapter) BaseURL() string { return "" }

// TransformRequest creates a request for Bedrock.
func (a *BedrockAdapter) TransformRequest(req *types.ProxyRequest) (*http.Request, error) {
	// TODO: Implement SigV4 signed requests for Bedrock.
	return nil, fmt.Errorf("bedrock adapter: not yet implemented")
}

// TransformResponse transforms a Bedrock response.
func (a *BedrockAdapter) TransformResponse(resp *http.Response) (*types.ProxyResponse, error) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}
	return &types.ProxyResponse{StatusCode: resp.StatusCode, Body: body}, nil
}

// TransformStreamChunk transforms a Bedrock stream chunk.
func (a *BedrockAdapter) TransformStreamChunk(chunk []byte) ([]byte, error) {
	return chunk, nil
}

// SupportsStreaming returns true.
func (a *BedrockAdapter) SupportsStreaming() bool { return true }

// AuthHeaders returns empty headers (Bedrock uses SigV4).
func (a *BedrockAdapter) AuthHeaders(_ string) map[string]string { return nil }

// Models returns all model IDs for Bedrock.
func (a *BedrockAdapter) Models() []string {
	if a.spec == nil {
		return nil
	}
	models := make([]string, len(a.spec.Models))
	for i, m := range a.spec.Models {
		models[i] = m.ID
	}
	return models
}

// --- Vertex AI adapter (placeholder) ---

// VertexAIAdapter handles Google Vertex AI (placeholder).
type VertexAIAdapter struct {
	spec *types.ProviderSpec
}

// NewVertexAIAdapter creates a new Vertex AI adapter.
func NewVertexAIAdapter(spec *types.ProviderSpec) *VertexAIAdapter {
	return &VertexAIAdapter{spec: spec}
}

// Name returns the provider name.
func (a *VertexAIAdapter) Name() string { return "vertex-ai" }

// BaseURL returns the provider's base URL.
func (a *VertexAIAdapter) BaseURL() string { return "" }

// TransformRequest creates a request for Vertex AI.
func (a *VertexAIAdapter) TransformRequest(req *types.ProxyRequest) (*http.Request, error) {
	// TODO: Implement Google Cloud auth for Vertex AI.
	return nil, fmt.Errorf("vertex-ai adapter: not yet implemented")
}

// TransformResponse transforms a Vertex AI response.
func (a *VertexAIAdapter) TransformResponse(resp *http.Response) (*types.ProxyResponse, error) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}
	return &types.ProxyResponse{StatusCode: resp.StatusCode, Body: body}, nil
}

// TransformStreamChunk transforms a Vertex AI stream chunk.
func (a *VertexAIAdapter) TransformStreamChunk(chunk []byte) ([]byte, error) {
	return chunk, nil
}

// SupportsStreaming returns true.
func (a *VertexAIAdapter) SupportsStreaming() bool { return true }

// AuthHeaders returns empty headers (Vertex AI uses Google Cloud auth).
func (a *VertexAIAdapter) AuthHeaders(_ string) map[string]string { return nil }

// Models returns all model IDs for Vertex AI.
func (a *VertexAIAdapter) Models() []string {
	if a.spec == nil {
		return nil
	}
	models := make([]string, len(a.spec.Models))
	for i, m := range a.spec.Models {
		models[i] = m.ID
	}
	return models
}
