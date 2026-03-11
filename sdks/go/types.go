// Package raven provides a Go client for the Raven AI Gateway.
//
// The client supports chat completions (including streaming), embeddings,
// model listing, and admin operations. It includes automatic retry with
// exponential backoff for transient failures.
package raven

import "time"

// ChatCompletionRequest represents an OpenAI-compatible chat completion request.
type ChatCompletionRequest struct {
	Model            string          `json:"model"`
	Messages         []Message       `json:"messages"`
	Temperature      *float64        `json:"temperature,omitempty"`
	TopP             *float64        `json:"top_p,omitempty"`
	N                *int            `json:"n,omitempty"`
	Stream           bool            `json:"stream,omitempty"`
	Stop             any             `json:"stop,omitempty"`
	MaxTokens        *int            `json:"max_tokens,omitempty"`
	PresencePenalty  *float64        `json:"presence_penalty,omitempty"`
	FrequencyPenalty *float64        `json:"frequency_penalty,omitempty"`
	LogitBias        map[string]int  `json:"logit_bias,omitempty"`
	User             string          `json:"user,omitempty"`
	Seed             *int            `json:"seed,omitempty"`
	Tools            []Tool          `json:"tools,omitempty"`
	ToolChoice       any             `json:"tool_choice,omitempty"`
	ResponseFormat   *ResponseFormat `json:"response_format,omitempty"`
	StreamOptions    *StreamOptions  `json:"stream_options,omitempty"`
}

// StreamOptions represents stream configuration options.
type StreamOptions struct {
	IncludeUsage bool `json:"include_usage,omitempty"`
}

// ResponseFormat specifies the format of the model's output.
type ResponseFormat struct {
	Type string `json:"type"`
}

// Message represents a single message in a chat conversation.
type Message struct {
	Role       string     `json:"role"`
	Content    any        `json:"content"`
	Name       string     `json:"name,omitempty"`
	ToolCalls  []ToolCall `json:"tool_calls,omitempty"`
	ToolCallID string     `json:"tool_call_id,omitempty"`
}

// ContentPart represents a multimodal content part within a message.
type ContentPart struct {
	Type     string    `json:"type"`
	Text     string    `json:"text,omitempty"`
	ImageURL *ImageURL `json:"image_url,omitempty"`
}

// ImageURL represents an image URL in a content part.
type ImageURL struct {
	URL    string `json:"url"`
	Detail string `json:"detail,omitempty"`
}

// Tool represents a tool definition that the model may use.
type Tool struct {
	Type     string       `json:"type"`
	Function ToolFunction `json:"function"`
}

// ToolFunction represents a function definition within a tool.
type ToolFunction struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Parameters  any    `json:"parameters,omitempty"`
}

// ToolCall represents a tool invocation made by the model.
type ToolCall struct {
	ID       string           `json:"id"`
	Type     string           `json:"type"`
	Function ToolCallFunction `json:"function"`
}

// ToolCallFunction represents the function details in a tool call.
type ToolCallFunction struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

// ChatCompletionResponse represents an OpenAI-compatible chat completion response.
type ChatCompletionResponse struct {
	ID                string   `json:"id"`
	Object            string   `json:"object"`
	Created           int64    `json:"created"`
	Model             string   `json:"model"`
	Choices           []Choice `json:"choices"`
	Usage             *Usage   `json:"usage,omitempty"`
	SystemFingerprint string   `json:"system_fingerprint,omitempty"`
}

// Choice represents a single completion choice.
type Choice struct {
	Index        int      `json:"index"`
	Message      *Message `json:"message,omitempty"`
	Delta        *Message `json:"delta,omitempty"`
	FinishReason *string  `json:"finish_reason"`
	Logprobs     any      `json:"logprobs,omitempty"`
}

// Usage represents token usage statistics.
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
	CachedTokens     int `json:"cached_tokens,omitempty"`
}

// ChatCompletionChunk represents a single chunk in a streaming response.
type ChatCompletionChunk struct {
	ID                string         `json:"id"`
	Object            string         `json:"object"`
	Created           int64          `json:"created"`
	Model             string         `json:"model"`
	Choices           []StreamChoice `json:"choices"`
	Usage             *Usage         `json:"usage,omitempty"`
	SystemFingerprint string         `json:"system_fingerprint,omitempty"`
}

// StreamChoice represents a choice within a streaming chunk.
type StreamChoice struct {
	Index        int     `json:"index"`
	Delta        Message `json:"delta"`
	FinishReason *string `json:"finish_reason"`
	Logprobs     any     `json:"logprobs,omitempty"`
}

// EmbeddingRequest represents an OpenAI-compatible embedding request.
type EmbeddingRequest struct {
	Model          string `json:"model"`
	Input          any    `json:"input"`
	EncodingFormat string `json:"encoding_format,omitempty"`
	User           string `json:"user,omitempty"`
	Dimensions     *int   `json:"dimensions,omitempty"`
}

// EmbeddingResponse represents an OpenAI-compatible embedding response.
type EmbeddingResponse struct {
	Object string          `json:"object"`
	Data   []EmbeddingData `json:"data"`
	Model  string          `json:"model"`
	Usage  *EmbeddingUsage `json:"usage,omitempty"`
}

// EmbeddingData represents a single embedding vector.
type EmbeddingData struct {
	Object    string    `json:"object"`
	Embedding []float64 `json:"embedding"`
	Index     int       `json:"index"`
}

// EmbeddingUsage represents token usage for embedding requests.
type EmbeddingUsage struct {
	PromptTokens int `json:"prompt_tokens"`
	TotalTokens  int `json:"total_tokens"`
}

// ModelListResponse represents a list of models.
type ModelListResponse struct {
	Object string      `json:"object"`
	Data   []ModelInfo `json:"data"`
}

// ModelInfo represents a single model available through the gateway.
type ModelInfo struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	OwnedBy string `json:"owned_by"`
}

// Org represents an organization in the Raven gateway.
type Org struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Status    string    `json:"status,omitempty"`
	Budget    float64   `json:"budget,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Team represents a team within an organization.
type Team struct {
	ID        string    `json:"id"`
	OrgID     string    `json:"org_id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Budget    float64   `json:"budget,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// User represents a user.
type User struct {
	ID        string    `json:"id"`
	OrgID     string    `json:"org_id,omitempty"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Role      string    `json:"role"`
	Status    string    `json:"status,omitempty"`
	Budget    float64   `json:"budget,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// VirtualKey represents a virtual API key for accessing the gateway.
type VirtualKey struct {
	ID           string     `json:"id"`
	Name         string     `json:"name"`
	KeyPrefix    string     `json:"key_prefix"`
	OrgID        string     `json:"org_id,omitempty"`
	TeamID       string     `json:"team_id,omitempty"`
	UserID       string     `json:"user_id,omitempty"`
	Providers    []string   `json:"providers,omitempty"`
	Models       []string   `json:"models,omitempty"`
	RPM          int        `json:"rpm,omitempty"`
	TPM          int        `json:"tpm,omitempty"`
	Budget       float64    `json:"budget,omitempty"`
	BudgetPeriod string     `json:"budget_period,omitempty"`
	Status       string     `json:"status"`
	ExpiresAt    *time.Time `json:"expires_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// RequestLog represents a log entry for a proxied request.
type RequestLog struct {
	ID           string    `json:"id"`
	KeyID        string    `json:"key_id,omitempty"`
	OrgID        string    `json:"org_id,omitempty"`
	TeamID       string    `json:"team_id,omitempty"`
	UserID       string    `json:"user_id,omitempty"`
	Provider     string    `json:"provider"`
	Model        string    `json:"model"`
	Endpoint     string    `json:"endpoint,omitempty"`
	Method       string    `json:"method,omitempty"`
	StatusCode   int       `json:"status_code"`
	InputTokens  int       `json:"input_tokens"`
	OutputTokens int       `json:"output_tokens"`
	CachedTokens int       `json:"cached_tokens,omitempty"`
	Cost         float64   `json:"cost"`
	LatencyMs    int64     `json:"latency_ms"`
	TTFBMs       int64     `json:"ttfb_ms,omitempty"`
	Stream       bool      `json:"stream,omitempty"`
	CacheHit     bool      `json:"cache_hit,omitempty"`
	ErrorMessage string    `json:"error_message,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// PaginationMeta contains pagination metadata in API responses.
type PaginationMeta struct {
	Total   int    `json:"total"`
	Page    int    `json:"page,omitempty"`
	PerPage int    `json:"per_page,omitempty"`
	Cursor  string `json:"cursor,omitempty"`
}

// AdminResponse is the standard admin API response envelope.
type AdminResponse struct {
	Data any             `json:"data"`
	Meta *PaginationMeta `json:"meta,omitempty"`
}
