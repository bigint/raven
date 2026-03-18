export const SUPPORTED_PROVIDERS = [
  { name: "Anthropic", slug: "anthropic" },
  { name: "Mistral AI", slug: "mistralai" },
  { name: "OpenAI", slug: "openai" }
];

interface ModelsDevModel {
  readonly id: string;
  readonly name: string;
  readonly family?: string;
  readonly attachment?: boolean;
  readonly reasoning?: boolean;
  readonly tool_call?: boolean;
  readonly temperature?: boolean;
  readonly structured_output?: boolean;
  readonly knowledge?: string;
  readonly release_date?: string;
  readonly modalities?: {
    readonly input?: readonly string[];
    readonly output?: readonly string[];
  };
  readonly open_weights?: boolean;
  readonly cost?: {
    readonly input?: number;
    readonly output?: number;
    readonly cache_read?: number;
    readonly cache_write?: number;
  };
  readonly limit?: {
    readonly context?: number;
    readonly output?: number;
    readonly input?: number;
  };
}

interface ModelsDevProvider {
  readonly id: string;
  readonly name: string;
  readonly models: Readonly<Record<string, ModelsDevModel>>;
}

type ModelsDevResponse = Record<string, ModelsDevProvider>;

export interface SearchResult {
  readonly id: string;
  readonly name: string;
  readonly capabilities: readonly string[];
  readonly category: string;
  readonly contextWindow: number;
  readonly maxOutput: number;
  readonly inputPrice: number;
  readonly outputPrice: number;
}

const MODELS_DEV_API = "https://models.dev/api.json";
const CACHE_TTL_MS = 10 * 60 * 1000;

export const PROVIDER_SLUG_MAP: Record<string, string> = {
  anthropic: "anthropic",
  mistral: "mistralai",
  openai: "openai"
};

const REVERSE_SLUG_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(PROVIDER_SLUG_MAP).map(([dev, ours]) => [ours, dev])
);

let cachedData: ModelsDevResponse | null = null;
let cacheTimestamp = 0;

export const fetchModelsDevCached = async (): Promise<ModelsDevResponse> => {
  if (cachedData && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedData;
  }

  const res = await fetch(MODELS_DEV_API);
  if (!res.ok) {
    throw new Error(`models.dev API error: ${res.status} ${res.statusText}`);
  }

  cachedData = (await res.json()) as ModelsDevResponse;
  cacheTimestamp = Date.now();
  return cachedData;
};

export const deriveCategory = (
  model: ModelsDevModel,
  inputPrice: number
): string => {
  const slug = model.id.toLowerCase();

  if (model.reasoning) return "reasoning";

  const lowerName = model.name.toLowerCase();
  if (
    slug.includes("mini") ||
    slug.includes("nano") ||
    slug.includes("haiku") ||
    slug.includes("flash") ||
    lowerName.includes("mini") ||
    lowerName.includes("nano")
  ) {
    return "fast";
  }

  if (slug.includes("opus") || slug.includes("pro") || inputPrice >= 5) {
    return "flagship";
  }

  return "balanced";
};

export const deriveCapabilities = (
  model: ModelsDevModel
): string[] => {
  const inputMods = model.modalities?.input ?? [];
  const hasVision = inputMods.includes("image") || inputMods.includes("video");

  return [
    "chat",
    ...(hasVision ? ["vision"] : []),
    ...(model.tool_call ? ["function_calling"] : []),
    ...(model.reasoning ? ["reasoning"] : []),
    "streaming"
  ];
};

export const searchModels = async (
  provider: string,
  query: string
): Promise<SearchResult[]> => {
  const data = await fetchModelsDevCached();
  const devSlug = REVERSE_SLUG_MAP[provider];
  if (!devSlug) return [];

  const providerData = data[devSlug];
  if (!providerData?.models) return [];

  const q = query.toLowerCase();

  return Object.values(providerData.models)
    .filter(
      (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
    )
    .map((m) => {
      const inputPrice = m.cost?.input ?? 0;
      return {
        capabilities: deriveCapabilities(m),
        category: deriveCategory(m, inputPrice),
        contextWindow: m.limit?.context ?? 0,
        id: m.id,
        inputPrice,
        maxOutput: m.limit?.output ?? 0,
        name: m.name,
        outputPrice: m.cost?.output ?? 0
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
};

export const getModelsDevModel = async (
  provider: string,
  modelId: string
): Promise<ModelsDevModel | null> => {
  const data = await fetchModelsDevCached();
  const devSlug = REVERSE_SLUG_MAP[provider];
  if (!devSlug) return null;

  const providerData = data[devSlug];
  return providerData?.models?.[modelId] ?? null;
};
