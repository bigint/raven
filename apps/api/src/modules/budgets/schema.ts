import { z } from "zod";

export const createBudgetSchema = z.object({
  alertThreshold: z.number().min(0).max(1).default(0.8),
  entityId: z.string().min(1),
  entityType: z.enum(["global", "key"]),
  limitAmount: z.number().positive(),
  period: z.enum(["daily", "monthly"]).default("monthly")
});

export const updateBudgetSchema = z.object({
  alertThreshold: z.number().min(0).max(1).optional(),
  limitAmount: z.number().positive().optional(),
  period: z.enum(["daily", "monthly"]).optional()
});
