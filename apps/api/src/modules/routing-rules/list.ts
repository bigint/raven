import type { Database } from "@raven/db";
import { routingRules } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { success } from "@/lib/response";

export const listRoutingRules = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;

  const rows = await db
    .select()
    .from(routingRules)
    .where(eq(routingRules.organizationId, orgId));

  return success(c, rows);
};
