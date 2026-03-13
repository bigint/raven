import { z } from "zod";

export const addDomainSchema = z.object({
  domain: z
    .string()
    .min(1)
    .max(253)
    .regex(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i, "Invalid domain format")
    .transform((d) => d.toLowerCase())
});
