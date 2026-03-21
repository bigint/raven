import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { MODEL_CATALOG } from "@raven/data";
import type { ModelDefinition } from "@raven/types";
import { eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const listAvailableModels = (db: Database) => async (c: AuthContext) => {
  const configs = await db
    .select({
      models: providerConfigs.models,
      provider: providerConfigs.provider
    })
    .from(providerConfigs)
    .where(eq(providerConfigs.isEnabled, true));

  const seen = new Set<string>();
  const result: ModelDefinition[] = [];

  for (const config of configs) {
    const models = config.models as string[];
    for (const modelId of models) {
      if (seen.has(modelId)) continue;
      seen.add(modelId);
      const catalogEntry = MODEL_CATALOG[modelId];
      if (catalogEntry) {
        result.push(catalogEntry);
      }
    }
  }

  return success(c, result);
};
