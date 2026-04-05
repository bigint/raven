import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { count, eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const listCollections = (db: Database) => async (c: AuthContext) => {
  const collections = await db
    .select({
      createdAt: knowledgeCollections.createdAt,
      documentCount: count(knowledgeDocuments.id),
      id: knowledgeCollections.id,
      isDefault: knowledgeCollections.isDefault,
      isEnabled: knowledgeCollections.isEnabled,
      maxContextTokens: knowledgeCollections.maxContextTokens,
      name: knowledgeCollections.name,
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
