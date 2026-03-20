import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";
import { maskApiKey } from "./helpers";

export const listProviders = (db: Database) => async (c: AuthContext) => {
  const providers = await db.select().from(providerConfigs);

  return success(
    c,
    providers.map((p) => ({
      ...p,
      apiKey: maskApiKey(p.apiKey)
    }))
  );
};
