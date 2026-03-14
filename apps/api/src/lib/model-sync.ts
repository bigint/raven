import type { Database } from "@raven/db";
import { models, syncedProviders } from "@raven/db";
import { eq, inArray } from "drizzle-orm";
import { refreshPricingCache } from "./pricing-cache";

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  architecture: {
    modality: string;
    input_modalities: string[];
    output_modalities: string[];
    tokenizer: string;
    instruct_type: string | null;
  };
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider: {
    context_length: number;
    max_completion_tokens: number;
    is_moderated: boolean;
  };
}

interface OpenRouterResponse {
  data: OpenRouterModel[];
}

const OPENROUTER_API = "https://openrouter.ai/api/v1/models";

const deriveCategory = (
  slug: string,
  name: string,
  modality: string,
  inputPrice: number
): string => {
  // Embedding models
  if (
    modality.includes("embedding") ||
    slug.includes("embedding") ||
    slug.includes("embed")
  ) {
    return "embedding";
  }

  // Reasoning models (o1, o3, o4 series)
  if (
    /^o[134]/.test(slug) ||
    slug.startsWith("o1") ||
    slug.startsWith("o3") ||
    slug.startsWith("o4")
  ) {
    return "reasoning";
  }

  // Fast/cheap models
  const lowerName = name.toLowerCase();
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

  // Flagship models (expensive or "pro"/"opus" in name)
  if (slug.includes("opus") || slug.includes("pro") || inputPrice >= 5) {
    return "flagship";
  }

  return "balanced";
};

const deriveCapabilities = (model: OpenRouterModel, slug: string): string[] => {
  const caps: string[] = [];
  const modality = model.architecture?.modality ?? "";
  const inputMods = model.architecture?.input_modalities ?? [];

  if (modality.includes("embedding") || slug.includes("embedding")) {
    caps.push("embedding");
    return caps;
  }

  caps.push("chat");

  if (inputMods.includes("image") || modality.includes("image")) {
    caps.push("vision");
  }

  // Most modern models support function calling
  caps.push("function_calling");

  // Most models support streaming (except some pro reasoning models)
  if (!slug.includes("o1-pro") && !slug.includes("o3-pro")) {
    caps.push("streaming");
  }

  // Reasoning models
  if (
    /^o[134]/.test(slug) ||
    slug.startsWith("o1") ||
    slug.startsWith("o3") ||
    slug.startsWith("o4")
  ) {
    caps.push("reasoning");
  }

  return caps;
};

const cleanModelName = (name: string): string => {
  // OpenRouter names are like "OpenAI: GPT-5.4" or "Anthropic: Claude Opus 4.6"
  const colonIndex = name.indexOf(": ");
  return colonIndex === -1 ? name : name.slice(colonIndex + 2);
};

export const syncModels = async (
  db: Database
): Promise<{ synced: number; removed: number }> => {
  // 1. Get enabled providers
  const enabledProviders = await db
    .select()
    .from(syncedProviders)
    .where(eq(syncedProviders.isEnabled, true));

  if (enabledProviders.length === 0) {
    return { removed: 0, synced: 0 };
  }

  const enabledSlugs = new Set(enabledProviders.map((p) => p.slug));

  // 2. Fetch from OpenRouter
  const res = await fetch(OPENROUTER_API);
  if (!res.ok) {
    throw new Error(`OpenRouter API error: ${res.status} ${res.statusText}`);
  }

  const { data: allModels } = (await res.json()) as OpenRouterResponse;

  // 3. Filter to enabled providers
  const filtered = allModels.filter((m) => {
    const provider = m.id.split("/")[0];
    return provider && enabledSlugs.has(provider);
  });

  // 4. Map and upsert
  const now = new Date();
  let synced = 0;

  for (const m of filtered) {
    const provider = m.id.split("/")[0]!;
    const slug = m.id.split("/").slice(1).join("/");
    const inputPrice = parseFloat(m.pricing?.prompt ?? "0") * 1_000_000;
    const outputPrice = parseFloat(m.pricing?.completion ?? "0") * 1_000_000;
    const name = cleanModelName(m.name);
    const category = deriveCategory(
      slug,
      name,
      m.architecture?.modality ?? "",
      inputPrice
    );
    const capabilities = deriveCapabilities(m, slug);
    const contextWindow =
      m.top_provider?.context_length ?? m.context_length ?? 0;
    const maxOutput = m.top_provider?.max_completion_tokens ?? 0;

    await db
      .insert(models)
      .values({
        capabilities,
        category,
        contextWindow,
        createdAt: now,
        description: m.description ?? "",
        id: m.id,
        inputPrice: inputPrice.toFixed(4),
        maxOutput,
        name,
        outputPrice: outputPrice.toFixed(4),
        provider,
        slug,
        updatedAt: now
      })
      .onConflictDoUpdate({
        set: {
          capabilities,
          category,
          contextWindow,
          description: m.description ?? "",
          inputPrice: inputPrice.toFixed(4),
          maxOutput,
          name,
          outputPrice: outputPrice.toFixed(4),
          provider,
          slug,
          updatedAt: now
        },
        target: models.id
      });

    synced++;
  }

  // 5. Remove stale models for enabled providers
  const currentIds = new Set(filtered.map((m) => m.id));
  const existingModels = await db
    .select({ id: models.id })
    .from(models)
    .where(inArray(models.provider, [...enabledSlugs]));

  const staleIds = existingModels
    .filter((m) => !currentIds.has(m.id))
    .map((m) => m.id);

  let removed = 0;
  if (staleIds.length > 0) {
    await db.delete(models).where(inArray(models.id, staleIds));
    removed = staleIds.length;
  }

  // 6. Update last_synced_at
  for (const slug of enabledSlugs) {
    await db
      .update(syncedProviders)
      .set({ lastSyncedAt: now, updatedAt: now })
      .where(eq(syncedProviders.slug, slug));
  }

  // 7. Refresh pricing cache
  await refreshPricingCache(db);

  console.log(`Model sync complete: ${synced} synced, ${removed} removed`);
  return { removed, synced };
};

/**
 * Seed default providers (openai, anthropic) if none exist.
 */
export const seedDefaultProviders = async (db: Database): Promise<void> => {
  const existing = await db.select().from(syncedProviders);
  if (existing.length > 0) return;

  await db.insert(syncedProviders).values([
    { isEnabled: true, name: "OpenAI", slug: "openai" },
    { isEnabled: true, name: "Anthropic", slug: "anthropic" }
  ]);
};
