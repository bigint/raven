import type { Database } from "@raven/db";
import { webhooks } from "@raven/db";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const listWebhooks = (db: Database) => async (c: AuthContext) => {
  const rows = await db.select().from(webhooks);

  const masked = rows.map((row) => ({
    ...row,
    secret: `${row.secret.slice(0, 8)}...`
  }));

  return success(c, masked);
};
