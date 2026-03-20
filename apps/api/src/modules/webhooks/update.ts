import type { Database } from "@raven/db";
import { webhooks } from "@raven/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { updateWebhookSchema } from "./schema";

type Body = z.infer<typeof updateWebhookSchema>;

export const updateWebhook =
  (db: Database) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const { url, events, isEnabled } = c.req.valid("json");

    const [existing] = await db
      .select({ id: webhooks.id })
      .from(webhooks)
      .where(eq(webhooks.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Webhook not found");
    }

    const updates: Partial<typeof webhooks.$inferInsert> = {};

    if (url !== undefined) {
      updates.url = url;
    }

    if (events !== undefined) {
      updates.events = events;
    }

    if (isEnabled !== undefined) {
      updates.isEnabled = isEnabled;
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(webhooks)
      .set(updates)
      .where(eq(webhooks.id, id))
      .returning();

    const record = updated as NonNullable<typeof updated>;
    void publishEvent("webhook.updated", record);
    void logAudit(db, {
      action: "webhook.updated",
      actorId: user.id,
      metadata: { events, isEnabled, url },
      resourceId: record.id,
      resourceType: "webhook"
    });
    return success(c, record);
  };
