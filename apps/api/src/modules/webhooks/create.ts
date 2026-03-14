import crypto from "node:crypto";
import type { Database } from "@raven/db";
import { webhooks } from "@raven/db";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import { checkFeatureGate } from "@/modules/proxy/plan-gate";
import type { createWebhookSchema } from "./schema";

type Body = z.infer<typeof createWebhookSchema>;

export const createWebhook =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    await checkFeatureGate(db, orgId, "hasWebhooks");
    const { url, events, isEnabled } = c.req.valid("json");
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
