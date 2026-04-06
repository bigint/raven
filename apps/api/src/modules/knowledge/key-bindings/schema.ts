import { z } from "zod";

export const updateKeyBindingsSchema = z.array(
  z.object({
    collectionName: z.string().min(1),
    ragEnabled: z.boolean().default(true)
  })
);
