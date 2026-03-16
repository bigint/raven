import { z } from "zod";

export const createEvaluationSchema = z.object({
  metadata: z.record(z.string(), z.unknown()).optional(),
  model: z.string().min(1),
  name: z.string().min(1).max(200)
});

export const runEvaluationSchema = z.object({
  evaluators: z
    .array(z.enum(["relevance", "coherence", "piiLeakage", "toxicity"]))
    .optional(),
  prompts: z
    .array(
      z.object({
        expectedResponse: z.string().optional(),
        prompt: z.string().min(1),
        response: z.string().min(1)
      })
    )
    .min(1)
    .max(100)
});
