import type { Database } from "@raven/db";
import { plugins } from "@raven/db";
import { eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const listPlugins = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const rows = await db
    .select()
    .from(plugins)
    .where(eq(plugins.organizationId, orgId));

  return success(c, rows);
};
