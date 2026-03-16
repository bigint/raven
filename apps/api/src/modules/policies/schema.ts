import { z } from "zod";

const conditionSchema = z.object({
  operator: z.enum(["AND", "OR"]).optional(),
  params: z.record(z.string(), z.unknown()),
  type: z.enum([
    "regex",
    "pii",
    "keyword",
    "model_allowlist",
    "model_denylist",
    "provider_region",
    "cost_threshold",
    "token_threshold",
    "composite"
  ])
});

const ruleSchema = z.object({
  complianceControl: z.string().optional(),
  complianceFramework: z.string().optional(),
  conditions: conditionSchema,
  enforcement: z.enum(["block", "warn", "log"]).default("log"),
  isEnabled: z.boolean().default(true),
  name: z.string().min(1),
  priority: z.number().int().min(0).default(0)
});

export const createPolicySchema = z.object({
  description: z.string().optional(),
  isEnabled: z.boolean().default(true),
  name: z.string().min(1),
  rules: z.array(ruleSchema).min(1),
  scope: z
    .enum(["platform", "organization", "team", "key"])
    .default("organization"),
  scopeTargetId: z.string().optional()
});

export const updatePolicySchema = z.object({
  description: z.string().optional(),
  isEnabled: z.boolean().optional(),
  name: z.string().min(1).optional(),
  rules: z.array(ruleSchema).optional(),
  scope: z.enum(["platform", "organization", "team", "key"]).optional(),
  scopeTargetId: z.string().optional()
});

export const testPolicySchema = z.object({
  estimatedCost: z.number().optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  requestBody: z.record(z.string(), z.unknown())
});
