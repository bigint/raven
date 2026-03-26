import type { Database } from "@raven/db";
import { knowledgeDocuments } from "@raven/db";
import { and, desc, eq } from "drizzle-orm";
import type { z } from "zod";
import { success } from "@/lib/response";
import type { AuthContextWithQuery } from "@/lib/types";
import type { listDocumentsQuerySchema } from "./schema";

type Query = z.infer<typeof listDocumentsQuerySchema>;

export const listDocuments =
  (db: Database) => async (c: AuthContextWithQuery<Query>) => {
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

    return success(c, documents);
  };
