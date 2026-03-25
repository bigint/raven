package proxy

import (
	"encoding/json"
	"strings"
)

// ParsedRequest holds the normalized representation of an incoming OpenAI-format request.
type ParsedRequest struct {
	Messages         []Message              `json:"messages"`
	System           string                 `json:"system,omitempty"`
	Tools            map[string]ToolDef     `json:"tools,omitempty"`
	ToolChoice       any                    `json:"toolChoice,omitempty"`
	Temperature      *float64               `json:"temperature,omitempty"`
	TopP             *float64               `json:"topP,omitempty"`
	MaxTokens        *int                   `json:"maxTokens,omitempty"`
	StopSequences    []string               `json:"stopSequences,omitempty"`
	FrequencyPenalty *float64               `json:"frequencyPenalty,omitempty"`
	PresencePenalty  *float64               `json:"presencePenalty,omitempty"`
	Seed             *int                   `json:"seed,omitempty"`
	IsStreaming      bool                   `json:"isStreaming"`
	IncludeUsage     bool                   `json:"includeUsage"`
	RequiresRawProxy bool                   `json:"requiresRawProxy"`
	ProviderOptions  map[string]map[string]any `json:"providerOptions,omitempty"`
}

// ToolDef describes a single tool in the internal format.
type ToolDef struct {
	Description string         `json:"description,omitempty"`
	Parameters  map[string]any `json:"parameters"`
}

// ToolChoiceFunction is used when tool_choice specifies a particular function.
type ToolChoiceFunction struct {
	ToolName string `json:"toolName"`
}

// Message is the internal message representation.
type Message struct {
	Role    string `json:"role"`
	Content any    `json:"content"`
}

// MessagePart represents a content block within a message.
type MessagePart struct {
	Type       string `json:"type"`
	Text       string `json:"text,omitempty"`
	Image      any    `json:"image,omitempty"`
	MimeType   string `json:"mimeType,omitempty"`
	ToolCallID string `json:"toolCallId,omitempty"`
	ToolName   string `json:"toolName,omitempty"`
	Input      any    `json:"input,omitempty"`
	Output     any    `json:"output,omitempty"`
}

// ParseIncomingRequest converts an OpenAI-format request body into ParsedRequest.
func ParseIncomingRequest(body map[string]any, provider string) *ParsedRequest {
	rawMessages, _ := body["messages"].([]any)

	var messages []Message
	var systemParts []string

	for _, raw := range rawMessages {
		msg, ok := raw.(map[string]any)
		if !ok {
			continue
		}

		role, _ := msg["role"].(string)
		if role == "system" {
			if s, ok := msg["content"].(string); ok {
				systemParts = append(systemParts, s)
			} else {
				b, _ := json.Marshal(msg["content"])
				systemParts = append(systemParts, string(b))
			}
			continue
		}

		converted := convertMessage(msg)
		if converted != nil {
			messages = append(messages, *converted)
		}
	}

	tools := parseTools(body["tools"])
	hasTools := len(tools) > 0

	var toolsPtr map[string]ToolDef
	if hasTools {
		toolsPtr = tools
	}

	streamOpts, _ := body["stream_options"].(map[string]any)
	includeUsage := false
	if streamOpts != nil {
		includeUsage, _ = streamOpts["include_usage"].(bool)
	}

	isStreaming, _ := body["stream"].(bool)

	var stopSequences []string
	switch v := body["stop"].(type) {
	case string:
		stopSequences = []string{v}
	case []any:
		for _, s := range v {
			if str, ok := s.(string); ok {
				stopSequences = append(stopSequences, str)
			}
		}
	}

	var maxTokens *int
	if v := toIntPtr(body["max_tokens"]); v != nil {
		maxTokens = v
	} else if v := toIntPtr(body["max_completion_tokens"]); v != nil {
		maxTokens = v
	}

	requiresRawProxy := false
	if n, ok := toFloat(body["n"]); ok && n > 1 {
		requiresRawProxy = true
	}

	var system string
	if len(systemParts) > 0 {
		system = strings.Join(systemParts, "\n\n")
	}

	return &ParsedRequest{
		Messages:         messages,
		System:           system,
		Tools:            toolsPtr,
		ToolChoice:       parseToolChoice(body["tool_choice"]),
		Temperature:      toFloatPtr(body["temperature"]),
		TopP:             toFloatPtr(body["top_p"]),
		MaxTokens:        maxTokens,
		StopSequences:    stopSequences,
		FrequencyPenalty: toFloatPtr(body["frequency_penalty"]),
		PresencePenalty:  toFloatPtr(body["presence_penalty"]),
		Seed:             toIntPtr(body["seed"]),
		IsStreaming:      isStreaming,
		IncludeUsage:     includeUsage,
		RequiresRawProxy: requiresRawProxy,
		ProviderOptions:  buildProviderOptions(body, provider, hasTools),
	}
}

// convertMessage converts an OpenAI-format message to the internal Message format.
func convertMessage(msg map[string]any) *Message {
	role, _ := msg["role"].(string)

	switch role {
	case "user":
		return &Message{
			Role:    "user",
			Content: convertContent(msg["content"]),
		}

	case "assistant":
		var parts []MessagePart

		// Text content
		switch content := msg["content"].(type) {
		case string:
			if content != "" {
				parts = append(parts, MessagePart{Type: "text", Text: content})
			}
		case []any:
			for _, block := range content {
				b, ok := block.(map[string]any)
				if !ok {
					continue
				}
				if bType, _ := b["type"].(string); bType == "text" {
					if text, _ := b["text"].(string); text != "" {
						parts = append(parts, MessagePart{Type: "text", Text: text})
					}
				}
			}
		}

		// tool_calls -> tool-call parts
		if toolCalls, ok := msg["tool_calls"].([]any); ok {
			for _, tc := range toolCalls {
				tcMap, ok := tc.(map[string]any)
				if !ok {
					continue
				}
				fn, _ := tcMap["function"].(map[string]any)
				if fn == nil {
					continue
				}

				var input any
				if args, ok := fn["arguments"].(string); ok {
					_ = json.Unmarshal([]byte(args), &input)
					if input == nil {
						input = map[string]any{}
					}
				} else {
					input = fn["arguments"]
				}

				id, _ := tcMap["id"].(string)
				name, _ := fn["name"].(string)

				parts = append(parts, MessagePart{
					Type:       "tool-call",
					ToolCallID: id,
					ToolName:   name,
					Input:      input,
				})
			}
		}

		// If single text part, use plain string content
		var content any
		if len(parts) == 1 && parts[0].Type == "text" {
			content = parts[0].Text
		} else {
			content = parts
		}

		return &Message{Role: "assistant", Content: content}

	case "tool":
		var contentStr string
		switch v := msg["content"].(type) {
		case string:
			contentStr = v
		default:
			b, _ := json.Marshal(v)
			contentStr = string(b)
		}

		toolCallID, _ := msg["tool_call_id"].(string)

		return &Message{
			Role: "tool",
			Content: []MessagePart{
				{
					Type:       "tool-result",
					ToolCallID: toolCallID,
					ToolName:   "",
					Output: map[string]any{
						"type":  "text",
						"value": contentStr,
					},
				},
			},
		}

	default:
		return nil
	}
}

// convertContent handles user message content which can be a string or array of blocks.
func convertContent(content any) any {
	if s, ok := content.(string); ok {
		return s
	}

	arr, ok := content.([]any)
	if !ok {
		if content == nil {
			return ""
		}
		b, _ := json.Marshal(content)
		return string(b)
	}

	var result []any
	for _, item := range arr {
		block, ok := item.(map[string]any)
		if !ok {
			result = append(result, item)
			continue
		}

		blockType, _ := block["type"].(string)

		switch blockType {
		case "image_url":
			imageURL, _ := block["image_url"].(map[string]any)
			if imageURL != nil {
				url, _ := imageURL["url"].(string)
				result = append(result, toImagePart(url))
			}
		case "image":
			src, _ := block["source"].(map[string]any)
			if src != nil {
				srcType, _ := src["type"].(string)
				if srcType == "base64" {
					data, _ := src["data"].(string)
					mimeType, _ := src["media_type"].(string)
					result = append(result, MessagePart{
						Type:     "image",
						Image:    data,
						MimeType: mimeType,
					})
				} else if srcType == "url" {
					url, _ := src["url"].(string)
					result = append(result, toImagePart(url))
				}
			}
		default:
			result = append(result, block)
		}
	}

	return result
}

// toImagePart creates an image part from a URL or data URI.
func toImagePart(url string) MessagePart {
	// Check for data URI: data:<mime>;base64,<data>
	if strings.HasPrefix(url, "data:") {
		parts := strings.SplitN(url, ";base64,", 2)
		if len(parts) == 2 {
			mimeType := strings.TrimPrefix(parts[0], "data:")
			return MessagePart{
				Type:     "image",
				Image:    parts[1],
				MimeType: mimeType,
			}
		}
	}
	return MessagePart{Type: "image", Image: url}
}

// parseTools converts OpenAI function-format tools to the internal map.
func parseTools(rawTools any) map[string]ToolDef {
	arr, ok := rawTools.([]any)
	if !ok || len(arr) == 0 {
		return nil
	}

	tools := make(map[string]ToolDef)

	for _, raw := range arr {
		t, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		if tType, _ := t["type"].(string); tType != "function" {
			continue
		}
		fn, ok := t["function"].(map[string]any)
		if !ok {
			continue
		}
		name, _ := fn["name"].(string)
		if name == "" {
			continue
		}

		desc, _ := fn["description"].(string)
		params := ensureToolSchema(fn["parameters"])

		tools[name] = ToolDef{
			Description: desc,
			Parameters:  params,
		}
	}

	if len(tools) == 0 {
		return nil
	}
	return tools
}

// ensureToolSchema normalizes a JSON schema object for tool parameters.
func ensureToolSchema(schema any) map[string]any {
	m, ok := schema.(map[string]any)
	if !ok || m == nil {
		return map[string]any{"type": "object", "properties": map[string]any{}}
	}

	result := make(map[string]any)
	for k, v := range m {
		if k == "$id" || k == "$schema" {
			continue
		}
		result[k] = v
	}
	if _, ok := result["type"]; !ok {
		result["type"] = "object"
	}
	return result
}

// parseToolChoice normalizes the tool_choice parameter.
func parseToolChoice(toolChoice any) any {
	if toolChoice == nil {
		return nil
	}

	if s, ok := toolChoice.(string); ok {
		switch s {
		case "auto":
			return "auto"
		case "none":
			return "none"
		case "required":
			return "required"
		}
		return nil
	}

	if m, ok := toolChoice.(map[string]any); ok {
		if tcType, _ := m["type"].(string); tcType == "function" {
			fn, _ := m["function"].(map[string]any)
			if fn != nil {
				name, _ := fn["name"].(string)
				if name != "" {
					return ToolChoiceFunction{ToolName: name}
				}
			}
		}
	}

	return nil
}

// buildProviderOptions creates provider-specific options from the request body.
func buildProviderOptions(body map[string]any, provider string, hasTools bool) map[string]map[string]any {
	opts := make(map[string]map[string]any)

	// OpenAI reasoning_effort
	if re, ok := body["reasoning_effort"].(string); ok && provider == "openai" && !hasTools {
		opts["openai"] = map[string]any{"reasoningEffort": re}
	}

	// Anthropic cache control + thinking
	if provider == "anthropic" {
		anthropicOpts := map[string]any{
			"cacheControl": map[string]any{"type": "ephemeral"},
		}

		if reasoning, ok := body["reasoning"].(map[string]any); ok {
			if budgetTokens, ok := toFloat(reasoning["budget_tokens"]); ok && budgetTokens > 0 {
				anthropicOpts["thinking"] = map[string]any{
					"budgetTokens": int(budgetTokens),
					"type":         "enabled",
				}
			}
		}

		opts["anthropic"] = anthropicOpts
	}

	// Google thinking config
	if provider == "google" {
		if reasoning, ok := body["reasoning"].(map[string]any); ok {
			if budgetTokens, ok := toFloat(reasoning["budget_tokens"]); ok && budgetTokens > 0 {
				opts["google"] = map[string]any{
					"thinkingConfig": map[string]any{
						"thinkingBudget": int(budgetTokens),
					},
				}
			}
		}
	}

	if len(opts) == 0 {
		return nil
	}
	return opts
}

// toFloat safely extracts a float64 from an any value (handles JSON number).
func toFloat(v any) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case int:
		return float64(n), true
	case json.Number:
		f, err := n.Float64()
		return f, err == nil
	}
	return 0, false
}

// toFloatPtr returns a pointer to float64 if the value is a number, nil otherwise.
func toFloatPtr(v any) *float64 {
	f, ok := toFloat(v)
	if !ok {
		return nil
	}
	return &f
}

// toIntPtr returns a pointer to int if the value is a number, nil otherwise.
func toIntPtr(v any) *int {
	f, ok := toFloat(v)
	if !ok {
		return nil
	}
	n := int(f)
	return &n
}
