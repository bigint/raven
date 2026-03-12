import { z } from "zod";

export const createGuardrailSchema = z.object({
  action: z.enum(["block", "warn", "log"]).default("log"),
  config: z.record(z.string(), z.unknown()),
  isEnabled: z.boolean().default(true),
  name: z.string().min(1),
  priority: z.number().int().min(0).default(0),
  type: z.enum([
    "block_topics",
    "pii_detection",
    "content_filter",
    "custom_regex"
  ])
});

export const updateGuardrailSchema = z.object({
  action: z.enum(["block", "warn", "log"]).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  isEnabled: z.boolean().optional(),
  name: z.string().min(1).optional(),
  priority: z.number().int().min(0).optional(),
  type: z
    .enum(["block_topics", "pii_detection", "content_filter", "custom_regex"])
    .optional()
});
