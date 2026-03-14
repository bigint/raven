import type { Provider } from "./providers";

export type ModelCategory =
  | "flagship"
  | "balanced"
  | "fast"
  | "reasoning"
  | "embedding";

export interface ModelDefinition {
  readonly id: string;
  readonly name: string;
  readonly provider: Provider;
  readonly category: ModelCategory;
  readonly description: string;
  readonly contextWindow: number;
  readonly maxOutput: number;
  readonly inputPrice: number; // per 1M tokens
  readonly outputPrice: number; // per 1M tokens
  readonly capabilities: readonly string[];
}

export const MODEL_CATEGORIES: Record<
  ModelCategory,
  { label: string; description: string }
> = {
  balanced: {
    description: "Great balance of speed, quality, and cost",
    label: "Balanced"
  },
  embedding: {
    description: "Convert text to vector representations",
    label: "Embedding"
  },
  fast: {
    description: "Optimized for speed and low cost",
    label: "Fast"
  },
  flagship: {
    description: "Most capable models for complex tasks",
    label: "Flagship"
  },
  reasoning: {
    description: "Extended thinking for complex problem solving",
    label: "Reasoning"
  }
};

export const MODEL_CATALOG: readonly ModelDefinition[] = [
  // ── Anthropic — Latest ─────────────────────────────────────
  {
    capabilities: ["chat", "vision", "function_calling", "reasoning", "streaming"],
    category: "flagship",
    contextWindow: 1_000_000,
    description:
      "The most intelligent Claude model. Exceptional at building agents, complex coding, and multi-step reasoning with extended thinking.",
    id: "claude-opus-4-6",
    inputPrice: 5,
    maxOutput: 128_000,
    name: "Claude Opus 4.6",
    outputPrice: 25,
    provider: "anthropic"
  },
  {
    capabilities: ["chat", "vision", "function_calling", "reasoning", "streaming"],
    category: "balanced",
    contextWindow: 1_000_000,
    description:
      "Best combination of speed and intelligence. Ideal for high-throughput tasks requiring strong reasoning and extended thinking.",
    id: "claude-sonnet-4-6",
    inputPrice: 3,
    maxOutput: 64_000,
    name: "Claude Sonnet 4.6",
    outputPrice: 15,
    provider: "anthropic"
  },
  {
    capabilities: ["chat", "vision", "function_calling", "reasoning", "streaming"],
    category: "fast",
    contextWindow: 200_000,
    description:
      "Fastest Claude model with near-frontier intelligence. Extended thinking support at the lowest Claude price point.",
    id: "claude-haiku-4-5-20251001",
    inputPrice: 1,
    maxOutput: 64_000,
    name: "Claude Haiku 4.5",
    outputPrice: 5,
    provider: "anthropic"
  },
  // ── Anthropic — Legacy ─────────────────────────────────────
  {
    capabilities: ["chat", "vision", "function_calling", "reasoning", "streaming"],
    category: "balanced",
    contextWindow: 1_000_000,
    description:
      "Previous generation balanced model. Strong at coding, analysis, and content generation with extended thinking.",
    id: "claude-sonnet-4-5-20250929",
    inputPrice: 3,
    maxOutput: 64_000,
    name: "Claude Sonnet 4.5",
    outputPrice: 15,
    provider: "anthropic"
  },
  {
    capabilities: ["chat", "vision", "function_calling", "reasoning", "streaming"],
    category: "flagship",
    contextWindow: 200_000,
    description:
      "Previous generation flagship. Powerful reasoning and extended thinking capabilities.",
    id: "claude-opus-4-5-20251101",
    inputPrice: 5,
    maxOutput: 64_000,
    name: "Claude Opus 4.5",
    outputPrice: 25,
    provider: "anthropic"
  },
  {
    capabilities: ["chat", "vision", "function_calling", "reasoning", "streaming"],
    category: "flagship",
    contextWindow: 200_000,
    description:
      "Legacy flagship model. Excels at complex analysis and nuanced content creation.",
    id: "claude-opus-4-1-20250805",
    inputPrice: 15,
    maxOutput: 32_000,
    name: "Claude Opus 4.1",
    outputPrice: 75,
    provider: "anthropic"
  },
  {
    capabilities: ["chat", "vision", "function_calling", "reasoning", "streaming"],
    category: "balanced",
    contextWindow: 1_000_000,
    description:
      "Legacy balanced model. Good performance for high-throughput tasks with extended thinking.",
    id: "claude-sonnet-4-20250514",
    inputPrice: 3,
    maxOutput: 64_000,
    name: "Claude Sonnet 4",
    outputPrice: 15,
    provider: "anthropic"
  },
  {
    capabilities: ["chat", "vision", "function_calling", "reasoning", "streaming"],
    category: "flagship",
    contextWindow: 200_000,
    description:
      "Original Claude 4 flagship. Strong reasoning capabilities with extended thinking support.",
    id: "claude-opus-4-20250514",
    inputPrice: 15,
    maxOutput: 32_000,
    name: "Claude Opus 4",
    outputPrice: 75,
    provider: "anthropic"
  },

  // ── OpenAI ─────────────────────────────────────────────────
  {
    capabilities: ["chat", "vision", "function_calling", "streaming"],
    category: "flagship",
    contextWindow: 1_000_000,
    description:
      "Most capable GPT model. Exceptional at complex reasoning, creative writing, and multi-modal tasks.",
    id: "gpt-5",
    inputPrice: 1.25,
    maxOutput: 32_768,
    name: "GPT-5",
    outputPrice: 10,
    provider: "openai"
  },
  {
    capabilities: ["chat", "vision", "function_calling", "streaming"],
    category: "balanced",
    contextWindow: 1_000_000,
    description:
      "Smaller GPT-5 variant. Balances strong performance with faster responses and lower cost.",
    id: "gpt-5-mini",
    inputPrice: 0.125,
    maxOutput: 16_384,
    name: "GPT-5 Mini",
    outputPrice: 1,
    provider: "openai"
  },
  {
    capabilities: ["chat", "vision", "function_calling", "streaming"],
    category: "fast",
    contextWindow: 1_000_000,
    description:
      "Smallest and fastest GPT-5 variant. Ideal for simple tasks requiring minimal latency.",
    id: "gpt-5-nano",
    inputPrice: 0.05,
    maxOutput: 16_384,
    name: "GPT-5 Nano",
    outputPrice: 0.4,
    provider: "openai"
  },
  {
    capabilities: ["chat", "vision", "function_calling", "streaming"],
    category: "flagship",
    contextWindow: 1_000_000,
    description:
      "Incremental improvement over GPT-5. Enhanced reasoning and instruction following.",
    id: "gpt-5.1",
    inputPrice: 0.625,
    maxOutput: 32_768,
    name: "GPT-5.1",
    outputPrice: 5,
    provider: "openai"
  },
  {
    capabilities: ["chat", "vision", "function_calling", "streaming"],
    category: "flagship",
    contextWindow: 1_000_000,
    description:
      "Latest GPT-5 series iteration with further improvements in accuracy and coherence.",
    id: "gpt-5.2",
    inputPrice: 0.875,
    maxOutput: 32_768,
    name: "GPT-5.2",
    outputPrice: 7,
    provider: "openai"
  },
  {
    capabilities: ["chat", "vision", "function_calling", "streaming"],
    category: "flagship",
    contextWindow: 1_000_000,
    description:
      "Most advanced GPT-5 series model with maximum capability across all benchmarks.",
    id: "gpt-5.4",
    inputPrice: 2.5,
    maxOutput: 32_768,
    name: "GPT-5.4",
    outputPrice: 15,
    provider: "openai"
  },
  {
    capabilities: ["chat", "vision", "function_calling", "streaming"],
    category: "balanced",
    contextWindow: 128_000,
    description:
      "Versatile and cost-effective. Strong all-around performance for most use cases.",
    id: "gpt-4o",
    inputPrice: 2.5,
    maxOutput: 16_384,
    name: "GPT-4o",
    outputPrice: 10,
    provider: "openai"
  },
  {
    capabilities: ["chat", "vision", "function_calling", "streaming"],
    category: "fast",
    contextWindow: 128_000,
    description:
      "Compact GPT-4o variant. Fast and affordable while retaining strong capabilities.",
    id: "gpt-4o-mini",
    inputPrice: 0.15,
    maxOutput: 16_384,
    name: "GPT-4o Mini",
    outputPrice: 0.6,
    provider: "openai"
  },
  {
    capabilities: ["chat", "vision", "function_calling", "streaming"],
    category: "balanced",
    contextWindow: 1_000_000,
    description:
      "Latest GPT-4.1 with improved instruction following and reduced hallucination.",
    id: "gpt-4.1",
    inputPrice: 2,
    maxOutput: 32_768,
    name: "GPT-4.1",
    outputPrice: 8,
    provider: "openai"
  },
  {
    capabilities: ["chat", "vision", "function_calling", "streaming"],
    category: "fast",
    contextWindow: 1_000_000,
    description:
      "Compact GPT-4.1 variant. Great balance of speed and intelligence at low cost.",
    id: "gpt-4.1-mini",
    inputPrice: 0.2,
    maxOutput: 16_384,
    name: "GPT-4.1 Mini",
    outputPrice: 0.8,
    provider: "openai"
  },
  {
    capabilities: ["chat", "vision", "function_calling", "streaming"],
    category: "fast",
    contextWindow: 1_000_000,
    description:
      "Smallest GPT-4.1 variant. Ultra-low cost for high-volume simple tasks.",
    id: "gpt-4.1-nano",
    inputPrice: 0.05,
    maxOutput: 16_384,
    name: "GPT-4.1 Nano",
    outputPrice: 0.2,
    provider: "openai"
  },
  {
    capabilities: ["chat", "vision", "function_calling", "streaming"],
    category: "balanced",
    contextWindow: 128_000,
    description:
      "Faster GPT-4 with improved capabilities. Good for complex tasks requiring speed.",
    id: "gpt-4-turbo",
    inputPrice: 5,
    maxOutput: 4_096,
    name: "GPT-4 Turbo",
    outputPrice: 15,
    provider: "openai"
  },
  {
    capabilities: ["chat", "function_calling", "streaming"],
    category: "balanced",
    contextWindow: 8_192,
    description:
      "Original GPT-4. Strong reasoning and instruction following capabilities.",
    id: "gpt-4",
    inputPrice: 30,
    maxOutput: 4_096,
    name: "GPT-4",
    outputPrice: 60,
    provider: "openai"
  },
  {
    capabilities: ["chat", "function_calling", "streaming"],
    category: "fast",
    contextWindow: 16_385,
    description:
      "Fast and cost-effective. Suitable for simpler tasks that don't require frontier capabilities.",
    id: "gpt-3.5-turbo",
    inputPrice: 0.5,
    maxOutput: 4_096,
    name: "GPT-3.5 Turbo",
    outputPrice: 1.5,
    provider: "openai"
  },
  {
    capabilities: ["chat", "vision", "reasoning", "function_calling", "streaming"],
    category: "reasoning",
    contextWindow: 200_000,
    description:
      "Advanced reasoning model. Uses extended thinking to solve complex math, science, and coding problems.",
    id: "o3",
    inputPrice: 2,
    maxOutput: 100_000,
    name: "o3",
    outputPrice: 8,
    provider: "openai"
  },
  {
    capabilities: ["chat", "reasoning", "function_calling", "streaming"],
    category: "reasoning",
    contextWindow: 200_000,
    description:
      "Compact reasoning model. Cost-effective chain-of-thought reasoning for everyday tasks.",
    id: "o3-mini",
    inputPrice: 1.1,
    maxOutput: 100_000,
    name: "o3 Mini",
    outputPrice: 4.4,
    provider: "openai"
  },
  {
    capabilities: ["chat", "vision", "reasoning", "function_calling", "streaming"],
    category: "reasoning",
    contextWindow: 200_000,
    description:
      "Latest compact reasoning model with vision support. Fast reasoning at low cost.",
    id: "o4-mini",
    inputPrice: 1.1,
    maxOutput: 100_000,
    name: "o4 Mini",
    outputPrice: 4.4,
    provider: "openai"
  },
  {
    capabilities: ["chat", "vision", "reasoning", "function_calling", "streaming"],
    category: "reasoning",
    contextWindow: 200_000,
    description:
      "First-generation reasoning model. Strong at complex multi-step problem solving.",
    id: "o1",
    inputPrice: 15,
    maxOutput: 100_000,
    name: "o1",
    outputPrice: 60,
    provider: "openai"
  },
  {
    capabilities: ["chat", "reasoning", "function_calling", "streaming"],
    category: "reasoning",
    contextWindow: 128_000,
    description:
      "Compact first-gen reasoning model. Good for coding and math at lower cost.",
    id: "o1-mini",
    inputPrice: 0.55,
    maxOutput: 65_536,
    name: "o1 Mini",
    outputPrice: 2.2,
    provider: "openai"
  },
  {
    capabilities: ["embedding"],
    category: "embedding",
    contextWindow: 8_191,
    description:
      "High-dimensional text embeddings. Best quality for search, clustering, and classification.",
    id: "text-embedding-3-large",
    inputPrice: 0.13,
    maxOutput: 0,
    name: "Embedding 3 Large",
    outputPrice: 0,
    provider: "openai"
  },
  {
    capabilities: ["embedding"],
    category: "embedding",
    contextWindow: 8_191,
    description:
      "Compact text embeddings. Good balance of quality and efficiency for most use cases.",
    id: "text-embedding-3-small",
    inputPrice: 0.02,
    maxOutput: 0,
    name: "Embedding 3 Small",
    outputPrice: 0,
    provider: "openai"
  },
  {
    capabilities: ["embedding"],
    category: "embedding",
    contextWindow: 8_191,
    description:
      "Legacy embedding model. Widely supported with established performance benchmarks.",
    id: "text-embedding-ada-002",
    inputPrice: 0.1,
    maxOutput: 0,
    name: "Embedding Ada 002",
    outputPrice: 0,
    provider: "openai"
  }
] as const;

export const CAPABILITY_LABELS: Record<string, string> = {
  chat: "Chat",
  embedding: "Embedding",
  function_calling: "Function Calling",
  reasoning: "Reasoning",
  streaming: "Streaming",
  vision: "Vision"
};
