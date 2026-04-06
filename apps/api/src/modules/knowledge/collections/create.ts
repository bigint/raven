import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import type { z } from "zod";
import { auditAndPublish } from "@/lib/audit";
import { created } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import type { createCollectionSchema } from "./schema";

type Body = z.infer<typeof createCollectionSchema>;

export const createCollection =
  (db: Database, bigrag: BigRAG) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const body = c.req.valid("json");

    const collection = await bigrag.createCollection({
      chunk_overlap: body.chunkOverlap,
      chunk_size: body.chunkSize,
      default_min_score: body.defaultMinScore,
      default_search_mode: body.defaultSearchMode,
      default_top_k: body.defaultTopK,
      description: body.description,
      dimension: body.dimension,
      embedding_api_key: body.embeddingApiKey,
      embedding_model: body.embeddingModel,
      embedding_provider: body.embeddingProvider,
      name: body.name,
      reranking_api_key: body.rerankingApiKey,
      reranking_enabled: body.rerankingEnabled,
      reranking_model: body.rerankingModel
    });

    void auditAndPublish(db, user, "collection", "created", {
      metadata: { name: body.name },
      resourceId: collection.name
    });

    return created(c, collection);
  };
