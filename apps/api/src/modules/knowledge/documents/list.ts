import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { and, desc, eq } from "drizzle-orm";
import type { z } from "zod";
import { success } from "@/lib/response";
import type { AuthContextWithQuery } from "@/lib/types";
import type { listDocumentsQuerySchema } from "./schema";
import { syncDocumentStatusBatch } from "./sync-status";

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

    const hasPending = documents.some(
      (d) =>
        (d.status === "pending" || d.status === "processing") &&
        d.bigragDocumentId
    );

    if (!hasPending) {
      return success(c, documents);
    }

    const [collection] = await db
      .select({ name: knowledgeCollections.name })
      .from(knowledgeCollections)
      .where(eq(knowledgeCollections.id, collectionId))
      .limit(1);

    if (!collection) {
      return success(c, documents);
    }

    const updateMap = await syncDocumentStatusBatch(
      db,
      bigrag,
      documents,
      collection.name
    );

    if (updateMap.size === 0) {
      return success(c, documents);
    }

    const updated = documents.map((doc) => {
      const patch = updateMap.get(doc.id);
      return patch ? { ...doc, ...patch } : doc;
    });

    return success(c, updated);
  };
