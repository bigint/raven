import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { maskApiKey } from "./helpers.js";

export const listProviders = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;

  const providers = await db
    .select()
    .from(providerConfigs)
    .where(eq(providerConfigs.organizationId, orgId));

  return c.json(
    providers.map((p) => ({
      ...p,
      apiKey: maskApiKey(p.apiKey)
    }))
  );
};
