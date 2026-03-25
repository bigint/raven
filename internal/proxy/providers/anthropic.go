package providers

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"
)

// TransformToAnthropic converts an OpenAI-format request body to Anthropic Messages API format.
func TransformToAnthropic(body map[string]any) ([]byte, error) {
	anthropicBody := make(map[string]any)

	// Model
	if model, ok := body["model"].(string); ok {
		anthropicBody["model"] = model
	}

	// Max tokens
	if mt, ok := body["max_tokens"]; ok {
		anthropicBody["max_tokens"] = mt
	} else if mt, ok := body["max_completion_tokens"]; ok {
		anthropicBody["max_tokens"] = mt
	} else {
		anthropicBody["max_tokens"] = 4096
	}

	// Temperature
	if temp, ok := body["temperature"]; ok {
		anthropicBody["temperature"] = temp
	}

	// Top P
	if topP, ok := body["top_p"]; ok {
		anthropicBody["top_p"] = topP
	}

	// Stop sequences
	if stop, ok := body["stop"].([]any); ok {
		anthropicBody["stop_sequences"] = stop
	} else if stop, ok := body["stop"].(string); ok {
		anthropicBody["stop_sequences"] = []string{stop}
	}

	// Stream
	if stream, ok := body["stream"].(bool); ok {
		anthropicBody["stream"] = stream
	}

	// Extract system messages and convert remaining messages
	rawMessages, _ := body["messages"].([]any)
	var systemParts []string
	var messages []map[string]any

	for _, raw := range rawMessages {
		msg, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		role, _ := msg["role"].(string)

		if role == "system" {
			if s, ok := msg["content"].(string); ok {
				systemParts = append(systemParts, s)
			}
			continue
		}

		converted := convertMessageToAnthropic(msg)
		if converted != nil {
			messages = append(messages, converted)
		}
	}

	if len(systemParts) > 0 {
		anthropicBody["system"] = strings.Join(systemParts, "\n\n")
	}

	anthropicBody["messages"] = messages

	// Tools
	if tools, ok := body["tools"].([]any); ok && len(tools) > 0 {
		anthropicTools := convertToolsToAnthropic(tools)
		if len(anthropicTools) > 0 {
			anthropicBody["tools"] = anthropicTools
		}
	}

	// Tool choice
	if tc := body["tool_choice"]; tc != nil {
		anthropicBody["tool_choice"] = convertToolChoiceToAnthropic(tc)
	}

	return json.Marshal(anthropicBody)
}

// convertMessageToAnthropic converts an OpenAI message to Anthropic format.
func convertMessageToAnthropic(msg map[string]any) map[string]any {
	role, _ := msg["role"].(string)

	switch role {
	case "user":
		return map[string]any{
			"role":    "user",
			"content": convertContentToAnthropic(msg["content"]),
		}

	case "assistant":
		result := map[string]any{"role": "assistant"}
		var content []any

		// Text content
		switch c := msg["content"].(type) {
		case string:
			if c != "" {
				content = append(content, map[string]any{"type": "text", "text": c})
			}
		case []any:
			for _, block := range c {
				if b, ok := block.(map[string]any); ok {
					if bType, _ := b["type"].(string); bType == "text" {
						content = append(content, b)
					}
				}
			}
		}

		// Tool calls
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

				content = append(content, map[string]any{
					"type":  "tool_use",
					"id":    id,
					"name":  name,
					"input": input,
				})
			}
		}

		result["content"] = content
		return result

	case "tool":
		toolCallID, _ := msg["tool_call_id"].(string)
		var contentStr string
		switch v := msg["content"].(type) {
		case string:
			contentStr = v
		default:
			b, _ := json.Marshal(v)
			contentStr = string(b)
		}

		return map[string]any{
			"role": "user",
			"content": []any{
				map[string]any{
					"type":        "tool_result",
					"tool_use_id": toolCallID,
					"content":     contentStr,
				},
			},
		}

	default:
		return nil
	}
}

// convertContentToAnthropic converts user content to Anthropic format.
func convertContentToAnthropic(content any) any {
	if s, ok := content.(string); ok {
		return s
	}

	arr, ok := content.([]any)
	if !ok {
		return content
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
		case "text":
			result = append(result, block)
		case "image_url":
			imageURL, _ := block["image_url"].(map[string]any)
			if imageURL != nil {
				url, _ := imageURL["url"].(string)
				result = append(result, convertImageURLToAnthropic(url))
			}
		default:
			result = append(result, block)
		}
	}

	return result
}

// convertImageURLToAnthropic converts an image URL to Anthropic's source format.
func convertImageURLToAnthropic(url string) map[string]any {
	if strings.HasPrefix(url, "data:") {
		parts := strings.SplitN(url, ";base64,", 2)
		if len(parts) == 2 {
			mimeType := strings.TrimPrefix(parts[0], "data:")
			return map[string]any{
				"type": "image",
				"source": map[string]any{
					"type":       "base64",
					"media_type": mimeType,
					"data":       parts[1],
				},
			}
		}
	}
	return map[string]any{
		"type": "image",
		"source": map[string]any{
			"type": "url",
			"url":  url,
		},
	}
}

// convertToolsToAnthropic converts OpenAI function-format tools to Anthropic format.
func convertToolsToAnthropic(tools []any) []map[string]any {
	var result []map[string]any

	for _, raw := range tools {
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
		desc, _ := fn["description"].(string)
		params, _ := fn["parameters"].(map[string]any)
		if params == nil {
			params = map[string]any{"type": "object", "properties": map[string]any{}}
		}

		tool := map[string]any{
			"name":         name,
			"input_schema": params,
		}
		if desc != "" {
			tool["description"] = desc
		}
		result = append(result, tool)
	}

	return result
}

// convertToolChoiceToAnthropic converts OpenAI tool_choice to Anthropic format.
func convertToolChoiceToAnthropic(tc any) any {
	if s, ok := tc.(string); ok {
		switch s {
		case "auto":
			return map[string]any{"type": "auto"}
		case "none":
			return map[string]any{"type": "any"} // Anthropic doesn't have "none"; closest is not sending tool_choice
		case "required":
			return map[string]any{"type": "any"}
		}
	}
	if m, ok := tc.(map[string]any); ok {
		if tcType, _ := m["type"].(string); tcType == "function" {
			fn, _ := m["function"].(map[string]any)
			if fn != nil {
				name, _ := fn["name"].(string)
				return map[string]any{"type": "tool", "name": name}
			}
		}
	}
	return nil
}

// AnthropicUsage holds token counts extracted from an Anthropic response.
type AnthropicUsage struct {
	InputTokens             int `json:"input_tokens"`
	OutputTokens            int `json:"output_tokens"`
	CacheReadInputTokens    int `json:"cache_read_input_tokens"`
	CacheCreationInputTokens int `json:"cache_creation_input_tokens"`
}

// ParseAnthropicResponse parses a buffered Anthropic Messages API response into
// OpenAI-compatible fields.
func ParseAnthropicResponse(body io.Reader) (map[string]any, *AnthropicUsage, error) {
	var resp map[string]any
	if err := json.NewDecoder(body).Decode(&resp); err != nil {
		return nil, nil, fmt.Errorf("decode anthropic response: %w", err)
	}

	usage := &AnthropicUsage{}
	if u, ok := resp["usage"].(map[string]any); ok {
		if v, ok := u["input_tokens"].(float64); ok {
			usage.InputTokens = int(v)
		}
		if v, ok := u["output_tokens"].(float64); ok {
			usage.OutputTokens = int(v)
		}
		if v, ok := u["cache_read_input_tokens"].(float64); ok {
			usage.CacheReadInputTokens = int(v)
		}
		if v, ok := u["cache_creation_input_tokens"].(float64); ok {
			usage.CacheCreationInputTokens = int(v)
		}
	}

	return resp, usage, nil
}

// AnthropicToOpenAIResponse converts an Anthropic response to OpenAI chat.completion format.
func AnthropicToOpenAIResponse(resp map[string]any, model string) map[string]any {
	message := map[string]any{
		"role":    "assistant",
		"content": nil,
	}

	// Extract content blocks
	contentBlocks, _ := resp["content"].([]any)
	var textParts []string
	var toolCalls []any
	var reasoningContent string
	toolCallIdx := 0

	for _, block := range contentBlocks {
		b, ok := block.(map[string]any)
		if !ok {
			continue
		}
		bType, _ := b["type"].(string)

		switch bType {
		case "text":
			if text, ok := b["text"].(string); ok {
				textParts = append(textParts, text)
			}
		case "thinking":
			if text, ok := b["thinking"].(string); ok {
				reasoningContent += text
			}
		case "tool_use":
			id, _ := b["id"].(string)
			name, _ := b["name"].(string)
			input := b["input"]
			inputJSON, _ := json.Marshal(input)

			toolCalls = append(toolCalls, map[string]any{
				"id":    id,
				"type":  "function",
				"index": toolCallIdx,
				"function": map[string]any{
					"name":      name,
					"arguments": string(inputJSON),
				},
			})
			toolCallIdx++
		}
	}

	if len(textParts) > 0 {
		message["content"] = strings.Join(textParts, "")
	}
	if len(toolCalls) > 0 {
		message["tool_calls"] = toolCalls
	}
	if reasoningContent != "" {
		message["reasoning_content"] = reasoningContent
	}

	// Map finish reason
	finishReason := "stop"
	if sr, ok := resp["stop_reason"].(string); ok {
		switch sr {
		case "end_turn":
			finishReason = "stop"
		case "max_tokens":
			finishReason = "length"
		case "tool_use":
			finishReason = "tool_calls"
		}
	}

	return map[string]any{
		"choices": []any{
			map[string]any{
				"index":         0,
				"message":       message,
				"finish_reason": finishReason,
			},
		},
	}
}
