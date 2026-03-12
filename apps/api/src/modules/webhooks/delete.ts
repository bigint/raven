import type { Database } from "@raven/db";
import { webhooks } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import { logAudit } from "@/modules/audit-logs/index";

export const deleteWebhook = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const user = c.get("user" as never) as { id: string };
  const id = c.req.param("id") as string;

  const [existing] = await db
    .select({ id: webhooks.id })
    .from(webhooks)
    .where(and(eq(webhooks.id, id), eq(webhooks.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Webhook not found");
  }

  await db
    .delete(webhooks)
    .where(and(eq(webhooks.id, id), eq(webhooks.organizationId, orgId)));

  void publishEvent(orgId, "webhook.deleted", { id });
  void logAudit(db, {
    action: "webhook.deleted",
    actorId: user.id,
    orgId,
    resourceId: id,
    resourceType: "webhook"
  });
  return success(c, { success: true });
};
