import { z } from "zod";

export const listQuerySchema = z.object({
  action: z.string().optional(),
  actorId: z.string().optional(),
  from: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  resourceType: z.string().optional(),
  to: z.coerce.date().optional()
});
