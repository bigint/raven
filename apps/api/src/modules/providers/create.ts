import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import type { Redis } from "ioredis";
import type { z } from "zod";
import { auditAndPublish } from "@/lib/audit";
import { cacheKeys } from "@/lib/cache-utils";
import { encrypt } from "@/lib/crypto";
import { created } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { maskApiKey } from "./helpers";
import type { createProviderSchema } from "./schema";

type Body = z.infer<typeof createProviderSchema>;

export const createProvider =
  (db: Database, env: Env, redis: Redis) =>
  async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const { provider, name, apiKey, isEnabled } = c.req.valid("json");

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

    const masked = maskApiKey(safe.apiKey);
    void auditAndPublish(db, user, "provider", "created", {
      data: { ...safe, apiKey: masked },
      metadata: { name: safe.name, provider: safe.provider },
      resourceId: safe.id
    });
    return created(c, { ...safe, apiKey: masked });
  };
