import crypto from "node:crypto";
import type { Database } from "@raven/db";
import { webhooks } from "@raven/db";
import type { Context } from "hono";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import { logAudit } from "@/modules/audit-logs/index";
import type { createWebhookSchema } from "./schema";

export const createWebhook = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const user = c.get("user" as never) as { id: string };
  const { url, events, isEnabled } = c.req.valid("json" as never) as z.infer<
    typeof createWebhookSchema
  >;
  const secret = crypto.randomBytes(32).toString("hex");

  const [record] = await db
    .insert(webhooks)
    .values({
      events,
      isEnabled,
      organizationId: orgId,
      secret,
      url
    })
    .returning();

  const safe = record as NonNullable<typeof record>;
  void publishEvent(orgId, "webhook.created", safe);
  void logAudit(db, {
    action: "webhook.created",
    actorId: user.id,
    metadata: { events, url },
    orgId,
    resourceId: safe.id,
    resourceType: "webhook"
  });
  return created(c, safe);
};
