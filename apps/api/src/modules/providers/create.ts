import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { count, eq } from "drizzle-orm";
import type { Context } from "hono";
import { encrypt } from "@/lib/crypto";
import { ValidationError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import { checkResourceLimit } from "@/modules/proxy/plan-gate";
import { maskApiKey, validateApiKey } from "./helpers";
import { createProviderSchema } from "./schema";

export const createProvider =
  (db: Database, env: Env) => async (c: Context) => {
    const orgId = c.get("orgId" as never) as string;
    const body = await c.req.json();
    const result = createProviderSchema.safeParse(body);

    if (!result.success) {
      throw new ValidationError("Invalid request body", {
        errors: result.error.flatten().fieldErrors
      });
    }

    const { provider, name, apiKey, isEnabled } = result.data;

    const [existing] = await db
      .select({ value: count() })
      .from(providerConfigs)
      .where(eq(providerConfigs.organizationId, orgId));
    await checkResourceLimit(db, orgId, "maxProviders", existing?.value ?? 0);

    // Validate the API key against the provider before saving
    await validateApiKey(provider, apiKey);

    const encryptedKey = encrypt(apiKey, env.ENCRYPTION_SECRET);

    const [record] = await db
      .insert(providerConfigs)
      .values({
        apiKey: encryptedKey,
        isEnabled,
        name: name ?? null,
        organizationId: orgId,
        provider
      })
      .returning();

    const safe = record as NonNullable<typeof record>;
    const masked = maskApiKey(safe.apiKey);
    void publishEvent(orgId, "provider.created", { ...safe, apiKey: masked });
    return created(c, { ...safe, apiKey: masked });
  };
