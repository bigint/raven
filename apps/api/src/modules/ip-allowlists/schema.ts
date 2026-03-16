import { z } from "zod";

export const createIpRuleSchema = z.object({
  cidr: z.string().min(1),
  description: z.string().max(500).optional(),
  isEnabled: z.boolean().default(true)
});

export const updateIpRuleSchema = z.object({
  cidr: z.string().min(1).optional(),
  description: z.string().max(500).optional(),
  isEnabled: z.boolean().optional()
});
