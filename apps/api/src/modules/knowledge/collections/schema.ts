import { z } from "zod";

export const createCollectionSchema = z.object({
  // bigRAG-specific fields (forwarded to bigRAG, not stored in Raven DB)
  chunkOverlap: z.number().int().min(0).max(200).optional(),
  chunkSize: z.number().int().min(100).max(8192).optional(),
  description: z.string().max(500).optional(),
  dimension: z.number().int().optional(),
  embeddingApiKey: z.string().optional(),
  embeddingModel: z.string().optional(),
  embeddingProvider: z.string().optional(),
  // Raven-specific fields (stored in DB)
  isDefault: z.boolean().default(false),
  maxContextTokens: z.number().int().min(256).max(128000).default(4096),
  name: z.string().min(1).max(100),
  rerankingEnabled: z.boolean().default(false),
  similarityThreshold: z.number().min(0).max(1).default(0.3),
  topK: z.number().int().min(1).max(100).default(5)
});

export const updateCollectionSchema = z.object({
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  maxContextTokens: z.number().int().min(256).max(128000).optional(),
  name: z.string().min(1).max(100).optional(),
  rerankingEnabled: z.boolean().optional(),
  similarityThreshold: z.number().min(0).max(1).optional(),
  topK: z.number().int().min(1).max(100).optional()
});
