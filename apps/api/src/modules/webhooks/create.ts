import crypto from "node:crypto";
import type { Database } from "@raven/db";
import { webhooks } from "@raven/db";
import type { z } from "zod";
import { auditAndPublish } from "@/lib/audit";
import { created } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import type { createWebhookSchema } from "./schema";

type Body = z.infer<typeof createWebhookSchema>;

export const createWebhook =
  (db: Database) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const { url, events, isEnabled } = c.req.valid("json");
    const secret = crypto.randomBytes(32).toString("hex");

    const [record] = await db
      .insert(webhooks)
      .values({
        events,
        isEnabled,
        secret,
        url
      })
      .returning();

    const safe = record as NonNullable<typeof record>;
    void auditAndPublish(db, user, "webhook", "created", {
      data: safe,
      metadata: { events, url },
      resourceId: safe.id
    });
    return created(c, safe);
  };
