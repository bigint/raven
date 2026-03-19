import type { Database } from "@raven/db";
import { modelAliases } from "@raven/db";
import { and, eq, isNull } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const listModelAliases = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const aliases = await db
    .select()
    .from(modelAliases)
    .where(
      and(
        eq(modelAliases.organizationId, orgId),
        isNull(modelAliases.deletedAt)
      )
    );

  return success(c, aliases);
};
