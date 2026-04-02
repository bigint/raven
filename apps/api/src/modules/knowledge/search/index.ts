import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { z } from "zod";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { jsonValidator } from "@/lib/validation";
import { searchSchema } from "./schema";

type SearchInput = z.infer<typeof searchSchema>;

export const createSearchModule = (db: Database, bigrag: BigRAG) => {
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

      const scoreThreshold = threshold ?? collection.similarityThreshold;
      const limit = topK ?? collection.topK;

      const response = await bigrag.query(collection.name, {
        min_score: scoreThreshold,
        query,
        top_k: limit
      });

      // Map bigRAG document_id to Raven document IDs via bigragDocumentId
      const documents = await db
        .select({
          bigragDocumentId: knowledgeDocuments.bigragDocumentId,
          id: knowledgeDocuments.id,
          title: knowledgeDocuments.title
        })
        .from(knowledgeDocuments)
        .where(eq(knowledgeDocuments.collectionId, collection.id));

      const bigragToRaven = new Map(
        documents
          .filter((d) => d.bigragDocumentId)
          .map((d) => [d.bigragDocumentId!, { id: d.id, title: d.title }])
      );

      const chunks = response.results.map((r) => {
        const ravenDoc = r.document_id
          ? bigragToRaven.get(r.document_id)
          : undefined;
        return {
          chunkIndex: r.chunk_index,
          content: r.text,
          documentId: ravenDoc?.id ?? r.document_id ?? "",
          documentTitle: ravenDoc?.title ?? null,
          id: r.id,
          metadata: r.metadata,
          score: r.score
        };
      });

      return success(c, { chunks, collectionId: collection.id });
    }
  );

  return app;
};
