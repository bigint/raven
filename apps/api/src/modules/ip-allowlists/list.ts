import type { Database } from "@raven/db";
import { ipAllowlists } from "@raven/db";
import { eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const listIpRules = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const rows = await db
    .select()
    .from(ipAllowlists)
    .where(eq(ipAllowlists.organizationId, orgId));

  return success(c, rows);
};
