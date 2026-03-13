import type { Database } from "@raven/db";
import { webhooks } from "@raven/db";
import { eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const listWebhooks = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const rows = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.organizationId, orgId));

  const masked = rows.map((row) => ({
    ...row,
    secret: `${row.secret.slice(0, 8)}...`
  }));

  return success(c, masked);
};
