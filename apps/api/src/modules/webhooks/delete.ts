import type { Database } from "@raven/db";
import { webhooks } from "@raven/db";
import { eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

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

  await db
    .delete(webhooks)
    .where(eq(webhooks.id, id));

  void publishEvent("webhook.deleted", { id });
  void logAudit(db, {
    action: "webhook.deleted",
    actorId: user.id,
    resourceId: id,
    resourceType: "webhook"
  });
  return success(c, { success: true });
};
