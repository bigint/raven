import type { Database } from "@raven/db";
import { webhooks } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { success } from "@/lib/response";

export const listWebhooks = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;

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
