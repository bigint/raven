"use client";

const PROVIDER_ICON_MAP: Record<string, string> = {
  anthropic: "anthropic",
  cohere: "cohere-color",
  deepseek: "deepseek-color",
  fireworks: "fireworks-color",
  google: "google",
  groq: "groq",
  huggingface: "huggingface-color",
  meta: "meta-color",
  mistral: "mistral-color",
  ollama: "ollama",
  openai: "openai",
  perplexity: "perplexity-color",
  replicate: "replicate",
  together: "together-color"
};

const MODEL_ICON_RULES: [RegExp, string][] = [
  [/claude/i, "claude-color"],
  [/gpt|o1|o3|o4/i, "openai"],
  [/gemini/i, "gemini-color"],
  [/llama/i, "meta-color"],
  [/mistral|mixtral|codestral|pixtral/i, "mistral-color"],
  [/deepseek/i, "deepseek-color"],
  [/grok/i, "grok"],
  [/command/i, "cohere-color"],
  [/qwen/i, "qwen-color"],
  [/phi/i, "azure"],
  [/nova/i, "aws-color"],
  [/titan/i, "aws-color"]
];

export const getModelIconSlug = (
  model: string,
  provider?: string
): string | null => {
  const lower = model.toLowerCase();
  for (const [pattern, slug] of MODEL_ICON_RULES) {
    if (pattern.test(lower)) return slug;
  }
  if (provider) {
    return PROVIDER_ICON_MAP[provider.toLowerCase()] ?? null;
  }
  return null;
};

export const getProviderIconSlug = (provider: string): string | null =>
  PROVIDER_ICON_MAP[provider.toLowerCase()] ?? null;

interface ModelIconProps {
  model: string;
  provider?: string;
  size?: number;
  className?: string;
}

export const ModelIcon = ({
  model,
  provider,
  size = 16,
  className
}: ModelIconProps) => {
  const slug = getModelIconSlug(model, provider);
  if (!slug) return null;

  return (
    <img
      alt=""
      className={className}
      height={size}
      src={`https://unpkg.com/@lobehub/icons-static-svg@latest/icons/${slug}.svg`}
      width={size}
    />
  );
};

interface ProviderIconProps {
  provider: string;
  size?: number;
  className?: string;
}

export const ProviderIcon = ({
  provider,
  size = 14,
  className
}: ProviderIconProps) => {
  const slug = getProviderIconSlug(provider);
  if (!slug) return null;

  return (
    <img
      alt=""
      className={className}
      height={size}
      src={`https://unpkg.com/@lobehub/icons-static-svg@latest/icons/${slug}.svg`}
      width={size}
    />
  );
};
