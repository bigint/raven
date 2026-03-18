export type ModelCategory =
  | "flagship"
  | "balanced"
  | "fast"
  | "reasoning"
  | "embedding";

export interface ModelDefinition {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly provider: string;
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

export const CAPABILITY_LABELS: Record<string, string> = {
  chat: "Chat",
  embedding: "Embedding",
  function_calling: "Function Calling",
  reasoning: "Reasoning",
  streaming: "Streaming",
  vision: "Vision"
};
