export interface ProviderDefinition {
  readonly id: string;
  readonly label: string;
}

export const PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" }
] as const satisfies readonly ProviderDefinition[];

export type Provider = (typeof PROVIDERS)[number]["id"];

export const PROVIDER_LABELS: Record<string, string> = Object.fromEntries(
  PROVIDERS.map((p) => [p.id, p.label])
);

export const PROVIDER_OPTIONS: { label: string; value: Provider }[] =
  PROVIDERS.map((p) => ({ label: p.label, value: p.id }));

export const PROVIDER_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "All Providers", value: "" },
  ...PROVIDER_OPTIONS
];

export interface ModelInfo {
  readonly id: string;
  readonly name: string;
  readonly provider: Provider;
  readonly inputPricePer1m: number;
  readonly outputPricePer1m: number;
  readonly contextWindow: number;
  readonly supportsStreaming: boolean;
}

export interface TokenCount {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedTokens: number;
}
