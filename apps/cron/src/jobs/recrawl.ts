import { createId } from "@paralleldrive/cuid2";
import type { Database } from "@raven/db";
import { knowledgeDocuments } from "@raven/db";
import { and, eq, lt, sql } from "drizzle-orm";
import type { Redis } from "ioredis";

const QUEUE_KEY = "knowledge:jobs";

export const recrawlDueDocuments = async (
  db: Database,
  redis: Redis
): Promise<void> => {
  const due = await db
    .select({
      collectionId: knowledgeDocuments.collectionId,
      id: knowledgeDocuments.id,
      sourceUrl: knowledgeDocuments.sourceUrl
    })
    .from(knowledgeDocuments)
    .where(
      and(
        eq(knowledgeDocuments.recrawlEnabled, true),
        eq(knowledgeDocuments.sourceType, "url"),
        eq(knowledgeDocuments.status, "ready"),
        lt(
          sql`${knowledgeDocuments.lastCrawledAt} + make_interval(hours => ${knowledgeDocuments.recrawlIntervalHours})`,
          sql`now()`
        )
      )
    );

  if (due.length === 0) {
    console.log("URL recrawl: no documents due for recrawl");
    return;
  }

  for (const doc of due) {
    const job = {
      attempt: 0,
      collectionId: doc.collectionId,
      createdAt: new Date().toISOString(),
      documentId: doc.id,
      id: createId(),
      sourceUrl: doc.sourceUrl ?? undefined,
      type: "url" as const
    };
    await redis.lpush(QUEUE_KEY, JSON.stringify(job));
  }

  console.log(`URL recrawl: enqueued ${due.length} document(s) for recrawl`);
};
