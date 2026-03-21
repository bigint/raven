import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
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

  const result: { id: string; provider: string }[] = [];

  for (const config of configs) {
    const models = config.models as string[];
    for (const model of models) {
      result.push({ id: model, provider: config.provider });
    }
  }

  return success(c, result);
};
