import { z } from "zod";

export const requestsQuerySchema = z.object({
  from: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  model: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  provider: z.string().optional(),
  statusCode: z.coerce.number().int().optional(),
  to: z.string().optional(),
  virtualKeyId: z.string().optional()
});

export const dateRangeQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional()
});

export const sessionsQuerySchema = z.object({
  from: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  to: z.string().optional()
});

export const logsQuerySchema = z.object({
  from: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  model: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  to: z.string().optional(),
  virtualKeyId: z.string().optional()
});

export const adoptionQuerySchema = z.object({
  from: z.string().optional(),
  groupBy: z.enum(["key", "model", "userAgent"]).default("key"),
  to: z.string().optional()
});
