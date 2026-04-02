import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { count, eq, sum } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const getCollection = (db: Database) => async (c: AuthContext) => {
  const id = c.req.param("id") as string;

  const [collection] = await db
    .select()
    .from(knowledgeCollections)
    .where(eq(knowledgeCollections.id, id))
    .limit(1);

  if (!collection) {
    throw new NotFoundError("Collection not found");
  }

  const [stats] = await db
    .select({
      chunkCount: sum(knowledgeDocuments.chunkCount),
      documentCount: count(knowledgeDocuments.id),
      totalTokens: sum(knowledgeDocuments.tokenCount)
    })
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.collectionId, id));

  return success(c, {
    ...collection,
    chunkCount: Number(stats?.chunkCount ?? 0),
    documentCount: stats?.documentCount ?? 0,
    totalTokens: Number(stats?.totalTokens ?? 0)
  });
};
