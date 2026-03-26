import { z } from "zod";

export const ingestUrlSchema = z.object({
  crawlLimit: z.number().int().min(1).max(1000).default(50),
  recrawlEnabled: z.boolean().default(false),
  recrawlIntervalHours: z.number().int().min(1).max(720).optional(),
  title: z.string().optional(),
  url: z.string().url()
});

export const listDocumentsQuerySchema = z.object({
  limit: z.coerce.number().default(50),
  offset: z.coerce.number().default(0),
  status: z.enum(["pending", "processing", "ready", "failed"]).optional()
});
