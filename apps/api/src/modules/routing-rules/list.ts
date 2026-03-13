import type { Database } from "@raven/db";
import { routingRules } from "@raven/db";
import { eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const listRoutingRules = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const rows = await db
    .select()
    .from(routingRules)
    .where(eq(routingRules.organizationId, orgId));

  return success(c, rows);
};
