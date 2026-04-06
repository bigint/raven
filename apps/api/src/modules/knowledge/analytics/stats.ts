import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { knowledgeQueryLogs } from "@raven/db";
import { avg, count, desc, gte } from "drizzle-orm";
import { log } from "@/lib/logger";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const getKnowledgeStats =
  (db: Database, bigrag: BigRAG) => async (c: AuthContext) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [[queryStats], topCollections, platformStats] = await Promise.all([
      db
        .select({
          avgChunksPerQuery: avg(knowledgeQueryLogs.chunksRetrieved),
          avgSimilarityScore: avg(knowledgeQueryLogs.topSimilarityScore),
          totalQueries: count()
        })
        .from(knowledgeQueryLogs)
        .where(gte(knowledgeQueryLogs.createdAt, thirtyDaysAgo)),
      db
        .select({
          collectionName: knowledgeQueryLogs.collectionName,
          queryCount: count()
        })
        .from(knowledgeQueryLogs)
        .where(gte(knowledgeQueryLogs.createdAt, thirtyDaysAgo))
        .groupBy(knowledgeQueryLogs.collectionName)
        .orderBy(desc(count()))
        .limit(10),
      bigrag.getStats().catch((err) => {
        log.error("Failed to fetch bigRAG platform stats", err);
        return null;
      })
    ]);

    return success(c, {
      avgChunksPerQuery: Number(queryStats?.avgChunksPerQuery ?? 0),
      avgSimilarityScore: Number(queryStats?.avgSimilarityScore ?? 0),
      platform: platformStats ?? null,
      topCollections: topCollections.map((row) => ({
        collectionName: row.collectionName,
        queryCount: row.queryCount
      })),
      totalQueries: queryStats?.totalQueries ?? 0
    });
  };
