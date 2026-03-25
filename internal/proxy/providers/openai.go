package providers

import (
	"encoding/json"
	"fmt"
	"io"
)

// TransformToOpenAI returns the body as-is since the request is already in OpenAI format.
func TransformToOpenAI(body map[string]any) ([]byte, error) {
	return json.Marshal(body)
}

// OpenAIUsage holds token counts extracted from an OpenAI response.
type OpenAIUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
	CachedTokens     int `json:"cached_tokens"`
	ReasoningTokens  int `json:"reasoning_tokens"`
}

// ParseOpenAIResponse parses a buffered OpenAI response and extracts usage.
func ParseOpenAIResponse(body io.Reader) (map[string]any, *OpenAIUsage, error) {
	var resp map[string]any
	if err := json.NewDecoder(body).Decode(&resp); err != nil {
		return nil, nil, fmt.Errorf("decode openai response: %w", err)
	}

	usage := &OpenAIUsage{}
	if u, ok := resp["usage"].(map[string]any); ok {
		if v, ok := u["prompt_tokens"].(float64); ok {
			usage.PromptTokens = int(v)
		}
		if v, ok := u["completion_tokens"].(float64); ok {
			usage.CompletionTokens = int(v)
		}
		if v, ok := u["total_tokens"].(float64); ok {
			usage.TotalTokens = int(v)
		}

		// Nested details
		if details, ok := u["prompt_tokens_details"].(map[string]any); ok {
			if v, ok := details["cached_tokens"].(float64); ok {
				usage.CachedTokens = int(v)
			}
		}
		if details, ok := u["completion_tokens_details"].(map[string]any); ok {
			if v, ok := details["reasoning_tokens"].(float64); ok {
				usage.ReasoningTokens = int(v)
			}
		}
	}

	return resp, usage, nil
}
