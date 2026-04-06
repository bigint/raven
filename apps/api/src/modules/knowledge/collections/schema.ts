import { z } from "zod";

export const createCollectionSchema = z.object({
  chunk_overlap: z.number().int().min(0).max(200).optional(),
  chunk_size: z.number().int().min(100).max(8192).optional(),
  default_min_score: z.number().min(0).max(1).optional(),
  default_search_mode: z.enum(["semantic", "keyword", "hybrid"]).optional(),
  default_top_k: z.number().int().min(1).max(1000).optional(),
  description: z.string().max(500).optional(),
  dimension: z.number().int().optional(),
  embedding_api_key: z.string().optional(),
  embedding_model: z.string().optional(),
  embedding_provider: z.string().optional(),
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Name must only contain letters, numbers, and underscores"
    ),
  reranking_api_key: z.string().optional(),
  reranking_enabled: z.boolean().optional(),
  reranking_model: z.string().optional()
});

export const updateCollectionSchema = z.object({
  description: z.string().max(500).optional()
});
