package providers

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"
)

// TransformToGoogle converts an OpenAI-format request body to Google Gemini format.
// When using the OpenAI-compatible endpoint (/chat/completions), the body is passed
// through as-is. For the native Gemini endpoint, a full transformation is performed.
func TransformToGoogle(body map[string]any, useNativeEndpoint bool) ([]byte, error) {
	if !useNativeEndpoint {
		// OpenAI-compatible endpoint: pass through as-is
		return json.Marshal(body)
	}

	geminiBody := make(map[string]any)

	// Convert messages to Gemini contents format
	rawMessages, _ := body["messages"].([]any)
	var contents []map[string]any
	var systemInstruction string

	for _, raw := range rawMessages {
		msg, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		role, _ := msg["role"].(string)

		switch role {
		case "system":
			if s, ok := msg["content"].(string); ok {
				if systemInstruction != "" {
					systemInstruction += "\n\n"
				}
				systemInstruction += s
			}
		case "user":
			contents = append(contents, map[string]any{
				"role":  "user",
				"parts": convertContentToGeminiParts(msg["content"]),
			})
		case "assistant":
			parts := convertAssistantToGeminiParts(msg)
			contents = append(contents, map[string]any{
				"role":  "model",
				"parts": parts,
			})
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

			var response any
			_ = json.Unmarshal([]byte(contentStr), &response)
			if response == nil {
				response = map[string]any{"result": contentStr}
			}

			contents = append(contents, map[string]any{
				"role": "function",
				"parts": []any{
					map[string]any{
						"functionResponse": map[string]any{
							"name":     toolCallID,
							"response": response,
						},
					},
				},
			})
		}
	}

	geminiBody["contents"] = contents

	if systemInstruction != "" {
		geminiBody["systemInstruction"] = map[string]any{
			"parts": []any{
				map[string]any{"text": systemInstruction},
			},
		}
	}

	// Generation config
	genConfig := make(map[string]any)
	if temp, ok := body["temperature"]; ok {
		genConfig["temperature"] = temp
	}
	if topP, ok := body["top_p"]; ok {
		genConfig["topP"] = topP
	}
	if mt, ok := body["max_tokens"]; ok {
		genConfig["maxOutputTokens"] = mt
	} else if mt, ok := body["max_completion_tokens"]; ok {
		genConfig["maxOutputTokens"] = mt
	}
	if stop, ok := body["stop"].([]any); ok {
		genConfig["stopSequences"] = stop
	} else if stop, ok := body["stop"].(string); ok {
		genConfig["stopSequences"] = []string{stop}
	}

	if len(genConfig) > 0 {
		geminiBody["generationConfig"] = genConfig
	}

	// Tools
	if tools, ok := body["tools"].([]any); ok && len(tools) > 0 {
		geminiTools := convertToolsToGemini(tools)
		if len(geminiTools) > 0 {
			geminiBody["tools"] = []any{
				map[string]any{"functionDeclarations": geminiTools},
			}
		}
	}

	return json.Marshal(geminiBody)
}

// convertContentToGeminiParts converts message content to Gemini parts format.
func convertContentToGeminiParts(content any) []any {
	if s, ok := content.(string); ok {
		return []any{map[string]any{"text": s}}
	}

	arr, ok := content.([]any)
	if !ok {
		return []any{map[string]any{"text": fmt.Sprintf("%v", content)}}
	}

	var parts []any
	for _, item := range arr {
		block, ok := item.(map[string]any)
		if !ok {
			continue
		}
		blockType, _ := block["type"].(string)

		switch blockType {
		case "text":
			text, _ := block["text"].(string)
			parts = append(parts, map[string]any{"text": text})
		case "image_url":
			imageURL, _ := block["image_url"].(map[string]any)
			if imageURL != nil {
				url, _ := imageURL["url"].(string)
				parts = append(parts, convertImageToGeminiPart(url))
			}
		default:
			parts = append(parts, block)
		}
	}

	return parts
}

// convertAssistantToGeminiParts converts assistant message content to Gemini parts.
func convertAssistantToGeminiParts(msg map[string]any) []any {
	var parts []any

	switch content := msg["content"].(type) {
	case string:
		if content != "" {
			parts = append(parts, map[string]any{"text": content})
		}
	case []any:
		for _, block := range content {
			if b, ok := block.(map[string]any); ok {
				if bType, _ := b["type"].(string); bType == "text" {
					text, _ := b["text"].(string)
					parts = append(parts, map[string]any{"text": text})
				}
			}
		}
	}

	// Tool calls -> functionCall parts
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
			name, _ := fn["name"].(string)

			var args any
			if argsStr, ok := fn["arguments"].(string); ok {
				_ = json.Unmarshal([]byte(argsStr), &args)
				if args == nil {
					args = map[string]any{}
				}
			} else {
				args = fn["arguments"]
			}

			parts = append(parts, map[string]any{
				"functionCall": map[string]any{
					"name": name,
					"args": args,
				},
			})
		}
	}

	return parts
}

// convertImageToGeminiPart converts an image URL to a Gemini inline data part.
func convertImageToGeminiPart(url string) map[string]any {
	if strings.HasPrefix(url, "data:") {
		parts := strings.SplitN(url, ";base64,", 2)
		if len(parts) == 2 {
			mimeType := strings.TrimPrefix(parts[0], "data:")
			return map[string]any{
				"inlineData": map[string]any{
					"mimeType": mimeType,
					"data":     parts[1],
				},
			}
		}
	}
	return map[string]any{
		"fileData": map[string]any{
			"fileUri":  url,
			"mimeType": "image/jpeg",
		},
	}
}

// convertToolsToGemini converts OpenAI function-format tools to Gemini function declarations.
func convertToolsToGemini(tools []any) []map[string]any {
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

		decl := map[string]any{
			"name":       name,
			"parameters": params,
		}
		if desc != "" {
			decl["description"] = desc
		}
		result = append(result, decl)
	}

	return result
}

// GoogleUsage holds token counts extracted from a Google Gemini response.
type GoogleUsage struct {
	PromptTokens     int `json:"promptTokenCount"`
	CompletionTokens int `json:"candidatesTokenCount"`
	TotalTokens      int `json:"totalTokenCount"`
	CachedTokens     int `json:"cachedContentTokenCount"`
}

// ParseGoogleResponse parses a buffered Google Gemini response and extracts usage.
func ParseGoogleResponse(body io.Reader) (map[string]any, *GoogleUsage, error) {
	var resp map[string]any
	if err := json.NewDecoder(body).Decode(&resp); err != nil {
		return nil, nil, fmt.Errorf("decode google response: %w", err)
	}

	usage := &GoogleUsage{}
	if u, ok := resp["usageMetadata"].(map[string]any); ok {
		if v, ok := u["promptTokenCount"].(float64); ok {
			usage.PromptTokens = int(v)
		}
		if v, ok := u["candidatesTokenCount"].(float64); ok {
			usage.CompletionTokens = int(v)
		}
		if v, ok := u["totalTokenCount"].(float64); ok {
			usage.TotalTokens = int(v)
		}
		if v, ok := u["cachedContentTokenCount"].(float64); ok {
			usage.CachedTokens = int(v)
		}
	}

	return resp, usage, nil
}

// GoogleToOpenAIResponse converts a Google Gemini response to OpenAI chat.completion format.
func GoogleToOpenAIResponse(resp map[string]any) map[string]any {
	message := map[string]any{
		"role":    "assistant",
		"content": nil,
	}

	candidates, _ := resp["candidates"].([]any)
	finishReason := "stop"

	if len(candidates) > 0 {
		candidate, _ := candidates[0].(map[string]any)
		if candidate != nil {
			content, _ := candidate["content"].(map[string]any)
			if content != nil {
				parts, _ := content["parts"].([]any)
				var textParts []string
				var toolCalls []any
				toolCallIdx := 0

				for _, part := range parts {
					p, ok := part.(map[string]any)
					if !ok {
						continue
					}

					if text, ok := p["text"].(string); ok {
						textParts = append(textParts, text)
					}

					if fc, ok := p["functionCall"].(map[string]any); ok {
						name, _ := fc["name"].(string)
						args := fc["args"]
						argsJSON, _ := json.Marshal(args)

						toolCalls = append(toolCalls, map[string]any{
							"id":    fmt.Sprintf("call_%d", toolCallIdx),
							"type":  "function",
							"index": toolCallIdx,
							"function": map[string]any{
								"name":      name,
								"arguments": string(argsJSON),
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
			}

			if fr, ok := candidate["finishReason"].(string); ok {
				switch fr {
				case "STOP":
					finishReason = "stop"
				case "MAX_TOKENS":
					finishReason = "length"
				case "SAFETY":
					finishReason = "content_filter"
				}
			}
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
