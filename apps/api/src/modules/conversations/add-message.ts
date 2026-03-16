import type { Database } from "@raven/db";
import { conversationMessages, conversations } from "@raven/db";
import { and, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { created } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import type { addMessageSchema } from "./schema";

type Body = z.infer<typeof addMessageSchema>;

export const addMessage =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const conversationId = c.req.param("id") as string;
    const { role, content, metadata, tokenCount } = c.req.valid("json");

    const [conversation] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.organizationId, orgId)
        )
      )
      .limit(1);

    if (!conversation) {
      throw new NotFoundError("Conversation not found");
    }

    const estimatedTokens = tokenCount ?? Math.ceil(content.length / 4);

    const [message] = await db
      .insert(conversationMessages)
      .values({
        content,
        conversationId,
        metadata: metadata ?? {},
        role,
        tokenCount: estimatedTokens
      })
      .returning();

    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        messageCount: sql`${conversations.messageCount} + 1`,
        totalTokens: sql`${conversations.totalTokens} + ${estimatedTokens}`,
        updatedAt: new Date()
      })
      .where(eq(conversations.id, conversationId));

    return created(c, message);
  };
