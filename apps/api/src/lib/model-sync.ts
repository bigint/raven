import type { Database } from "@raven/db";
import { models, syncedProviders } from "@raven/db";
import { eq, inArray } from "drizzle-orm";
import { refreshPricingCache } from "./pricing-cache";

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

const MODELS_DEV_API = "https://models.dev/api.json";

const PROVIDER_SLUG_MAP: Record<string, string> = {
  anthropic: "anthropic",
  cerebras: "cerebras",
  deepseek: "deepseek",
  fireworks: "fireworks",
  groq: "groq",
  mistral: "mistralai",
  openai: "openai",
  perplexity: "perplexity",
  sambanova: "sambanova",
  togetherai: "together",
  xai: "x-ai"
};

const deriveCategory = (model: ModelsDevModel, inputPrice: number): string => {
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

const deriveCapabilities = (model: ModelsDevModel): string[] => {
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

export const syncModels = async (
  db: Database
): Promise<{ removed: number; synced: number }> => {
  const enabledProviders = await db
    .select()
    .from(syncedProviders)
    .where(eq(syncedProviders.isEnabled, true));

  if (enabledProviders.length === 0) {
    return { removed: 0, synced: 0 };
  }

  const enabledSlugs = new Set(enabledProviders.map((p) => p.slug));

  const res = await fetch(MODELS_DEV_API);
  if (!res.ok) {
    throw new Error(`models.dev API error: ${res.status} ${res.statusText}`);
  }

  const allProviders = (await res.json()) as ModelsDevResponse;

  const now = new Date();
  let synced = 0;
  const allIds: string[] = [];

  for (const [devSlug, providerData] of Object.entries(allProviders)) {
    const ourSlug = PROVIDER_SLUG_MAP[devSlug];
    if (!ourSlug || !enabledSlugs.has(ourSlug)) continue;

    for (const model of Object.values(providerData.models ?? {})) {
      const inputPrice = model.cost?.input ?? 0;
      const outputPrice = model.cost?.output ?? 0;
      const id = `${ourSlug}/${model.id}`;
      const category = deriveCategory(model, inputPrice);
      const capabilities = deriveCapabilities(model);

      allIds.push(id);

      await db
        .insert(models)
        .values({
          capabilities,
          category,
          contextWindow: model.limit?.context ?? 0,
          createdAt: now,
          description: "",
          id,
          inputPrice: inputPrice.toFixed(4),
          maxOutput: model.limit?.output ?? 0,
          name: model.name,
          outputPrice: outputPrice.toFixed(4),
          provider: ourSlug,
          slug: model.id,
          updatedAt: now
        })
        .onConflictDoUpdate({
          set: {
            capabilities,
            category,
            contextWindow: model.limit?.context ?? 0,
            inputPrice: inputPrice.toFixed(4),
            maxOutput: model.limit?.output ?? 0,
            name: model.name,
            outputPrice: outputPrice.toFixed(4),
            provider: ourSlug,
            slug: model.id,
            updatedAt: now
          },
          target: models.id
        });

      synced++;
    }
  }

  // Remove stale models
  const providerSlugs = [...enabledSlugs];
  const existingModels = await db
    .select({ id: models.id })
    .from(models)
    .where(inArray(models.provider, providerSlugs));

  const currentIds = new Set(allIds);
  const staleIds = existingModels
    .filter((m) => !currentIds.has(m.id))
    .map((m) => m.id);

  let removed = 0;
  if (staleIds.length > 0) {
    await db.delete(models).where(inArray(models.id, staleIds));
    removed = staleIds.length;
  }

  // Update last_synced_at
  for (const slug of enabledSlugs) {
    await db
      .update(syncedProviders)
      .set({ lastSyncedAt: now, updatedAt: now })
      .where(eq(syncedProviders.slug, slug));
  }

  await refreshPricingCache(db);

  console.log(`Model sync complete: ${synced} synced, ${removed} removed`);
  return { removed, synced };
};

const DEFAULT_PROVIDERS = [
  { isEnabled: true, name: "OpenAI", slug: "openai" },
  { isEnabled: true, name: "Anthropic", slug: "anthropic" },
  { isEnabled: true, name: "Mistral AI", slug: "mistralai" },
  { isEnabled: true, name: "xAI", slug: "x-ai" }
];

export const seedDefaultProviders = async (db: Database): Promise<void> => {
  const existing = await db.select().from(syncedProviders);
  const existingSlugs = new Set(existing.map((p) => p.slug));
  const missing = DEFAULT_PROVIDERS.filter((p) => !existingSlugs.has(p.slug));

  if (missing.length === 0) return;

  await db.insert(syncedProviders).values(missing);
};
