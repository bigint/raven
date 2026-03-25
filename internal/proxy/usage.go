package proxy

import (
	"github.com/bigint/raven/internal/data"
)

// MapUsage extracts token usage from a provider response body.
// Handles OpenAI, Anthropic, and Google response formats.
// Returns the TokenUsage type defined in formatter.go.
func MapUsage(providerResponse map[string]any) TokenUsage {
	usage := TokenUsage{}

	usageObj, ok := providerResponse["usage"].(map[string]any)
	if !ok {
		return usage
	}

	// Input tokens: OpenAI uses prompt_tokens, Anthropic uses input_tokens
	usage.InputTokens = intFromAny(usageObj["prompt_tokens"])
	if usage.InputTokens == 0 {
		usage.InputTokens = intFromAny(usageObj["input_tokens"])
	}

	// Output tokens: OpenAI uses completion_tokens, Anthropic uses output_tokens
	usage.OutputTokens = intFromAny(usageObj["completion_tokens"])
	if usage.OutputTokens == 0 {
		usage.OutputTokens = intFromAny(usageObj["output_tokens"])
	}

	// Reasoning tokens from OpenAI completion_tokens_details
	if completionDetails, ok := usageObj["completion_tokens_details"].(map[string]any); ok {
		usage.ReasoningTokens = intFromAny(completionDetails["reasoning_tokens"])
	}

	// Cache read tokens
	// Anthropic: cache_read_input_tokens
	usage.CacheReadTokens = intFromAny(usageObj["cache_read_input_tokens"])

	// OpenAI: prompt_tokens_details.cached_tokens
	if usage.CacheReadTokens == 0 {
		if promptDetails, ok := usageObj["prompt_tokens_details"].(map[string]any); ok {
			usage.CacheReadTokens = intFromAny(promptDetails["cached_tokens"])
		}
	}

	// Cache write tokens (Anthropic)
	usage.CacheWriteTokens = intFromAny(usageObj["cache_creation_input_tokens"])

	usage.CachedTokens = usage.CacheReadTokens + usage.CacheWriteTokens

	return usage
}

// EstimateCost calculates cost in dollars using model catalog pricing.
// Prices are per million tokens.
func EstimateCost(model string, inputTokens, outputTokens int) float64 {
	inputPrice, outputPrice, ok := data.GetModelPricing(model)
	if !ok {
		return 0
	}

	inputCost := float64(inputTokens) / 1_000_000 * inputPrice
	outputCost := float64(outputTokens) / 1_000_000 * outputPrice
	return inputCost + outputCost
}

func intFromAny(v any) int {
	if v == nil {
		return 0
	}
	switch n := v.(type) {
	case float64:
		return int(n)
	case int:
		return n
	case int64:
		return int(n)
	default:
		return 0
	}
}
