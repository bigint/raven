import type { Database } from "@raven/db";
import { conversations } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

export const deleteConversation = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const user = c.get("user");
  const id = c.req.param("id") as string;

  const [existing] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(eq(conversations.id, id), eq(conversations.organizationId, orgId))
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Conversation not found");
  }

  // Messages are cascade-deleted via foreign key
  await db
    .delete(conversations)
    .where(
      and(eq(conversations.id, id), eq(conversations.organizationId, orgId))
    );

  void publishEvent(orgId, "conversation.deleted", { id });
  void logAudit(db, {
    action: "conversation.deleted",
    actorId: user.id,
    orgId,
    resourceId: id,
    resourceType: "conversation"
  });
  return success(c, { success: true });
};
