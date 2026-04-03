import { z } from "zod";

export const listDocumentsQuerySchema = z.object({
  limit: z.coerce.number().default(50),
  offset: z.coerce.number().default(0),
  status: z.enum(["pending", "processing", "ready", "failed"]).optional()
});
