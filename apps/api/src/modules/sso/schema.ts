import { z } from "zod";

export const createSSOConnectionSchema = z.object({
  allowedDomains: z.array(z.string()).optional(),
  defaultRole: z.string().optional(),
  enforced: z.boolean().optional(),
  jitProvisioning: z.boolean().optional(),
  provider: z.object({
    config: z.record(z.string(), z.unknown()),
    name: z.string().min(1),
    type: z.enum(["saml", "oidc"])
  })
});
