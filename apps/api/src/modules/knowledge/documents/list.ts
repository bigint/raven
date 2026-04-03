import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { and, desc, eq } from "drizzle-orm";
import type { z } from "zod";
import { success } from "@/lib/response";
import type { AuthContextWithQuery } from "@/lib/types";
import type { listDocumentsQuerySchema } from "./schema";

type Query = z.infer<typeof listDocumentsQuerySchema>;

export const listDocuments =
  (db: Database, bigrag: BigRAG) => async (c: AuthContextWithQuery<Query>) => {
    const collectionId = c.req.param("id") as string;
    const { limit, offset, status } = c.req.valid("query");

    const conditions = [eq(knowledgeDocuments.collectionId, collectionId)];
    if (status) {
      conditions.push(eq(knowledgeDocuments.status, status));
    }

    const documents = await db
      .select()
      .from(knowledgeDocuments)
      .where(and(...conditions))
      .orderBy(desc(knowledgeDocuments.createdAt))
      .limit(limit)
      .offset(offset);

    // Inline status sync: batch-fetch fresh statuses for in-progress docs
    const pendingDocs = documents.filter(
      (d) =>
        (d.status === "pending" || d.status === "processing") &&
        d.bigragDocumentId
    );

    if (pendingDocs.length > 0) {
      const [collection] = await db
        .select({ name: knowledgeCollections.name })
        .from(knowledgeCollections)
        .where(eq(knowledgeCollections.id, collectionId))
        .limit(1);

      if (collection) {
        const updates = await Promise.all(
          pendingDocs.map(async (doc) => {
            try {
              const bigragDoc = await bigrag.getDocument(
                collection.name,
                doc.bigragDocumentId as string
              );

              if (bigragDoc.status === "ready") {
                const patch = {
                  chunkCount: bigragDoc.chunk_count,
                  errorMessage: null,
                  status: "ready" as const,
                  updatedAt: new Date()
                };
                await db
                  .update(knowledgeDocuments)
                  .set(patch)
                  .where(eq(knowledgeDocuments.id, doc.id));
                return { id: doc.id, patch };
              }

              if (bigragDoc.status === "failed") {
                const patch = {
                  errorMessage:
                    bigragDoc.error_message ?? "Processing failed in bigRAG",
                  status: "failed" as const,
                  updatedAt: new Date()
                };
                await db
                  .update(knowledgeDocuments)
                  .set(patch)
                  .where(eq(knowledgeDocuments.id, doc.id));
                return { id: doc.id, patch };
              }
            } catch {
              // Skip on error — return cached status
            }
            return null;
          })
        );

        // Apply updates to the in-memory documents list
        const updateMap = new Map(
          updates
            .filter((u): u is NonNullable<typeof u> => u !== null)
            .map((u) => [u.id, u.patch])
        );

        if (updateMap.size > 0) {
          const updated = documents.map((doc) => {
            const patch = updateMap.get(doc.id);
            return patch ? { ...doc, ...patch } : doc;
          });
          return success(c, updated);
        }
      }
    }

    return success(c, documents);
  };
