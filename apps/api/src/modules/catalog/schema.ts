import { z } from "zod";

export const createCatalogItemSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
  description: z.string().max(2000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  name: z.string().min(1).max(255),
  tags: z.array(z.string()).optional(),
  type: z.enum([
    "model",
    "agent",
    "mcp_server",
    "prompt_template",
    "guardrail_policy"
  ]),
  version: z.string().max(50).optional()
});

export const updateCatalogItemSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
  description: z.string().max(2000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  name: z.string().min(1).max(255).optional(),
  rejectionReason: z.string().max(1000).optional(),
  status: z.enum(["pending", "approved", "rejected", "deprecated"]).optional(),
  tags: z.array(z.string()).optional(),
  version: z.string().max(50).optional()
});

export const listCatalogQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected", "deprecated"]).optional(),
  tags: z.string().optional(),
  type: z
    .enum([
      "model",
      "agent",
      "mcp_server",
      "prompt_template",
      "guardrail_policy"
    ])
    .optional()
});
