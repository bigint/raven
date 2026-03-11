package types

// ChatCompletionRequest represents an OpenAI-compatible chat completion request.
type ChatCompletionRequest struct {
	Model            string         `json:"model"`
	Messages         []Message      `json:"messages"`
	Temperature      *float64       `json:"temperature,omitempty"`
	TopP             *float64       `json:"top_p,omitempty"`
	N                *int           `json:"n,omitempty"`
	Stream           bool           `json:"stream,omitempty"`
	Stop             any            `json:"stop,omitempty"`
	MaxTokens        *int           `json:"max_tokens,omitempty"`
	PresencePenalty  *float64       `json:"presence_penalty,omitempty"`
	FrequencyPenalty *float64       `json:"frequency_penalty,omitempty"`
	LogitBias        map[string]int `json:"logit_bias,omitempty"`
	User             string         `json:"user,omitempty"`
	Seed             *int           `json:"seed,omitempty"`
	Tools            []Tool         `json:"tools,omitempty"`
	ToolChoice       any            `json:"tool_choice,omitempty"`
	ResponseFormat   any            `json:"response_format,omitempty"`
	StreamOptions    *StreamOptions `json:"stream_options,omitempty"`
}

// StreamOptions represents stream configuration options.
type StreamOptions struct {
	IncludeUsage bool `json:"include_usage,omitempty"`
}

// Message represents a chat message.
type Message struct {
	Role       string     `json:"role"`
	Content    any        `json:"content"`
	Name       string     `json:"name,omitempty"`
	ToolCalls  []ToolCall `json:"tool_calls,omitempty"`
	ToolCallID string     `json:"tool_call_id,omitempty"`
}

// ContentPart represents a multimodal content part.
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

// Tool represents a tool definition.
type Tool struct {
	Type     string       `json:"type"`
	Function ToolFunction `json:"function"`
}

// ToolFunction represents a function tool definition.
type ToolFunction struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Parameters  any    `json:"parameters,omitempty"`
}

// ToolCall represents a tool call in an assistant message.
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

// CompletionRequest represents an OpenAI-compatible completion request.
type CompletionRequest struct {
	Model            string         `json:"model"`
	Prompt           any            `json:"prompt"`
	MaxTokens        *int           `json:"max_tokens,omitempty"`
	Temperature      *float64       `json:"temperature,omitempty"`
	TopP             *float64       `json:"top_p,omitempty"`
	N                *int           `json:"n,omitempty"`
	Stream           bool           `json:"stream,omitempty"`
	Stop             any            `json:"stop,omitempty"`
	PresencePenalty  *float64       `json:"presence_penalty,omitempty"`
	FrequencyPenalty *float64       `json:"frequency_penalty,omitempty"`
	LogitBias        map[string]int `json:"logit_bias,omitempty"`
	User             string         `json:"user,omitempty"`
	Seed             *int           `json:"seed,omitempty"`
}

// EmbeddingRequest represents an OpenAI-compatible embedding request.
type EmbeddingRequest struct {
	Model          string `json:"model"`
	Input          any    `json:"input"`
	EncodingFormat string `json:"encoding_format,omitempty"`
	User           string `json:"user,omitempty"`
	Dimensions     *int   `json:"dimensions,omitempty"`
}

// ProxyRequest wraps a request passing through the gateway pipeline.
type ProxyRequest struct {
	// Original request body as raw JSON.
	Body []byte

	// Parsed chat completion request (if applicable).
	ChatRequest *ChatCompletionRequest

	// Parsed completion request (if applicable).
	CompletionRequest *CompletionRequest

	// Parsed embedding request (if applicable).
	EmbeddingRequest *EmbeddingRequest

	// Resolved provider name.
	Provider string

	// Resolved model name (without provider prefix).
	Model string

	// Original model string from request.
	OriginalModel string

	// Request endpoint type.
	Endpoint string

	// Virtual key ID (if authenticated with virtual key).
	KeyID string

	// Organization ID from auth context.
	OrgID string

	// Team ID from auth context.
	TeamID string

	// User ID from auth context.
	UserID string

	// Whether streaming is requested.
	Stream bool

	// Request metadata.
	Metadata map[string]string
}

// RouteDecision represents the routing decision for a request.
type RouteDecision struct {
	Provider string
	Model    string
	BaseURL  string
	APIKey   string
	Priority int
}
