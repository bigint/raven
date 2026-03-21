import type { ModelDefinition } from "@raven/types";

export const SUPPORTED_PROVIDERS = [
  { name: "Anthropic", slug: "anthropic" },
  { name: "OpenAI", slug: "openai" }
] as const;

export const MODEL_CATALOG: Record<string, ModelDefinition> = {
  // Anthropic models
  "claude-opus-4-6": {
    id: "claude-opus-4-6",
    slug: "claude-opus-4-6",
    name: "Claude Opus 4 (6)",
    provider: "anthropic",
    category: "flagship",
    description:
      "Most capable Anthropic model for complex tasks requiring deep reasoning",
    contextWindow: 1_000_000,
    maxOutput: 32_000,
    inputPrice: 5,
    outputPrice: 25,
    capabilities: [
      "chat",
      "vision",
      "function_calling",
      "streaming",
      "reasoning"
    ]
  },
  "claude-sonnet-4-6": {
    id: "claude-sonnet-4-6",
    slug: "claude-sonnet-4-6",
    name: "Claude Sonnet 4 (6)",
    provider: "anthropic",
    category: "balanced",
    description:
      "Strong balance of intelligence and speed for everyday tasks",
    contextWindow: 1_000_000,
    maxOutput: 16_000,
    inputPrice: 3,
    outputPrice: 15,
    capabilities: [
      "chat",
      "vision",
      "function_calling",
      "streaming",
      "reasoning"
    ]
  },
  "claude-sonnet-4-5-20250929": {
    id: "claude-sonnet-4-5-20250929",
    slug: "claude-sonnet-4-5-20250929",
    name: "Claude Sonnet 4.5 (2025-09-29)",
    provider: "anthropic",
    category: "balanced",
    description:
      "Strong balance of intelligence and speed with pinned version",
    contextWindow: 200_000,
    maxOutput: 16_000,
    inputPrice: 3,
    outputPrice: 15,
    capabilities: [
      "chat",
      "vision",
      "function_calling",
      "streaming",
      "reasoning"
    ]
  },
  "claude-sonnet-4-5": {
    id: "claude-sonnet-4-5",
    slug: "claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    category: "balanced",
    description: "Strong balance of intelligence and speed for everyday tasks",
    contextWindow: 200_000,
    maxOutput: 16_000,
    inputPrice: 3,
    outputPrice: 15,
    capabilities: [
      "chat",
      "vision",
      "function_calling",
      "streaming",
      "reasoning"
    ]
  },
  "claude-haiku-4-5-20251001": {
    id: "claude-haiku-4-5-20251001",
    slug: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5 (2025-10-01)",
    provider: "anthropic",
    category: "fast",
    description: "Fast and cost-effective with pinned version",
    contextWindow: 200_000,
    maxOutput: 8_000,
    inputPrice: 1,
    outputPrice: 5,
    capabilities: ["chat", "vision", "function_calling", "streaming"]
  },
  "claude-haiku-4-5": {
    id: "claude-haiku-4-5",
    slug: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    category: "fast",
    description: "Fast and cost-effective for simple tasks",
    contextWindow: 200_000,
    maxOutput: 8_000,
    inputPrice: 1,
    outputPrice: 5,
    capabilities: ["chat", "vision", "function_calling", "streaming"]
  },

  // OpenAI models
  "gpt-4.1": {
    id: "gpt-4.1",
    slug: "gpt-4-1",
    name: "GPT-4.1",
    provider: "openai",
    category: "flagship",
    description: "Most capable OpenAI model for complex tasks",
    contextWindow: 1_000_000,
    maxOutput: 32_000,
    inputPrice: 2,
    outputPrice: 8,
    capabilities: ["chat", "vision", "function_calling", "streaming"]
  },
  "gpt-4.1-mini": {
    id: "gpt-4.1-mini",
    slug: "gpt-4-1-mini",
    name: "GPT-4.1 Mini",
    provider: "openai",
    category: "balanced",
    description: "Balanced performance at lower cost",
    contextWindow: 1_000_000,
    maxOutput: 16_000,
    inputPrice: 0.4,
    outputPrice: 1.6,
    capabilities: ["chat", "vision", "function_calling", "streaming"]
  },
  "gpt-4.1-nano": {
    id: "gpt-4.1-nano",
    slug: "gpt-4-1-nano",
    name: "GPT-4.1 Nano",
    provider: "openai",
    category: "fast",
    description: "Fastest and most cost-effective OpenAI model",
    contextWindow: 1_000_000,
    maxOutput: 16_000,
    inputPrice: 0.1,
    outputPrice: 0.4,
    capabilities: ["chat", "function_calling", "streaming"]
  },
  "gpt-4o": {
    id: "gpt-4o",
    slug: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    category: "balanced",
    description: "Versatile multimodal model with strong performance",
    contextWindow: 128_000,
    maxOutput: 16_000,
    inputPrice: 2.5,
    outputPrice: 10,
    capabilities: ["chat", "vision", "function_calling", "streaming"]
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    slug: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    category: "fast",
    description: "Small and fast multimodal model for lightweight tasks",
    contextWindow: 128_000,
    maxOutput: 16_000,
    inputPrice: 0.15,
    outputPrice: 0.6,
    capabilities: ["chat", "vision", "function_calling", "streaming"]
  },
  o3: {
    id: "o3",
    slug: "o3",
    name: "o3",
    provider: "openai",
    category: "reasoning",
    description: "Advanced reasoning model for complex problem solving",
    contextWindow: 200_000,
    maxOutput: 100_000,
    inputPrice: 2,
    outputPrice: 8,
    capabilities: ["chat", "function_calling", "streaming", "reasoning"]
  },
  "o3-mini": {
    id: "o3-mini",
    slug: "o3-mini",
    name: "o3 Mini",
    provider: "openai",
    category: "reasoning",
    description: "Cost-effective reasoning model",
    contextWindow: 200_000,
    maxOutput: 100_000,
    inputPrice: 1.1,
    outputPrice: 4.4,
    capabilities: ["chat", "function_calling", "streaming", "reasoning"]
  },
  "o4-mini": {
    id: "o4-mini",
    slug: "o4-mini",
    name: "o4 Mini",
    provider: "openai",
    category: "reasoning",
    description: "Latest cost-effective reasoning model",
    contextWindow: 200_000,
    maxOutput: 100_000,
    inputPrice: 1.1,
    outputPrice: 4.4,
    capabilities: ["chat", "function_calling", "streaming", "reasoning"]
  }
};

export const DEFAULT_MODELS: Record<string, string[]> = Object.values(
  MODEL_CATALOG
).reduce<Record<string, string[]>>((acc, model) => {
  const list = acc[model.provider] ?? [];
  list.push(model.id);
  acc[model.provider] = list;
  return acc;
}, {});

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
