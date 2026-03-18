import { z } from "zod";

export const createModelAliasSchema = z.object({
  alias: z.string().min(1).max(200),
  targetModel: z.string().min(1).max(200)
});
