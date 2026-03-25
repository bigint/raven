package proxy

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/bigint/raven/internal/logger"
)

// TokenUsage holds normalized token counts across all providers.
type TokenUsage struct {
	InputTokens     int `json:"inputTokens"`
	OutputTokens    int `json:"outputTokens"`
	ReasoningTokens int `json:"reasoningTokens"`
	CacheReadTokens int `json:"cacheReadTokens"`
	CacheWriteTokens int `json:"cacheWriteTokens"`
	CachedTokens    int `json:"cachedTokens"`
}

// ZeroUsage returns a TokenUsage with all fields set to zero.
func ZeroUsage() TokenUsage {
	return TokenUsage{}
}

// BufferedResult holds the parsed result from a non-streaming provider response.
type BufferedResult struct {
	Text         string
	FinishReason string
	ToolCalls    []ToolCallResult
	Reasoning    string
	Usage        TokenUsage
}

// ToolCallResult represents a tool call in the response.
type ToolCallResult struct {
	ToolCallID string
	ToolName   string
	Input      any
}

// FormattedResponse is the final OpenAI-compatible response.
type FormattedResponse struct {
	Body  map[string]any
	Text  string
	Usage TokenUsage
}

// mapFinishReason converts internal finish reasons to OpenAI format.
func mapFinishReason(reason string) string {
	switch reason {
	case "stop", "end_turn", "STOP":
		return "stop"
	case "length", "max_tokens", "MAX_TOKENS":
		return "length"
	case "tool-calls", "tool_calls", "tool_use":
		return "tool_calls"
	case "content-filter", "content_filter", "SAFETY":
		return "content_filter"
	default:
		return "stop"
	}
}

// buildOpenAIUsage creates the OpenAI usage object with optional details.
func buildOpenAIUsage(usage TokenUsage) map[string]any {
	result := map[string]any{
		"prompt_tokens":     usage.InputTokens,
		"completion_tokens": usage.OutputTokens,
		"total_tokens":      usage.InputTokens + usage.OutputTokens,
	}

	if usage.ReasoningTokens > 0 {
		result["completion_tokens_details"] = map[string]any{
			"reasoning_tokens": usage.ReasoningTokens,
		}
	}
	if usage.CacheReadTokens > 0 {
		result["prompt_tokens_details"] = map[string]any{
			"cached_tokens": usage.CacheReadTokens,
		}
	}

	return result
}

// generateCompletionID creates a unique ID for a chat completion.
func generateCompletionID() string {
	return fmt.Sprintf("chatcmpl-%d", time.Now().UnixNano())
}

// FormatBufferedResponse creates an OpenAI chat.completion JSON response from a BufferedResult.
func FormatBufferedResponse(result *BufferedResult, model string) *FormattedResponse {
	message := map[string]any{
		"role":    "assistant",
		"content": result.Text,
	}

	if result.Text == "" {
		message["content"] = nil
	}

	if len(result.ToolCalls) > 0 {
		var toolCalls []any
		for i, tc := range result.ToolCalls {
			inputJSON, _ := json.Marshal(tc.Input)
			toolCalls = append(toolCalls, map[string]any{
				"id":    tc.ToolCallID,
				"type":  "function",
				"index": i,
				"function": map[string]any{
					"name":      tc.ToolName,
					"arguments": string(inputJSON),
				},
			})
		}
		message["tool_calls"] = toolCalls
		if result.Text == "" {
			message["content"] = nil
		}
	}

	if result.Reasoning != "" {
		message["reasoning_content"] = result.Reasoning
	}

	body := map[string]any{
		"id":      generateCompletionID(),
		"object":  "chat.completion",
		"created": time.Now().Unix(),
		"model":   model,
		"choices": []any{
			map[string]any{
				"index":         0,
				"message":       message,
				"finish_reason": mapFinishReason(result.FinishReason),
			},
		},
		"usage": buildOpenAIUsage(result.Usage),
	}

	text, _ := json.Marshal(body)

	return &FormattedResponse{
		Body:  body,
		Text:  string(text),
		Usage: result.Usage,
	}
}

// FormatStreamingResponse reads SSE events from a provider stream, transforms them to
// OpenAI chat.completion.chunk format, and writes them to the client via http.Flusher.
func FormatStreamingResponse(
	w http.ResponseWriter,
	providerStream io.ReadCloser,
	provider string,
	model string,
	includeUsage bool,
	onFinish func(TokenUsage),
) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		logger.Error("response writer does not support flushing", nil)
		return
	}

	completionID := generateCompletionID()
	created := time.Now().Unix()

	baseChunk := map[string]any{
		"id":      completionID,
		"object":  "chat.completion.chunk",
		"created": created,
		"model":   model,
	}

	writeSSE := func(data map[string]any) {
		b, err := json.Marshal(data)
		if err != nil {
			return
		}
		fmt.Fprintf(w, "data: %s\n\n", b)
		flusher.Flush()
	}

	finished := false
	var finalUsage TokenUsage
	toolCallIndex := -1

	defer func() {
		fmt.Fprint(w, "data: [DONE]\n\n")
		flusher.Flush()

		if providerStream != nil {
			providerStream.Close()
		}

		if !finished {
			onFinish(ZeroUsage())
		}
	}()

	scanner := bufio.NewScanner(providerStream)
	// Allow large SSE events (up to 1MB)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Text()

		if !strings.HasPrefix(line, "data: ") {
			continue
		}

		data := strings.TrimPrefix(line, "data: ")
		if data == "[DONE]" {
			break
		}

		var event map[string]any
		if err := json.Unmarshal([]byte(data), &event); err != nil {
			continue
		}

		// Route based on provider format
		switch provider {
		case "anthropic":
			handleAnthropicSSE(event, baseChunk, writeSSE, &toolCallIndex, &finalUsage, includeUsage)
		case "google":
			handleGoogleSSE(event, baseChunk, writeSSE, &finalUsage, includeUsage)
		default:
			// OpenAI and compatible: forward with model override
			event["model"] = model
			writeSSE(event)
			extractOpenAIStreamUsage(event, &finalUsage)
		}
	}

	if finalUsage.InputTokens > 0 || finalUsage.OutputTokens > 0 {
		finished = true
		onFinish(finalUsage)
	}
}

// handleAnthropicSSE processes Anthropic SSE events and emits OpenAI-format chunks.
func handleAnthropicSSE(
	event map[string]any,
	baseChunk map[string]any,
	writeSSE func(map[string]any),
	toolCallIndex *int,
	usage *TokenUsage,
	includeUsage bool,
) {
	eventType, _ := event["type"].(string)

	switch eventType {
	case "content_block_start":
		block, _ := event["content_block"].(map[string]any)
		if block == nil {
			return
		}
		blockType, _ := block["type"].(string)
		if blockType == "tool_use" {
			*toolCallIndex++
			id, _ := block["id"].(string)
			name, _ := block["name"].(string)
			chunk := copyMap(baseChunk)
			chunk["choices"] = []any{
				map[string]any{
					"index": 0,
					"delta": map[string]any{
						"tool_calls": []any{
							map[string]any{
								"index":    *toolCallIndex,
								"id":       id,
								"type":     "function",
								"function": map[string]any{"name": name, "arguments": ""},
							},
						},
					},
				},
			}
			writeSSE(chunk)
		}

	case "content_block_delta":
		delta, _ := event["delta"].(map[string]any)
		if delta == nil {
			return
		}
		deltaType, _ := delta["type"].(string)

		switch deltaType {
		case "text_delta":
			text, _ := delta["text"].(string)
			chunk := copyMap(baseChunk)
			chunk["choices"] = []any{
				map[string]any{
					"index": 0,
					"delta": map[string]any{"content": text},
				},
			}
			writeSSE(chunk)

		case "thinking_delta":
			text, _ := delta["thinking"].(string)
			chunk := copyMap(baseChunk)
			chunk["choices"] = []any{
				map[string]any{
					"index": 0,
					"delta": map[string]any{"reasoning_content": text},
				},
			}
			writeSSE(chunk)

		case "input_json_delta":
			partial, _ := delta["partial_json"].(string)
			chunk := copyMap(baseChunk)
			chunk["choices"] = []any{
				map[string]any{
					"index": 0,
					"delta": map[string]any{
						"tool_calls": []any{
							map[string]any{
								"index":    *toolCallIndex,
								"function": map[string]any{"arguments": partial},
							},
						},
					},
				},
			}
			writeSSE(chunk)
		}

	case "message_delta":
		delta, _ := event["delta"].(map[string]any)
		finishReason := "stop"
		if sr, _ := delta["stop_reason"].(string); sr != "" {
			finishReason = mapFinishReason(sr)
		}

		chunk := copyMap(baseChunk)
		chunk["choices"] = []any{
			map[string]any{
				"index":         0,
				"delta":         map[string]any{},
				"finish_reason": finishReason,
			},
		}

		if includeUsage {
			if u, ok := event["usage"].(map[string]any); ok {
				extractAnthropicUsage(u, usage)
				chunk["usage"] = buildOpenAIUsage(*usage)
			}
		}

		writeSSE(chunk)

	case "message_start":
		if msg, ok := event["message"].(map[string]any); ok {
			if u, ok := msg["usage"].(map[string]any); ok {
				extractAnthropicUsage(u, usage)
			}
		}
	}
}

// extractAnthropicUsage extracts token counts from an Anthropic usage object.
func extractAnthropicUsage(u map[string]any, usage *TokenUsage) {
	if v, ok := u["input_tokens"].(float64); ok {
		usage.InputTokens = int(v)
	}
	if v, ok := u["output_tokens"].(float64); ok {
		usage.OutputTokens = int(v)
	}
	if v, ok := u["cache_read_input_tokens"].(float64); ok {
		usage.CacheReadTokens = int(v)
		usage.CachedTokens = usage.CacheReadTokens + usage.CacheWriteTokens
	}
	if v, ok := u["cache_creation_input_tokens"].(float64); ok {
		usage.CacheWriteTokens = int(v)
		usage.CachedTokens = usage.CacheReadTokens + usage.CacheWriteTokens
	}
}

// handleGoogleSSE processes Google Gemini SSE events and emits OpenAI-format chunks.
func handleGoogleSSE(
	event map[string]any,
	baseChunk map[string]any,
	writeSSE func(map[string]any),
	usage *TokenUsage,
	includeUsage bool,
) {
	candidates, _ := event["candidates"].([]any)
	if len(candidates) == 0 {
		// Check for usage-only events
		if u, ok := event["usageMetadata"].(map[string]any); ok {
			extractGoogleUsage(u, usage)
		}
		return
	}

	candidate, _ := candidates[0].(map[string]any)
	if candidate == nil {
		return
	}

	content, _ := candidate["content"].(map[string]any)
	if content != nil {
		parts, _ := content["parts"].([]any)
		for _, part := range parts {
			p, ok := part.(map[string]any)
			if !ok {
				continue
			}

			if text, ok := p["text"].(string); ok {
				chunk := copyMap(baseChunk)
				chunk["choices"] = []any{
					map[string]any{
						"index": 0,
						"delta": map[string]any{"content": text},
					},
				}
				writeSSE(chunk)
			}

			if fc, ok := p["functionCall"].(map[string]any); ok {
				name, _ := fc["name"].(string)
				args := fc["args"]
				argsJSON, _ := json.Marshal(args)

				chunk := copyMap(baseChunk)
				chunk["choices"] = []any{
					map[string]any{
						"index": 0,
						"delta": map[string]any{
							"tool_calls": []any{
								map[string]any{
									"index": 0,
									"type":  "function",
									"function": map[string]any{
										"name":      name,
										"arguments": string(argsJSON),
									},
								},
							},
						},
					},
				}
				writeSSE(chunk)
			}
		}
	}

	// Check finish reason
	if fr, ok := candidate["finishReason"].(string); ok && fr != "" {
		chunk := copyMap(baseChunk)
		chunk["choices"] = []any{
			map[string]any{
				"index":         0,
				"delta":         map[string]any{},
				"finish_reason": mapFinishReason(fr),
			},
		}

		if includeUsage {
			if u, ok := event["usageMetadata"].(map[string]any); ok {
				extractGoogleUsage(u, usage)
				chunk["usage"] = buildOpenAIUsage(*usage)
			}
		}

		writeSSE(chunk)
	}

	// Extract usage from event
	if u, ok := event["usageMetadata"].(map[string]any); ok {
		extractGoogleUsage(u, usage)
	}
}

// extractGoogleUsage extracts token counts from a Google usage metadata object.
func extractGoogleUsage(u map[string]any, usage *TokenUsage) {
	if v, ok := u["promptTokenCount"].(float64); ok {
		usage.InputTokens = int(v)
	}
	if v, ok := u["candidatesTokenCount"].(float64); ok {
		usage.OutputTokens = int(v)
	}
	if v, ok := u["cachedContentTokenCount"].(float64); ok {
		usage.CachedTokens = int(v)
		usage.CacheReadTokens = int(v)
	}
}

// extractOpenAIStreamUsage extracts usage from an OpenAI streaming event.
func extractOpenAIStreamUsage(event map[string]any, usage *TokenUsage) {
	u, ok := event["usage"].(map[string]any)
	if !ok {
		return
	}

	if v, ok := u["prompt_tokens"].(float64); ok {
		usage.InputTokens = int(v)
	}
	if v, ok := u["completion_tokens"].(float64); ok {
		usage.OutputTokens = int(v)
	}

	if details, ok := u["prompt_tokens_details"].(map[string]any); ok {
		if v, ok := details["cached_tokens"].(float64); ok {
			usage.CacheReadTokens = int(v)
			usage.CachedTokens = int(v)
		}
	}
	if details, ok := u["completion_tokens_details"].(map[string]any); ok {
		if v, ok := details["reasoning_tokens"].(float64); ok {
			usage.ReasoningTokens = int(v)
		}
	}
}

// FormatErrorResponse converts an error into an OpenAI-compatible error response body and status code.
func FormatErrorResponse(err error) (body string, status int) {
	status = http.StatusInternalServerError

	// Check for AppError with status code
	type statusCoder interface {
		StatusCode() int
	}
	if sc, ok := err.(statusCoder); ok {
		status = sc.StatusCode()
	}

	// Check for response body passthrough
	type responseBodyer interface {
		ResponseBody() string
	}
	if rb, ok := err.(responseBodyer); ok {
		if b := rb.ResponseBody(); b != "" {
			return b, status
		}
	}

	code := "internal_error"
	if status < 500 {
		code = "upstream_error"
	}

	errBody := map[string]any{
		"error": map[string]any{
			"code":    code,
			"message": err.Error(),
		},
	}
	b, _ := json.Marshal(errBody)
	return string(b), status
}

// ProviderError wraps an upstream provider error with status code and optional raw body.
type ProviderError struct {
	Message      string
	Status       int
	RawBody      string
}

func (e *ProviderError) Error() string {
	return e.Message
}

func (e *ProviderError) StatusCode() int {
	return e.Status
}

func (e *ProviderError) ResponseBody() string {
	return e.RawBody
}

// copyMap creates a shallow copy of a map.
func copyMap(m map[string]any) map[string]any {
	result := make(map[string]any, len(m))
	for k, v := range m {
		result[k] = v
	}
	return result
}
