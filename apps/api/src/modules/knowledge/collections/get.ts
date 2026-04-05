import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { count, eq, sum } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { log } from "@/lib/logger";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const getCollection =
  (db: Database, bigrag: BigRAG) => async (c: AuthContext) => {
    const id = c.req.param("id") as string;

    const [collection] = await db
      .select()
      .from(knowledgeCollections)
      .where(eq(knowledgeCollections.id, id))
      .limit(1);

    if (!collection) {
      throw new NotFoundError("Collection not found");
    }

    const [stats, bigragCollection] = await Promise.all([
      db
        .select({
          chunkCount: sum(knowledgeDocuments.chunkCount),
          documentCount: count(knowledgeDocuments.id)
        })
        .from(knowledgeDocuments)
        .where(eq(knowledgeDocuments.collectionId, id))
        .then(([row]) => row),
      bigrag.getCollection(collection.name).catch((err) => {
        log.error("Failed to fetch bigRAG collection details", err, {
          collectionName: collection.name
        });
        return null;
      })
    ]);

    return success(c, {
      ...collection,
      bigrag: bigragCollection
        ? {
            chunkOverlap: bigragCollection.chunk_overlap,
            chunkSize: bigragCollection.chunk_size,
            defaultMinScore: bigragCollection.default_min_score ?? null,
            defaultSearchMode:
              bigragCollection.default_search_mode ?? "semantic",
            defaultTopK: bigragCollection.default_top_k ?? 10,
            dimension: bigragCollection.dimension,
            embeddingModel: bigragCollection.embedding_model,
            embeddingProvider: bigragCollection.embedding_provider
          }
        : null,
      chunkCount: Number(stats?.chunkCount ?? 0),
      documentCount: stats?.documentCount ?? 0
    });
  };
