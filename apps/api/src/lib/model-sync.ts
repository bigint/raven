export const SUPPORTED_PROVIDERS = [
  { name: "Anthropic", slug: "anthropic" },
  { name: "DeepSeek", slug: "deepseek" },
  { name: "Google", slug: "google" },
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

const MODELS_DEV_API = "https://models.dev/api.json";
const CACHE_TTL_MS = 10 * 60 * 1000;

export const PROVIDER_SLUG_MAP: Record<string, string> = {
  anthropic: "anthropic",
  deepseek: "deepseek",
  google: "google",
  mistral: "mistralai",
  openai: "openai"
};

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
