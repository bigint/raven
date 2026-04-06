import type { Database } from "@raven/db";
import { knowledgeQueryLogs } from "@raven/db";
import { desc } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const getQueryLogs = (db: Database) => async (c: AuthContext) => {
  const limit = Number(c.req.query("limit") ?? 50);
  const offset = Number(c.req.query("offset") ?? 0);

  const rows = await db
    .select({
      chunksInjected: knowledgeQueryLogs.chunksInjected,
      chunksRetrieved: knowledgeQueryLogs.chunksRetrieved,
      collectionName: knowledgeQueryLogs.collectionName,
      createdAt: knowledgeQueryLogs.createdAt,
      id: knowledgeQueryLogs.id,
      latencyMs: knowledgeQueryLogs.latencyMs,
      queryText: knowledgeQueryLogs.queryText,
      requestLogId: knowledgeQueryLogs.requestLogId,
      topSimilarityScore: knowledgeQueryLogs.topSimilarityScore,
      totalContextTokens: knowledgeQueryLogs.totalContextTokens
    })
    .from(knowledgeQueryLogs)
    .orderBy(desc(knowledgeQueryLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return success(c, rows);
};
