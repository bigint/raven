import type { Database } from "@raven/db";
import { webhooks } from "@raven/db";
import { eq } from "drizzle-orm";
import { auditAndPublish } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const deleteWebhook = (db: Database) => async (c: AuthContext) => {
  const user = c.get("user");
  const id = c.req.param("id") as string;

  const [existing] = await db
    .select({ id: webhooks.id })
    .from(webhooks)
    .where(eq(webhooks.id, id))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Webhook not found");
  }

  await db.delete(webhooks).where(eq(webhooks.id, id));

  void auditAndPublish(db, user, "webhook", "deleted", { resourceId: id });
  return success(c, { success: true });
};
