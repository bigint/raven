import { z } from "zod";

const variantSchema = z.object({
  id: z.string().min(1),
  model: z.string().min(1),
  name: z.string().min(1),
  provider: z.string().optional(),
  weight: z.number().min(0).max(100)
});

export const createExperimentSchema = z.object({
  description: z.string().default(""),
  name: z.string().min(1),
  sourceModel: z.string().min(1),
  variants: z.array(variantSchema).min(1)
});

export const updateExperimentSchema = z.object({
  description: z.string().optional(),
  name: z.string().min(1).optional(),
  sourceModel: z.string().min(1).optional(),
  status: z.enum(["draft", "running", "paused", "completed"]).optional(),
  variants: z.array(variantSchema).min(1).optional()
});
