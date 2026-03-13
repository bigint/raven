import type { Database } from "@raven/db";
import { customDomains } from "@raven/db";
import { eq } from "drizzle-orm";
import type { AppContext } from "@/lib/types";

export const listDomains = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const rows = await db
    .select()
    .from(customDomains)
    .where(eq(customDomains.organizationId, orgId))
    .orderBy(customDomains.createdAt);
  return c.json({ data: rows });
};
