import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { NotFoundError } from "@/lib/errors";
import { maskApiKey } from "./helpers";

export const getProvider = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const id = c.req.param("id") as string;

  const [provider] = await db
    .select()
    .from(providerConfigs)
    .where(
      and(eq(providerConfigs.id, id), eq(providerConfigs.organizationId, orgId))
    )
    .limit(1);

  if (!provider) {
    throw new NotFoundError("Provider not found");
  }

  return c.json({
    ...provider,
    apiKey: maskApiKey(provider.apiKey)
  });
};
