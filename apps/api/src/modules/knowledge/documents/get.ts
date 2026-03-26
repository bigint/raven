import type { Database } from "@raven/db";
import { knowledgeChunks, knowledgeDocuments } from "@raven/db";
import { asc, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

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

  const chunks = await db
    .select()
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.documentId, docId))
    .orderBy(asc(knowledgeChunks.chunkIndex));

  return success(c, { ...document, chunks });
};
