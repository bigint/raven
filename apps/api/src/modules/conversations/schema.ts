import { z } from "zod";

export const createConversationSchema = z.object({
  externalId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  title: z.string().max(500).optional()
});

export const addMessageSchema = z.object({
  content: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
  role: z.enum(["user", "assistant", "system", "tool"]),
  tokenCount: z.number().int().nonnegative().optional()
});

export const compactSchema = z.object({
  keepRecentMessages: z.number().int().positive().optional(),
  keepSystemPrompt: z.boolean().optional(),
  maxTokens: z.number().int().positive().optional(),
  strategy: z.enum(["middle_out", "sliding_window", "summarize_old"]).optional()
});
