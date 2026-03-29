import type { Database } from "@raven/db";
import { knowledgeChunks, knowledgeDocuments } from "@raven/db";
import { asc, count, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

/** GET /documents/:id — document metadata only (no chunks) */
export const getDocument = (db: Database) => async (c: AuthContext) => {
  const docId = c.req.param("id") as string;

  const [document] = await db
    .select()
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.id, docId))
    .limit(1);

  if (!document) {
    throw new NotFoundError("Document not found");
  }

  return success(c, document);
};

/** GET /documents/:id/chunks?limit=20&offset=0 — paginated chunks */
export const getDocumentChunks = (db: Database) => async (c: AuthContext) => {
  const docId = c.req.param("id") as string;
  const limit = Math.min(Number(c.req.query("limit") ?? "20"), 100);
  const offset = Number(c.req.query("offset") ?? "0");

  const chunks = await db
    .select()
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.documentId, docId))
    .orderBy(asc(knowledgeChunks.chunkIndex))
    .limit(limit)
    .offset(offset);

  const [total] = await db
    .select({ count: count() })
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.documentId, docId));

  return success(c, { chunks, total: total?.count ?? 0 });
};
