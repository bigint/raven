"use client";

const LOGO_BASE = "https://models.dev/logos";

const PROVIDER_LOGO_MAP: Record<string, string> = {
  anthropic: "anthropic",
  deepseek: "deepseek",
  google: "google",
  mistralai: "mistral",
  openai: "openai",
  "x-ai": "xai"
};

const MODEL_PROVIDER_RULES: [RegExp, string][] = [
  [/claude/i, "anthropic"],
  [/deepseek/i, "deepseek"],
  [/gemini|gemma/i, "google"],
  [/gpt|o1|o3|o4|codex/i, "openai"],
  [/grok/i, "xai"],
  [/mistral|mixtral|codestral|pixtral|devstral/i, "mistral"]
];

const getLogoSlug = (provider: string): string | null =>
  PROVIDER_LOGO_MAP[provider.toLowerCase()] ?? null;

const getModelLogoSlug = (model: string, provider?: string): string | null => {
  for (const [pattern, slug] of MODEL_PROVIDER_RULES) {
    if (pattern.test(model)) return slug;
  }
  if (provider) return getLogoSlug(provider);
  return null;
};

interface ModelIconProps {
  className?: string;
  model: string;
  provider?: string;
  size?: number;
}

export const ModelIcon = ({
  className,
  model,
  provider,
  size = 16
}: ModelIconProps) => {
  const slug = getModelLogoSlug(model, provider);
  if (!slug) return null;

  return (
    <img
      alt=""
      className={className}
      height={size}
      src={`${LOGO_BASE}/${slug}.svg`}
      width={size}
    />
  );
};

interface ProviderIconProps {
  className?: string;
  provider: string;
  size?: number;
}

export const ProviderIcon = ({
  className,
  provider,
  size = 14
}: ProviderIconProps) => {
  const slug = getLogoSlug(provider);
  if (!slug) return null;

  return (
    <img
      alt=""
      className={className}
      height={size}
      src={`${LOGO_BASE}/${slug}.svg`}
      width={size}
    />
  );
};
