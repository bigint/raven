import { z } from "zod";

export const createWebhookSchema = z.object({
  events: z.array(z.string().min(1)).min(1),
  isEnabled: z.boolean().default(true),
  url: z.string().url()
});

export const updateWebhookSchema = z.object({
  events: z.array(z.string().min(1)).min(1).optional(),
  isEnabled: z.boolean().optional(),
  url: z.string().url().optional()
});
