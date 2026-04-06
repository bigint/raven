import { z } from "zod";

export const createCollectionSchema = z.object({
  chunkOverlap: z.number().int().min(0).max(200).optional(),
  chunkSize: z.number().int().min(100).max(8192).optional(),
  defaultMinScore: z.number().min(0).max(1).optional(),
  defaultSearchMode: z.enum(["semantic", "keyword", "hybrid"]).optional(),
  defaultTopK: z.number().int().min(1).max(1000).optional(),
  description: z.string().max(500).optional(),
  dimension: z.number().int().optional(),
  embeddingApiKey: z.string().optional(),
  embeddingModel: z.string().optional(),
  embeddingProvider: z.string().optional(),
  isDefault: z.boolean().optional(),
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Name must only contain letters, numbers, and underscores"
    ),
  rerankingApiKey: z.string().optional(),
  rerankingEnabled: z.boolean().optional(),
  rerankingModel: z.string().optional()
});

export const updateCollectionSchema = z.object({
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional()
});
