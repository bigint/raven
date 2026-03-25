import type { Database } from "@raven/db";
import { webhooks } from "@raven/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { auditAndPublish } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { filterUndefined } from "@/lib/utils";
import type { updateWebhookSchema } from "./schema";

type Body = z.infer<typeof updateWebhookSchema>;

export const updateWebhook =
  (db: Database) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const { url, events, isEnabled } = c.req.valid("json");

    const [updated] = await db
      .update(webhooks)
      .set({
        ...filterUndefined({ events, isEnabled, url }),
        updatedAt: new Date()
      })
      .where(eq(webhooks.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError("Webhook not found");
    }

    void auditAndPublish(db, user, "webhook", "updated", {
      data: updated,
      metadata: { events, isEnabled, url },
      resourceId: updated.id
    });
    return success(c, updated);
  };
