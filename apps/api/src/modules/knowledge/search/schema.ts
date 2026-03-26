import { z } from "zod";

export const searchSchema = z.object({
  collectionId: z.string().optional(),
  query: z.string().min(1).max(10000),
  threshold: z.number().min(0).max(1).optional(),
  topK: z.number().int().min(1).max(100).optional()
});
