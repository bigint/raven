import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import type { Redis } from "ioredis";
import type { z } from "zod";
import { cacheKeys } from "@/lib/cache-utils";
import { encrypt } from "@/lib/crypto";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import { syncModelsForProvider } from "@/modules/cron/sync-models";
import { maskApiKey, validateApiKey } from "./helpers";
import type { createProviderSchema } from "./schema";

type Body = z.infer<typeof createProviderSchema>;

export const createProvider =
  (db: Database, env: Env, redis: Redis) =>
  async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const { provider, name, apiKey, isEnabled } = c.req.valid("json");

    // Validate the API key against the provider before saving
    await validateApiKey(provider, apiKey);

    const encryptedKey = encrypt(apiKey, env.ENCRYPTION_SECRET);

    const [record] = await db
      .insert(providerConfigs)
      .values({
        apiKey: encryptedKey,
        isEnabled,
        name: name ?? null,
        provider
      })
      .returning();

    const safe = record as NonNullable<typeof record>;

    // Invalidate provider configs cache for this provider
    void redis.del(cacheKeys.providerConfigs(provider));

    // Sync models for this provider in the background
    void syncModelsForProvider(db, safe.provider, apiKey);

    const masked = maskApiKey(safe.apiKey);
    void publishEvent("provider.created", { ...safe, apiKey: masked });
    void logAudit(db, {
      action: "provider.created",
      actorId: user.id,
      metadata: { name: safe.name, provider: safe.provider },
      resourceId: safe.id,
      resourceType: "provider"
    });
    return created(c, { ...safe, apiKey: masked });
  };
