import { createId } from "@paralleldrive/cuid2";
import type { Database } from "@raven/db";
import { knowledgeDocuments } from "@raven/db";
import type { Redis } from "ioredis";
import type { z } from "zod";
import { ValidationError } from "@/lib/errors";
import { created } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { hasOpenAIProvider } from "../ingestion/embedder";
import { enqueueJob } from "../ingestion/queue";
import type { ingestUrlSchema } from "./schema";

type Body = z.infer<typeof ingestUrlSchema>;

export const ingestUrl =
  (db: Database, redis: Redis) => async (c: AuthContextWithJson<Body>) => {
    const collectionId = c.req.param("id") as string;

    if (!(await hasOpenAIProvider(db))) {
      throw new ValidationError(
        "No OpenAI provider configured. Add an OpenAI provider before ingesting documents."
      );
    }

    const body = c.req.valid("json");

    const [document] = await db
      .insert(knowledgeDocuments)
      .values({
        collectionId,
        mimeType: "text/html",
        recrawlEnabled: body.recrawlEnabled,
        recrawlIntervalHours: body.recrawlIntervalHours,
        sourceType: "url",
        sourceUrl: body.url,
        title: body.title ?? body.url
      })
      .returning();

    await enqueueJob(redis, {
      collectionId,
      documentId: (document as NonNullable<typeof document>).id,
      id: createId(),
      sourceUrl: body.url,
      type: "url"
    });

    return created(c, document);
  };
