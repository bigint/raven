interface ProviderDefinition {
  readonly id: string;
  readonly label: string;
}

const PROVIDERS = [
  { id: "anthropic", label: "Anthropic" },
  { id: "openai", label: "OpenAI" }
] as const satisfies readonly ProviderDefinition[];

type Provider = (typeof PROVIDERS)[number]["id"];

export const PROVIDER_LABELS: Record<string, string> = Object.fromEntries(
  PROVIDERS.map((p) => [p.id, p.label])
);

const PROVIDER_OPTIONS: { label: string; value: Provider }[] = PROVIDERS.map(
  (p) => ({ label: p.label, value: p.id })
);

export const PROVIDER_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "All Providers", value: "" },
  ...PROVIDER_OPTIONS
];
