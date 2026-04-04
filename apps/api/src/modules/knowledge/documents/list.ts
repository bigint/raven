import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { knowledgeDocuments } from "@raven/db";
import { and, desc, eq } from "drizzle-orm";
import type { z } from "zod";
import { success } from "@/lib/response";
import type { AuthContextWithQuery } from "@/lib/types";
import type { listDocumentsQuerySchema } from "./schema";
import { syncDocumentStatus } from "./sync-status";

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

    const pendingDocs = documents.filter(
      (d) =>
        (d.status === "pending" || d.status === "processing") &&
        d.bigragDocumentId
    );

    if (pendingDocs.length === 0) {
      return success(c, documents);
    }

    const patches = await Promise.all(
      pendingDocs.map(async (doc) => {
        const patch = await syncDocumentStatus(db, bigrag, doc);
        return patch ? { id: doc.id, patch } : null;
      })
    );

    const updateMap = new Map(
      patches
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map((p) => [p.id, p.patch])
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
