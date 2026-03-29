import { z } from "zod";

export const updateKeyBindingsSchema = z.array(
  z.object({
    collectionId: z.string().min(1),
    ragEnabled: z.boolean().default(true)
  })
);
