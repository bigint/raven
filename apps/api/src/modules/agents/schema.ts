import { z } from "zod";

export const createAgentSchema = z.object({
  budgetMax: z.string().optional(),
  budgetPeriod: z.enum(["daily", "weekly", "monthly"]).default("monthly"),
  canDelegate: z.boolean().default(false),
  capabilities: z.record(z.string(), z.unknown()).optional(),
  description: z.string().max(1000).optional(),
  maxDelegationDepth: z.number().int().min(0).max(10).default(3),
  metadata: z.record(z.string(), z.unknown()).optional(),
  name: z.string().min(1).max(255),
  parentAgentId: z.string().optional(),
  type: z.enum(["autonomous", "supervised", "delegated"]).default("autonomous"),
  virtualKeyId: z.string().optional()
});

export const updateAgentSchema = z.object({
  budgetMax: z.string().nullable().optional(),
  budgetPeriod: z.enum(["daily", "weekly", "monthly"]).optional(),
  canDelegate: z.boolean().optional(),
  capabilities: z.record(z.string(), z.unknown()).optional(),
  description: z.string().max(1000).optional(),
  maxDelegationDepth: z.number().int().min(0).max(10).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  name: z.string().min(1).max(255).optional(),
  status: z.enum(["active", "suspended", "revoked"]).optional(),
  virtualKeyId: z.string().nullable().optional()
});
