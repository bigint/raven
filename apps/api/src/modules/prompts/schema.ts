import { z } from "zod";

export const createPromptSchema = z.object({
  content: z.string().min(1),
  model: z.string().optional(),
  name: z.string().min(1).max(200)
});

export const createVersionSchema = z.object({
  content: z.string().min(1),
  model: z.string().optional()
});

export const updatePromptSchema = z.object({
  name: z.string().min(1).max(200).optional()
});
