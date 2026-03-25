import type { ModelDefinition } from "@raven/types";

export const SUPPORTED_PROVIDERS = [
  { name: "Anthropic", slug: "anthropic" },
  { name: "Google", slug: "google" },
  { name: "OpenAI", slug: "openai" }
] as const;

export const MODEL_CATALOG: Record<string, ModelDefinition> = {
  "claude-haiku-4-5": {
    capabilities: ["chat", "vision", "function_calling", "streaming"],
    category: "fast",
    contextWindow: 200_000,
    description: "Fast and cost-effective for simple tasks",
    id: "claude-haiku-4-5",
    inputPrice: 1,
    maxOutput: 8_192,
    name: "Claude Haiku 4.5",
    outputPrice: 5,
    provider: "anthropic",
    slug: "claude-haiku-4-5"
  },
  "claude-haiku-4-5-20251001": {
    capabilities: ["chat", "vision", "function_calling", "streaming"],
    category: "fast",
    contextWindow: 200_000,
    description: "Fast and cost-effective with pinned version",
    id: "claude-haiku-4-5-20251001",
    inputPrice: 1,
    maxOutput: 8_192,
    name: "Claude Haiku 4.5 (2025-10-01)",
    outputPrice: 5,
    provider: "anthropic",
    slug: "claude-haiku-4-5-20251001"
  },
  // Anthropic models
  "claude-opus-4-6": {
    capabilities: [
      "chat",
      "vision",
      "function_calling",
      "streaming",
      "reasoning"
    ],
    category: "flagship",
    contextWindow: 1_000_000,
    description:
      "Most capable Anthropic model for complex tasks requiring deep reasoning",
    id: "claude-opus-4-6",
    inputPrice: 5,
    maxOutput: 32_768,
    name: "Claude Opus 4.6",
    outputPrice: 25,
    provider: "anthropic",
    slug: "claude-opus-4-6"
  },
  "claude-sonnet-4-5": {
    capabilities: [
      "chat",
      "vision",
      "function_calling",
      "streaming",
      "reasoning"
    ],
    category: "balanced",
    contextWindow: 200_000,
    description: "Strong balance of intelligence and speed for everyday tasks",
    id: "claude-sonnet-4-5",
    inputPrice: 3,
    maxOutput: 16_384,
    name: "Claude Sonnet 4.5",
    outputPrice: 15,
    provider: "anthropic",
    slug: "claude-sonnet-4-5"
  },
  "claude-sonnet-4-5-20250929": {
    capabilities: [
      "chat",
      "vision",
      "function_calling",
      "streaming",
      "reasoning"
    ],
    category: "balanced",
    contextWindow: 200_000,
    description: "Strong balance of intelligence and speed with pinned version",
    id: "claude-sonnet-4-5-20250929",
    inputPrice: 3,
    maxOutput: 16_384,
    name: "Claude Sonnet 4.5 (2025-09-29)",
    outputPrice: 15,
    provider: "anthropic",
    slug: "claude-sonnet-4-5-20250929"
  },
  "claude-sonnet-4-6": {
    capabilities: [
      "chat",
      "vision",
      "function_calling",
      "streaming",
      "reasoning"
    ],
    category: "balanced",
    contextWindow: 1_000_000,
    description: "Strong balance of intelligence and speed for everyday tasks",
    id: "claude-sonnet-4-6",
    inputPrice: 3,
    maxOutput: 16_384,
    name: "Claude Sonnet 4.6",
    outputPrice: 15,
    provider: "anthropic",
    slug: "claude-sonnet-4-6"
  },

  // Google models
  "gemini-2.5-flash": {
    capabilities: [
      "chat",
      "vision",
      "function_calling",
      "streaming",
      "reasoning"
    ],
    category: "fast",
    contextWindow: 1_000_000,
    description:
      "Fast and efficient model with thinking capabilities for everyday tasks",
    id: "gemini-2.5-flash",
    inputPrice: 0.15,
    maxOutput: 65_536,
    name: "Gemini 2.5 Flash",
    outputPrice: 0.6,
    provider: "google",
    slug: "gemini-2.5-flash"
  },
  "gemini-2.5-flash-lite": {
    capabilities: ["chat", "vision", "function_calling", "streaming"],
    category: "fast",
    contextWindow: 1_000_000,
    description: "Lightest and most cost-effective Gemini model",
    id: "gemini-2.5-flash-lite",
    inputPrice: 0.075,
    maxOutput: 65_536,
    name: "Gemini 2.5 Flash Lite",
    outputPrice: 0.3,
    provider: "google",
    slug: "gemini-2.5-flash-lite"
  },
  "gemini-2.5-pro": {
    capabilities: [
      "chat",
      "vision",
      "function_calling",
      "streaming",
      "reasoning"
    ],
    category: "flagship",
    contextWindow: 1_000_000,
    description:
      "Most capable Gemini model for complex reasoning and coding tasks",
    id: "gemini-2.5-pro",
    inputPrice: 1.25,
    maxOutput: 65_536,
    name: "Gemini 2.5 Pro",
    outputPrice: 10,
    provider: "google",
    slug: "gemini-2.5-pro"
  },

  // OpenAI models
  "gpt-4.1": {
    capabilities: ["chat", "vision", "function_calling", "streaming"],
    category: "flagship",
    contextWindow: 1_000_000,
    description: "Most capable OpenAI model for complex tasks",
    id: "gpt-4.1",
    inputPrice: 2,
    maxOutput: 32_768,
    name: "GPT-4.1",
    outputPrice: 8,
    provider: "openai",
    slug: "gpt-4.1"
  },
  "gpt-4.1-mini": {
    capabilities: ["chat", "vision", "function_calling", "streaming"],
    category: "balanced",
    contextWindow: 1_000_000,
    description: "Balanced performance at lower cost",
    id: "gpt-4.1-mini",
    inputPrice: 0.4,
    maxOutput: 16_384,
    name: "GPT-4.1 Mini",
    outputPrice: 1.6,
    provider: "openai",
    slug: "gpt-4.1-mini"
  },
  "gpt-4.1-nano": {
    capabilities: ["chat", "function_calling", "streaming"],
    category: "fast",
    contextWindow: 1_000_000,
    description: "Fastest and most cost-effective OpenAI model",
    id: "gpt-4.1-nano",
    inputPrice: 0.1,
    maxOutput: 16_384,
    name: "GPT-4.1 Nano",
    outputPrice: 0.4,
    provider: "openai",
    slug: "gpt-4.1-nano"
  },
  "gpt-4o": {
    capabilities: ["chat", "vision", "function_calling", "streaming"],
    category: "balanced",
    contextWindow: 128_000,
    description: "Versatile multimodal model with strong performance",
    id: "gpt-4o",
    inputPrice: 2.5,
    maxOutput: 16_384,
    name: "GPT-4o",
    outputPrice: 10,
    provider: "openai",
    slug: "gpt-4o"
  },
  "gpt-4o-mini": {
    capabilities: ["chat", "vision", "function_calling", "streaming"],
    category: "fast",
    contextWindow: 128_000,
    description: "Small and fast multimodal model for lightweight tasks",
    id: "gpt-4o-mini",
    inputPrice: 0.15,
    maxOutput: 16_384,
    name: "GPT-4o Mini",
    outputPrice: 0.6,
    provider: "openai",
    slug: "gpt-4o-mini"
  },
  o3: {
    capabilities: ["chat", "function_calling", "streaming", "reasoning"],
    category: "reasoning",
    contextWindow: 200_000,
    description: "Advanced reasoning model for complex problem solving",
    id: "o3",
    inputPrice: 2,
    maxOutput: 100_000,
    name: "o3",
    outputPrice: 8,
    provider: "openai",
    slug: "o3"
  },
  "o3-mini": {
    capabilities: ["chat", "function_calling", "streaming", "reasoning"],
    category: "reasoning",
    contextWindow: 200_000,
    description: "Cost-effective reasoning model",
    id: "o3-mini",
    inputPrice: 1.1,
    maxOutput: 100_000,
    name: "o3 Mini",
    outputPrice: 4.4,
    provider: "openai",
    slug: "o3-mini"
  },
  "o4-mini": {
    capabilities: ["chat", "function_calling", "streaming", "reasoning"],
    category: "reasoning",
    contextWindow: 200_000,
    description: "Latest cost-effective reasoning model",
    id: "o4-mini",
    inputPrice: 1.1,
    maxOutput: 100_000,
    name: "o4 Mini",
    outputPrice: 4.4,
    provider: "openai",
    slug: "o4-mini"
  }
};

export const getModelPricing = (
  modelId: string
): { inputPrice: number; outputPrice: number } | null => {
  const model = MODEL_CATALOG[modelId];
  if (!model) {
    return null;
  }
  return { inputPrice: model.inputPrice, outputPrice: model.outputPrice };
};

export const getModelsForProvider = (provider: string): ModelDefinition[] => {
  return Object.values(MODEL_CATALOG).filter(
    (model) => model.provider === provider
  );
};
