import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import {
  knowledgeCollections,
  knowledgeDocuments,
  knowledgeQueryLogs
} from "@raven/db";
import { avg, count, desc, eq, gte, sum } from "drizzle-orm";
import { log } from "@/lib/logger";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const getKnowledgeStats =
  (db: Database, bigrag: BigRAG) => async (c: AuthContext) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      [collectionCount],
      [documentStats],
      [queryStats],
      topCollections,
      platformStats
    ] = await Promise.all([
      db.select({ value: count() }).from(knowledgeCollections),
      db
        .select({
          totalChunks: sum(knowledgeDocuments.chunkCount),
          totalDocuments: count()
        })
        .from(knowledgeDocuments),
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
          collectionId: knowledgeQueryLogs.collectionId,
          collectionName: knowledgeCollections.name,
          queryCount: count()
        })
        .from(knowledgeQueryLogs)
        .leftJoin(
          knowledgeCollections,
          eq(knowledgeQueryLogs.collectionId, knowledgeCollections.id)
        )
        .where(gte(knowledgeQueryLogs.createdAt, thirtyDaysAgo))
        .groupBy(knowledgeQueryLogs.collectionId, knowledgeCollections.name)
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
      collectionCount: collectionCount?.value ?? 0,
      documentCount: documentStats?.totalDocuments ?? 0,
      platform: platformStats ?? null,
      topCollections: topCollections.map((row) => ({
        collectionId: row.collectionId,
        collectionName: row.collectionName ?? "Unknown",
        queryCount: row.queryCount
      })),
      totalChunks: Number(documentStats?.totalChunks ?? 0),
      totalQueries: queryStats?.totalQueries ?? 0
    });
  };
