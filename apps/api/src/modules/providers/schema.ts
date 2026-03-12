import { z } from "zod";

export const createProviderSchema = z.object({
  apiKey: z.string().min(1),
  isEnabled: z.boolean().default(true),
  name: z.string().min(1).optional(),
  provider: z.string().min(1)
});

export const updateProviderSchema = z.object({
  apiKey: z.string().min(1).optional(),
  isEnabled: z.boolean().optional(),
  name: z.string().optional()
});
