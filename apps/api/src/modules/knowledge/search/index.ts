import type { QdrantClient } from "@qdrant/js-client-rest";
import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { z } from "zod";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { jsonValidator } from "@/lib/validation";
import { embedQuery, getOpenAIKey } from "../ingestion/embedder";
import { searchVectors } from "../rag/qdrant";
import { searchSchema } from "./schema";

type SearchInput = z.infer<typeof searchSchema>;

export const createSearchModule = (
  db: Database,
  _redis: unknown,
  qdrant: QdrantClient,
  env: Env
) => {
  const app = new Hono();

  app.post(
    "/",
    jsonValidator(searchSchema),
    async (c: AuthContextWithJson<SearchInput>) => {
      const { collectionId, query, threshold, topK } = c.req.valid("json");

      let collection: typeof knowledgeCollections.$inferSelect | undefined;

      if (collectionId) {
        const [found] = await db
          .select()
          .from(knowledgeCollections)
          .where(eq(knowledgeCollections.id, collectionId))
          .limit(1);
        collection = found;
      } else {
        const [found] = await db
          .select()
          .from(knowledgeCollections)
          .where(eq(knowledgeCollections.isDefault, true))
          .limit(1);
        collection = found;
      }

      if (!collection) {
        throw new NotFoundError("Collection not found");
      }

      if (!collection.isEnabled) {
        throw new ValidationError("Collection is disabled");
      }

      const apiKey = await getOpenAIKey(db, env.ENCRYPTION_SECRET);

      const queryVector = await embedQuery(
        apiKey,
        query,
        collection.embeddingModel,
        collection.embeddingDimensions
      );

      const scoreThreshold = threshold ?? collection.similarityThreshold;
      const limit = topK ?? collection.topK;

      const results = await searchVectors(
        qdrant,
        collection.id,
        queryVector,
        limit,
        scoreThreshold
      );

      const documentIds = [...new Set(results.map((r) => r.documentId))];

      const documents =
        documentIds.length > 0
          ? await db
              .select({
                id: knowledgeDocuments.id,
                title: knowledgeDocuments.title
              })
              .from(knowledgeDocuments)
              .where(eq(knowledgeDocuments.collectionId, collection.id))
          : [];

      const documentMap = new Map(documents.map((d) => [d.id, d.title]));

      const chunks = results.map((r) => ({
        chunkIndex: r.chunkIndex,
        content: r.content,
        documentId: r.documentId,
        documentTitle: documentMap.get(r.documentId) ?? null,
        id: r.id,
        metadata: r.metadata,
        score: r.score
      }));

      return success(c, { chunks, collectionId: collection.id });
    }
  );

  return app;
};
