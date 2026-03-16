import type { Database } from "@raven/db";
import { conversationMessages, conversations } from "@raven/db";
import { and, asc, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const getConversation = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id") as string;

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(eq(conversations.id, id), eq(conversations.organizationId, orgId))
    )
    .limit(1);

  if (!conversation) {
    throw new NotFoundError("Conversation not found");
  }

  const messages = await db
    .select()
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, id))
    .orderBy(asc(conversationMessages.createdAt));

  return success(c, { ...conversation, messages });
};
