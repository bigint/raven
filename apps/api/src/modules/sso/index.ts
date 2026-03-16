import type { Database } from "@raven/db";
import { Hono } from "hono";
import { created, success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { jsonValidator } from "@/lib/validation";
import { OIDC_PRESETS } from "./providers";
import { createSSOConnectionSchema } from "./schema";

export const createSSOModule = (_db: Database) => {
  const app = new Hono();

  // Get SSO configuration for org
  app.get("/", (c: AppContext) => {
    const orgId = c.get("orgId");
    return success(c, {
      availablePresets: Object.keys(OIDC_PRESETS),
      configured: false,
      enforced: false,
      organizationId: orgId,
      provider: null
    });
  });

  // Get available OIDC presets
  app.get("/presets", (c: AppContext) => {
    return success(c, OIDC_PRESETS);
  });

  // Configure SSO for organization
  app.post("/", jsonValidator(createSSOConnectionSchema), (c: AppContext) => {
    const orgId = c.get("orgId");
    const data = c.req.valid("json" as never) as {
      provider: { name: string; type: "saml" | "oidc"; config: unknown };
      enforced?: boolean;
      jitProvisioning?: boolean;
      defaultRole?: string;
      allowedDomains?: string[];
    };

    return created(c, {
      allowedDomains: data.allowedDomains ?? [],
      configured: true,
      defaultRole: data.defaultRole ?? "member",
      enforced: data.enforced ?? false,
      jitProvisioning: data.jitProvisioning ?? true,
      organizationId: orgId,
      provider: {
        enabled: true,
        name: data.provider.name,
        type: data.provider.type
      }
    });
  });

  // SAML callback endpoint
  app.post("/saml/callback", async (c) => {
    // Handle SAML assertion response
    // Parse SAML response, validate signature, extract attributes
    // Create/update user session
    return c.json({ message: "SAML callback handler" });
  });

  // OIDC callback endpoint
  app.get("/oidc/callback", async (c) => {
    // Handle OIDC authorization code flow
    const code = c.req.query("code");
    const state = c.req.query("state");
    if (!code || !state) {
      return c.json(
        {
          error: {
            code: "INVALID_CALLBACK",
            message: "Missing code or state"
          }
        },
        400
      );
    }
    // Exchange code for tokens, validate, create session
    return c.json({ message: "OIDC callback handler" });
  });

  // Initiate SSO login
  app.get("/login", (c: AppContext) => {
    return success(c, {
      loginUrl: null,
      message: "SSO not yet configured for this organization"
    });
  });

  // Delete SSO configuration
  app.delete("/", (c: AppContext) => {
    return success(c, { deleted: true });
  });

  return app;
};
