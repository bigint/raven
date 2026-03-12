import { z } from "zod";

export const createRoutingRuleSchema = z.object({
  condition: z.enum([
    "token_count_below",
    "token_count_above",
    "message_count_below",
    "keyword_match"
  ]),
  conditionValue: z.string().min(1),
  isEnabled: z.boolean().default(true),
  name: z.string().min(1),
  priority: z.number().int().default(0),
  sourceModel: z.string().min(1),
  targetModel: z.string().min(1)
});

export const updateRoutingRuleSchema = z.object({
  condition: z
    .enum([
      "token_count_below",
      "token_count_above",
      "message_count_below",
      "keyword_match"
    ])
    .optional(),
  conditionValue: z.string().min(1).optional(),
  isEnabled: z.boolean().optional(),
  name: z.string().min(1).optional(),
  priority: z.number().int().optional(),
  sourceModel: z.string().min(1).optional(),
  targetModel: z.string().min(1).optional()
});
