import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { count, eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const listCollections = (db: Database) => async (c: AuthContext) => {
  const collections = await db
    .select({
      chunkOverlap: knowledgeCollections.chunkOverlap,
      chunkSize: knowledgeCollections.chunkSize,
      createdAt: knowledgeCollections.createdAt,
      description: knowledgeCollections.description,
      documentCount: count(knowledgeDocuments.id),
      embeddingDimensions: knowledgeCollections.embeddingDimensions,
      embeddingModel: knowledgeCollections.embeddingModel,
      id: knowledgeCollections.id,
      isDefault: knowledgeCollections.isDefault,
      isEnabled: knowledgeCollections.isEnabled,
      maxContextTokens: knowledgeCollections.maxContextTokens,
      name: knowledgeCollections.name,
      rerankingEnabled: knowledgeCollections.rerankingEnabled,
      similarityThreshold: knowledgeCollections.similarityThreshold,
      topK: knowledgeCollections.topK,
      updatedAt: knowledgeCollections.updatedAt
    })
    .from(knowledgeCollections)
    .leftJoin(
      knowledgeDocuments,
      eq(knowledgeDocuments.collectionId, knowledgeCollections.id)
    )
    .groupBy(knowledgeCollections.id)
    .limit(200);

  return success(c, collections);
};
