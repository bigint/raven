import type { Database } from "@raven/db";
import { models, providerConfigs } from "@raven/db";
import { eq, inArray } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const listAvailableModels = (db: Database) => async (c: AuthContext) => {
  // Get distinct providers configured
  const configs = await db
    .selectDistinct({ provider: providerConfigs.provider })
    .from(providerConfigs)
    .where(eq(providerConfigs.isEnabled, true));

  const providerNames = configs.map((c) => c.provider);

  if (providerNames.length === 0) {
    return success(c, []);
  }

  const result = await db
    .select()
    .from(models)
    .where(inArray(models.provider, providerNames));

  return success(
    c,
    result.map((m) => ({
      capabilities: m.capabilities,
      category: m.category,
      contextWindow: m.contextWindow,
      id: m.id,
      inputPrice: Number.parseFloat(m.inputPrice ?? "0"),
      maxOutput: m.maxOutput,
      name: m.name,
      outputPrice: Number.parseFloat(m.outputPrice ?? "0"),
      provider: m.provider,
      slug: m.slug
    }))
  );
};
