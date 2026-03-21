import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { getModelsForProvider } from "@raven/data";
import type { ModelDefinition } from "@raven/types";
import { eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const listAvailableModels = (db: Database) => async (c: AuthContext) => {
  const configs = await db
    .select({ provider: providerConfigs.provider })
    .from(providerConfigs)
    .where(eq(providerConfigs.isEnabled, true));

  const seen = new Set<string>();
  const result: ModelDefinition[] = [];

  for (const config of configs) {
    if (seen.has(config.provider)) continue;
    seen.add(config.provider);

    for (const model of getModelsForProvider(config.provider)) {
      result.push(model);
    }
  }

  return success(c, result);
};
