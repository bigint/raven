import { z } from "zod";

export const createMcpServerSchema = z.object({
  accessControl: z
    .object({
      allowedKeys: z.array(z.string()).optional(),
      allowedTeams: z.array(z.string()).optional()
    })
    .optional(),
  capabilities: z.array(z.string()).optional(),
  description: z.string().max(1000).optional(),
  healthCheckInterval: z.number().int().min(10).max(3600).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  name: z.string().min(1).max(255),
  transport: z.enum(["stdio", "sse", "streamable-http"]).default("stdio"),
  url: z.string().min(1)
});

export const updateMcpServerSchema = z.object({
  accessControl: z
    .object({
      allowedKeys: z.array(z.string()).optional(),
      allowedTeams: z.array(z.string()).optional()
    })
    .optional(),
  capabilities: z.array(z.string()).optional(),
  description: z.string().max(1000).optional(),
  healthCheckInterval: z.number().int().min(10).max(3600).optional(),
  isEnabled: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  name: z.string().min(1).max(255).optional(),
  transport: z.enum(["stdio", "sse", "streamable-http"]).optional(),
  url: z.string().min(1).optional()
});
