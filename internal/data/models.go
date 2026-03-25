package data

var ModelCatalog = map[string]ModelDefinition{
	"claude-opus-4-6": {
		ID: "claude-opus-4-6", Slug: "claude-opus-4-6", Name: "Claude Opus 4.6",
		Provider: "anthropic", Category: ModelCategoryFlagship,
		Description: "Most capable Anthropic model for complex tasks requiring deep reasoning",
		ContextWindow: 1_000_000, MaxOutput: 32_768, InputPrice: 5, OutputPrice: 25,
		Capabilities: []string{"chat", "vision", "function_calling", "streaming", "reasoning"},
	},
	"claude-sonnet-4-6": {
		ID: "claude-sonnet-4-6", Slug: "claude-sonnet-4-6", Name: "Claude Sonnet 4.6",
		Provider: "anthropic", Category: ModelCategoryBalanced,
		Description: "Strong balance of intelligence and speed for everyday tasks",
		ContextWindow: 1_000_000, MaxOutput: 16_384, InputPrice: 3, OutputPrice: 15,
		Capabilities: []string{"chat", "vision", "function_calling", "streaming", "reasoning"},
	},
	"claude-sonnet-4-5": {
		ID: "claude-sonnet-4-5", Slug: "claude-sonnet-4-5", Name: "Claude Sonnet 4.5",
		Provider: "anthropic", Category: ModelCategoryBalanced,
		Description: "Strong balance of intelligence and speed for everyday tasks",
		ContextWindow: 200_000, MaxOutput: 16_384, InputPrice: 3, OutputPrice: 15,
		Capabilities: []string{"chat", "vision", "function_calling", "streaming", "reasoning"},
	},
	"claude-sonnet-4-5-20250929": {
		ID: "claude-sonnet-4-5-20250929", Slug: "claude-sonnet-4-5-20250929", Name: "Claude Sonnet 4.5 (2025-09-29)",
		Provider: "anthropic", Category: ModelCategoryBalanced,
		Description: "Strong balance of intelligence and speed with pinned version",
		ContextWindow: 200_000, MaxOutput: 16_384, InputPrice: 3, OutputPrice: 15,
		Capabilities: []string{"chat", "vision", "function_calling", "streaming", "reasoning"},
	},
	"claude-haiku-4-5": {
		ID: "claude-haiku-4-5", Slug: "claude-haiku-4-5", Name: "Claude Haiku 4.5",
		Provider: "anthropic", Category: ModelCategoryFast,
		Description: "Fast and cost-effective for simple tasks",
		ContextWindow: 200_000, MaxOutput: 8_192, InputPrice: 1, OutputPrice: 5,
		Capabilities: []string{"chat", "vision", "function_calling", "streaming"},
	},
	"claude-haiku-4-5-20251001": {
		ID: "claude-haiku-4-5-20251001", Slug: "claude-haiku-4-5-20251001", Name: "Claude Haiku 4.5 (2025-10-01)",
		Provider: "anthropic", Category: ModelCategoryFast,
		Description: "Fast and cost-effective with pinned version",
		ContextWindow: 200_000, MaxOutput: 8_192, InputPrice: 1, OutputPrice: 5,
		Capabilities: []string{"chat", "vision", "function_calling", "streaming"},
	},
	"gemini-2.5-pro": {
		ID: "gemini-2.5-pro", Slug: "gemini-2.5-pro", Name: "Gemini 2.5 Pro",
		Provider: "google", Category: ModelCategoryFlagship,
		Description: "Most capable Gemini model for complex reasoning and coding tasks",
		ContextWindow: 1_000_000, MaxOutput: 65_536, InputPrice: 1.25, OutputPrice: 10,
		Capabilities: []string{"chat", "vision", "function_calling", "streaming", "reasoning"},
	},
	"gemini-2.5-flash": {
		ID: "gemini-2.5-flash", Slug: "gemini-2.5-flash", Name: "Gemini 2.5 Flash",
		Provider: "google", Category: ModelCategoryFast,
		Description: "Fast and efficient model with thinking capabilities for everyday tasks",
		ContextWindow: 1_000_000, MaxOutput: 65_536, InputPrice: 0.15, OutputPrice: 0.6,
		Capabilities: []string{"chat", "vision", "function_calling", "streaming", "reasoning"},
	},
	"gemini-2.5-flash-lite": {
		ID: "gemini-2.5-flash-lite", Slug: "gemini-2.5-flash-lite", Name: "Gemini 2.5 Flash Lite",
		Provider: "google", Category: ModelCategoryFast,
		Description: "Lightest and most cost-effective Gemini model",
		ContextWindow: 1_000_000, MaxOutput: 65_536, InputPrice: 0.075, OutputPrice: 0.3,
		Capabilities: []string{"chat", "vision", "function_calling", "streaming"},
	},
	"gpt-4.1": {
		ID: "gpt-4.1", Slug: "gpt-4.1", Name: "GPT-4.1",
		Provider: "openai", Category: ModelCategoryFlagship,
		Description: "Most capable OpenAI model for complex tasks",
		ContextWindow: 1_000_000, MaxOutput: 32_768, InputPrice: 2, OutputPrice: 8,
		Capabilities: []string{"chat", "vision", "function_calling", "streaming"},
	},
	"gpt-4.1-mini": {
		ID: "gpt-4.1-mini", Slug: "gpt-4.1-mini", Name: "GPT-4.1 Mini",
		Provider: "openai", Category: ModelCategoryBalanced,
		Description: "Balanced performance at lower cost",
		ContextWindow: 1_000_000, MaxOutput: 16_384, InputPrice: 0.4, OutputPrice: 1.6,
		Capabilities: []string{"chat", "vision", "function_calling", "streaming"},
	},
	"gpt-4.1-nano": {
		ID: "gpt-4.1-nano", Slug: "gpt-4.1-nano", Name: "GPT-4.1 Nano",
		Provider: "openai", Category: ModelCategoryFast,
		Description: "Fastest and most cost-effective OpenAI model",
		ContextWindow: 1_000_000, MaxOutput: 16_384, InputPrice: 0.1, OutputPrice: 0.4,
		Capabilities: []string{"chat", "function_calling", "streaming"},
	},
	"gpt-4o": {
		ID: "gpt-4o", Slug: "gpt-4o", Name: "GPT-4o",
		Provider: "openai", Category: ModelCategoryBalanced,
		Description: "Versatile multimodal model with strong performance",
		ContextWindow: 128_000, MaxOutput: 16_384, InputPrice: 2.5, OutputPrice: 10,
		Capabilities: []string{"chat", "vision", "function_calling", "streaming"},
	},
	"gpt-4o-mini": {
		ID: "gpt-4o-mini", Slug: "gpt-4o-mini", Name: "GPT-4o Mini",
		Provider: "openai", Category: ModelCategoryFast,
		Description: "Small and fast multimodal model for lightweight tasks",
		ContextWindow: 128_000, MaxOutput: 16_384, InputPrice: 0.15, OutputPrice: 0.6,
		Capabilities: []string{"chat", "vision", "function_calling", "streaming"},
	},
	"o3": {
		ID: "o3", Slug: "o3", Name: "o3",
		Provider: "openai", Category: ModelCategoryReasoning,
		Description: "Advanced reasoning model for complex problem solving",
		ContextWindow: 200_000, MaxOutput: 100_000, InputPrice: 2, OutputPrice: 8,
		Capabilities: []string{"chat", "function_calling", "streaming", "reasoning"},
	},
	"o3-mini": {
		ID: "o3-mini", Slug: "o3-mini", Name: "o3 Mini",
		Provider: "openai", Category: ModelCategoryReasoning,
		Description: "Cost-effective reasoning model",
		ContextWindow: 200_000, MaxOutput: 100_000, InputPrice: 1.1, OutputPrice: 4.4,
		Capabilities: []string{"chat", "function_calling", "streaming", "reasoning"},
	},
	"o4-mini": {
		ID: "o4-mini", Slug: "o4-mini", Name: "o4 Mini",
		Provider: "openai", Category: ModelCategoryReasoning,
		Description: "Latest cost-effective reasoning model",
		ContextWindow: 200_000, MaxOutput: 100_000, InputPrice: 1.1, OutputPrice: 4.4,
		Capabilities: []string{"chat", "function_calling", "streaming", "reasoning"},
	},
}

func GetModelPricing(modelID string) (inputPrice, outputPrice float64, ok bool) {
	model, exists := ModelCatalog[modelID]
	if !exists {
		return 0, 0, false
	}
	return model.InputPrice, model.OutputPrice, true
}

func GetModelsForProvider(provider string) []ModelDefinition {
	var models []ModelDefinition
	for _, m := range ModelCatalog {
		if m.Provider == provider {
			models = append(models, m)
		}
	}
	return models
}
