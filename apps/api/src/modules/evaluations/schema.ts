import { z } from "zod";

export const createEvaluationSchema = z.object({
  metadata: z.record(z.string(), z.unknown()).optional(),
  model: z.string().min(1),
  name: z.string().min(1).max(200)
});

const sampleSchema = z.object({
  expectedOutput: z.string().optional(),
  prompt: z.string().min(1),
  response: z.string().min(1)
});

export const runEvaluationSchema = z.object({
  evaluators: z
    .array(z.enum(["relevance", "coherence", "piiLeakage", "toxicity"]))
    .optional(),
  prompts: z.array(sampleSchema).min(1).max(100).optional(),
  samples: z.array(sampleSchema).min(1).max(100).optional()
}).refine((data) => data.prompts || data.samples, {
  message: "Either 'prompts' or 'samples' must be provided"
});
