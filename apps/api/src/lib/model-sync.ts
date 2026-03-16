export const SUPPORTED_PROVIDERS = [
  { name: "Anthropic", slug: "anthropic" },
  { name: "Mistral AI", slug: "mistralai" },
  { name: "OpenAI", slug: "openai" }
];

interface ModelsDevModel {
  id: string;
  name: string;
  family?: string;
  attachment?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  temperature?: boolean;
  structured_output?: boolean;
  knowledge?: string;
  release_date?: string;
  modalities?: {
    input?: string[];
    output?: string[];
  };
  open_weights?: boolean;
  cost?: {
    input?: number;
    output?: number;
    cache_read?: number;
    cache_write?: number;
  };
  limit?: {
    context?: number;
    output?: number;
    input?: number;
  };
}

interface ModelsDevProvider {
  id: string;
  name: string;
  models: Record<string, ModelsDevModel>;
}

type ModelsDevResponse = Record<string, ModelsDevProvider>;

export interface SearchResult {
  id: string;
  name: string;
  capabilities: string[];
  category: string;
  contextWindow: number;
  maxOutput: number;
  inputPrice: number;
  outputPrice: number;
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

export const deriveCapabilities = (model: ModelsDevModel): string[] => {
  const caps: string[] = ["chat"];

  const inputMods = model.modalities?.input ?? [];
  if (inputMods.includes("image") || inputMods.includes("video")) {
    caps.push("vision");
  }
  if (model.tool_call) caps.push("function_calling");
  if (model.reasoning) caps.push("reasoning");
  caps.push("streaming");

  return caps;
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
      (m) =>
        m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
    )
    .map((m) => {
      const inputPrice = m.cost?.input ?? 0;
      return {
        id: m.id,
        name: m.name,
        capabilities: deriveCapabilities(m),
        category: deriveCategory(m, inputPrice),
        contextWindow: m.limit?.context ?? 0,
        maxOutput: m.limit?.output ?? 0,
        inputPrice,
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

