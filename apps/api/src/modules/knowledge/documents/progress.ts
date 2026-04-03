import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import { streamSSE } from "hono/streaming";
import { NotFoundError } from "@/lib/errors";
import type { AuthContext } from "@/lib/types";

export const streamDocumentProgress =
  (db: Database, bigrag: BigRAG) => async (c: AuthContext) => {
    const docId = c.req.param("id") as string;

    const [document] = await db
      .select({
        bigragDocumentId: knowledgeDocuments.bigragDocumentId,
        collectionId: knowledgeDocuments.collectionId
      })
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, docId))
      .limit(1);

    if (!document?.bigragDocumentId) {
      throw new NotFoundError("Document not found");
    }

    const [collection] = await db
      .select({ name: knowledgeCollections.name })
      .from(knowledgeCollections)
      .where(eq(knowledgeCollections.id, document.collectionId))
      .limit(1);

    if (!collection) {
      throw new NotFoundError("Collection not found");
    }

    return streamSSE(c, async (stream) => {
      try {
        for await (const event of bigrag.streamDocumentProgress(
          collection.name,
          document.bigragDocumentId as string
        )) {
          await stream.writeSSE({
            data: JSON.stringify(event),
            event: "progress"
          });

          // If complete, update Raven's cached status
          if (event.step === "complete") {
            await db
              .update(knowledgeDocuments)
              .set({ status: "ready", updatedAt: new Date() })
              .where(eq(knowledgeDocuments.id, docId));
          }
        }
      } catch (err) {
        await stream.writeSSE({
          data: JSON.stringify({
            message: String(err),
            progress: 0,
            step: "error"
          }),
          event: "error"
        });
      }
    });
  };
