import type { Database } from "@raven/db";
import { knowledgeCollections } from "@raven/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { auditAndPublish } from "@/lib/audit";
import type { BigRAGClient } from "@/lib/bigrag";
import { ConflictError } from "@/lib/errors";
import { log } from "@/lib/logger";
import { created } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import type { createCollectionSchema } from "./schema";

type Body = z.infer<typeof createCollectionSchema>;

export const createCollection =
  (db: Database, bigrag: BigRAGClient) =>
  async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const body = c.req.valid("json");

    if (body.isDefault) {
      await db
        .update(knowledgeCollections)
        .set({ isDefault: false })
        .where(eq(knowledgeCollections.isDefault, true));
    }

    let record: typeof knowledgeCollections.$inferSelect;
    try {
      const [inserted] = await db
        .insert(knowledgeCollections)
        .values(body)
        .returning();
      record = inserted as NonNullable<typeof inserted>;
    } catch (err) {
      const error = err as { code?: string };
      if (error.code === "23505") {
        throw new ConflictError("A collection with that name already exists");
      }
      throw err;
    }

    try {
      await bigrag.createCollection({
        chunk_overlap: record.chunkOverlap,
        chunk_size: record.chunkSize,
        description: record.description ?? undefined,
        dimension: record.embeddingDimensions,
        embedding_model: record.embeddingModel,
        name: record.name
      });
    } catch (err) {
      log.error("Failed to create bigRAG collection, rolling back", err, {
        collectionId: record.id
      });
      await db
        .delete(knowledgeCollections)
        .where(eq(knowledgeCollections.id, record.id));
      throw err;
    }

    void auditAndPublish(db, user, "collection", "created", {
      data: record,
      metadata: { name: body.name },
      resourceId: record.id
    });
    return created(c, record);
  };
