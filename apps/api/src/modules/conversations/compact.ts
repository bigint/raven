import type { Database } from "@raven/db";
import { conversationMessages, conversations } from "@raven/db";
import { and, asc, eq } from "drizzle-orm";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import type { compactSchema } from "./schema";

interface CompactOptions {
  keepRecentMessages: number;
  keepSystemPrompt: boolean;
  maxTokens: number;
  strategy: "middle_out" | "sliding_window" | "summarize_old";
}

const DEFAULT_OPTIONS: CompactOptions = {
  keepRecentMessages: 10,
  keepSystemPrompt: true,
  maxTokens: 128000,
  strategy: "middle_out"
};

type Body = z.infer<typeof compactSchema>;

export const compactConversation =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const conversationId = c.req.param("id") as string;
    const body = c.req.valid("json");

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

    const result = await executeCompaction(db, conversationId, body);
    return success(c, result);
  };

export const executeCompaction = async (
  db: Database,
  conversationId: string,
  options: Partial<CompactOptions> = {}
): Promise<{
  compactedTokens: number;
  messagesKept: number;
  messagesRemoved: number;
  originalTokens: number;
  strategy: string;
}> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const allMessages = await db
    .select()
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId))
    .orderBy(asc(conversationMessages.createdAt));

  const originalTokens = allMessages.reduce((sum, m) => sum + m.tokenCount, 0);

  if (originalTokens <= opts.maxTokens) {
    return {
      compactedTokens: originalTokens,
      messagesKept: allMessages.length,
      messagesRemoved: 0,
      originalTokens,
      strategy: "none_needed"
    };
  }

  if (opts.strategy === "middle_out") {
    return middleOutCompaction(db, conversationId, allMessages, opts);
  }

  if (opts.strategy === "sliding_window") {
    return slidingWindowCompaction(db, conversationId, allMessages, opts);
  }

  return {
    compactedTokens: originalTokens,
    messagesKept: allMessages.length,
    messagesRemoved: 0,
    originalTokens,
    strategy: "unknown"
  };
};

type Message = {
  content: string;
  conversationId: string;
  createdAt: Date;
  id: string;
  metadata: Record<string, unknown> | null;
  role: string;
  tokenCount: number;
};

const middleOutCompaction = async (
  db: Database,
  conversationId: string,
  allMessages: Message[],
  opts: CompactOptions
) => {
  const originalTokens = allMessages.reduce((sum, m) => sum + m.tokenCount, 0);

  const systemMessages = allMessages.filter((m) => m.role === "system");
  const nonSystemMessages = allMessages.filter((m) => m.role !== "system");

  const keepFromEnd = Math.min(
    opts.keepRecentMessages,
    nonSystemMessages.length
  );
  const keepFromStart = Math.min(3, nonSystemMessages.length - keepFromEnd);

  const keptStart = nonSystemMessages.slice(0, keepFromStart);
  const keptEnd = nonSystemMessages.slice(-keepFromEnd);
  const removedMiddle = nonSystemMessages.slice(
    keepFromStart,
    nonSystemMessages.length - keepFromEnd
  );

  const keptMessages = [...systemMessages, ...keptStart, ...keptEnd];
  const compactedTokens = keptMessages.reduce(
    (sum, m) => sum + m.tokenCount,
    0
  );

  if (removedMiddle.length > 0) {
    const removeIds = removedMiddle.map((m) => m.id);
    for (const id of removeIds) {
      await db
        .delete(conversationMessages)
        .where(eq(conversationMessages.id, id));
    }

    await db
      .update(conversations)
      .set({
        messageCount: keptMessages.length,
        totalTokens: compactedTokens,
        updatedAt: new Date()
      })
      .where(eq(conversations.id, conversationId));
  }

  return {
    compactedTokens,
    messagesKept: keptMessages.length,
    messagesRemoved: removedMiddle.length,
    originalTokens,
    strategy: "middle_out"
  };
};

const slidingWindowCompaction = async (
  db: Database,
  conversationId: string,
  allMessages: Message[],
  opts: CompactOptions
) => {
  const originalTokens = allMessages.reduce((sum, m) => sum + m.tokenCount, 0);

  const systemMessages = allMessages.filter((m) => m.role === "system");
  const nonSystemMessages = allMessages.filter((m) => m.role !== "system");

  let tokenBudget =
    opts.maxTokens - systemMessages.reduce((sum, m) => sum + m.tokenCount, 0);
  const keptMessages: Message[] = [...systemMessages];

  for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
    const msg = nonSystemMessages[i];
    if (!msg) continue;
    if (msg.tokenCount <= tokenBudget) {
      keptMessages.unshift(msg);
      tokenBudget -= msg.tokenCount;
    } else {
      break;
    }
  }

  const keptIds = new Set(keptMessages.map((m) => m.id));
  const removedMessages = allMessages.filter((m) => !keptIds.has(m.id));

  for (const msg of removedMessages) {
    await db
      .delete(conversationMessages)
      .where(eq(conversationMessages.id, msg.id));
  }

  const compactedTokens = keptMessages.reduce(
    (sum, m) => sum + m.tokenCount,
    0
  );

  await db
    .update(conversations)
    .set({
      messageCount: keptMessages.length,
      totalTokens: compactedTokens,
      updatedAt: new Date()
    })
    .where(eq(conversations.id, conversationId));

  return {
    compactedTokens,
    messagesKept: keptMessages.length,
    messagesRemoved: removedMessages.length,
    originalTokens,
    strategy: "sliding_window"
  };
};
