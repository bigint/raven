import { z } from "zod";

export const createPluginSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
  description: z.string().max(500).optional(),
  hook: z.enum(["pre_request", "post_response"]),
  isEnabled: z.boolean().default(true),
  name: z.string().min(1).max(200),
  pluginType: z.string().min(1),
  priority: z.number().int().min(0).default(0)
});

export const updatePluginSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
  description: z.string().max(500).optional(),
  hook: z.enum(["pre_request", "post_response"]).optional(),
  isEnabled: z.boolean().optional(),
  name: z.string().min(1).max(200).optional(),
  pluginType: z.string().min(1).optional(),
  priority: z.number().int().min(0).optional()
});
