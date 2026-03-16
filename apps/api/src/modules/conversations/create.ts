import type { Database } from "@raven/db";
import { conversations } from "@raven/db";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { createConversationSchema } from "./schema";

type Body = z.infer<typeof createConversationSchema>;

export const createConversation =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const { title, model, systemPrompt, externalId, metadata } =
      c.req.valid("json");

    const [record] = await db
      .insert(conversations)
      .values({
        externalId,
        metadata: metadata ?? {},
        model,
        organizationId: orgId,
        systemPrompt,
        title: title ?? ""
      })
      .returning();

    const safe = record as NonNullable<typeof record>;
    void publishEvent(orgId, "conversation.created", safe);
    void logAudit(db, {
      action: "conversation.created",
      actorId: user.id,
      metadata: { model, title },
      orgId,
      resourceId: safe.id,
      resourceType: "conversation"
    });
    return created(c, safe);
  };
