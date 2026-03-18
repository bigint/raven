import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { generateETag } from "@/lib/etag";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { maskApiKey } from "./helpers";

export const getProvider = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
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

  const data = { ...provider, apiKey: maskApiKey(provider.apiKey) };
  c.header("ETag", generateETag(data));

  return success(c, data);
};
