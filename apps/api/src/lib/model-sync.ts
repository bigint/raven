export const SUPPORTED_PROVIDERS = [
  { name: "Anthropic", slug: "anthropic" },
  { name: "DeepSeek", slug: "deepseek" },
  { name: "Google", slug: "google" },
  { name: "Mistral AI", slug: "mistralai" },
  { name: "OpenAI", slug: "openai" }
];

export interface GatewayModel {
  readonly id: string;
  readonly name: string;
  readonly owned_by: string;
  readonly type: string;
  readonly context_window: number;
  readonly max_tokens: number;
  readonly tags: readonly string[];
  readonly pricing?: {
    readonly input?: string;
    readonly output?: string;
  };
}

interface GatewayResponse {
  readonly object: string;
  readonly data: readonly GatewayModel[];
}

const GATEWAY_API = "https://ai-gateway.vercel.sh/v1/models";
const CACHE_TTL_MS = 10 * 60 * 1000;

/** Maps gateway owned_by values to our internal provider slugs */
export const PROVIDER_SLUG_MAP: Record<string, string> = {
  anthropic: "anthropic",
  deepseek: "deepseek",
  google: "google",
  mistral: "mistralai",
  openai: "openai"
};

const SUPPORTED_SLUGS = new Set(Object.values(PROVIDER_SLUG_MAP));

let cachedData: readonly GatewayModel[] | null = null;
let cacheTimestamp = 0;

export const fetchModelsCached = async (): Promise<readonly GatewayModel[]> => {
  if (cachedData && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedData;
  }

  const res = await fetch(GATEWAY_API);
  if (!res.ok) {
    throw new Error(`Gateway API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as GatewayResponse;
  cachedData = json.data;
  cacheTimestamp = Date.now();
  return cachedData;
};

/** Convert per-token price string to per-million-token number */
export const toPerMillion = (perToken: string | undefined): number => {
  if (!perToken) return 0;
  return parseFloat(perToken) * 1_000_000;
};

export const resolveProvider = (model: GatewayModel): string | null => {
  const slug = PROVIDER_SLUG_MAP[model.owned_by];
  return slug && SUPPORTED_SLUGS.has(slug) ? slug : null;
};

export const extractModelSlug = (gatewayId: string): string => {
  const slashIndex = gatewayId.indexOf("/");
  return slashIndex >= 0 ? gatewayId.slice(slashIndex + 1) : gatewayId;
};

export const deriveCategory = (
  model: GatewayModel,
  inputPrice: number
): string => {
  const slug = model.id.toLowerCase();

  if (model.tags.includes("reasoning")) return "reasoning";

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

export const deriveCapabilities = (model: GatewayModel): string[] => {
  return [
    "chat",
    ...(model.tags.includes("vision") ? ["vision"] : []),
    ...(model.tags.includes("tool-use") ? ["function_calling"] : []),
    ...(model.tags.includes("reasoning") ? ["reasoning"] : []),
    "streaming"
  ];
};
