import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100)
});

export const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(3).max(50).optional()
});
