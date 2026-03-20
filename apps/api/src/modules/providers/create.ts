import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { count, eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import type { z } from "zod";
import { cacheKeys } from "@/lib/cache-utils";
import { encrypt } from "@/lib/crypto";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import { checkResourceLimit } from "@/modules/proxy/plan-gate";
import { maskApiKey, validateApiKey } from "./helpers";
import type { createProviderSchema } from "./schema";

type Body = z.infer<typeof createProviderSchema>;

export const createProvider =
  (db: Database, env: Env, redis: Redis) =>
  async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const { provider, name, apiKey, isEnabled } = c.req.valid("json");

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

    // Invalidate provider configs cache for this org + provider
    void redis.del(cacheKeys.providerConfigs(orgId, provider));

    const masked = maskApiKey(safe.apiKey);
    void publishEvent(orgId, "provider.created", { ...safe, apiKey: masked });
    void logAudit(db, {
      action: "provider.created",
      actorId: user.id,
      metadata: { name: safe.name, provider: safe.provider },
      orgId,
      resourceId: safe.id,
      resourceType: "provider"
    });
    return created(c, { ...safe, apiKey: masked });
  };
