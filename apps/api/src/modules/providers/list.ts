import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { maskApiKey } from "./helpers";

export const listProviders = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const providers = await db
    .select()
    .from(providerConfigs)
    .where(eq(providerConfigs.organizationId, orgId));

  return success(
    c,
    providers.map((p) => ({
      ...p,
      apiKey: maskApiKey(p.apiKey)
    }))
  );
};
