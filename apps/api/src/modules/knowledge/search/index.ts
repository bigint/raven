import type { BigRAG } from "@bigrag/client";
import { Hono } from "hono";
import type { z } from "zod";
import { ValidationError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { jsonValidator } from "@/lib/validation";
import { searchSchema } from "./schema";

type SearchInput = z.infer<typeof searchSchema>;

export const createSearchModule = (bigrag: BigRAG) => {
  const app = new Hono();

  app.post(
    "/",
    jsonValidator(searchSchema),
    async (c: AuthContextWithJson<SearchInput>) => {
      const { collectionName, query, searchMode, threshold, topK } =
        c.req.valid("json");

      if (!collectionName) {
        throw new ValidationError("collectionName is required");
      }

      const response = await bigrag.query(collectionName, {
        query,
        ...(topK ? { top_k: topK } : {}),
        ...(threshold ? { min_score: threshold } : {}),
        ...(searchMode ? { search_mode: searchMode } : {})
      });

      return success(c, response);
    }
  );

  return app;
};
