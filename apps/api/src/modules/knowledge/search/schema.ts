import { z } from "zod";

export const searchSchema = z.object({
  collectionName: z.string().optional(),
  query: z.string().min(1).max(10000),
  searchMode: z.enum(["semantic", "keyword", "hybrid"]).optional(),
  threshold: z.number().min(0).max(1).optional(),
  topK: z.number().int().min(1).max(100).optional()
});
