import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import type { z } from "zod";
import { cacheKeys } from "@/lib/cache-utils";
import { encrypt } from "@/lib/crypto";
import { NotFoundError, PreconditionFailedError } from "@/lib/errors";
import { checkIfMatch, generateETag } from "@/lib/etag";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import { maskApiKey } from "./helpers";
import type { updateProviderSchema } from "./schema";

type Body = z.infer<typeof updateProviderSchema>;

export const updateProvider =
  (db: Database, env: Env, redis: Redis) =>
  async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const { name, apiKey, isEnabled } = c.req.valid("json");

    const [existing] = await db
      .select()
      .from(providerConfigs)
      .where(eq(providerConfigs.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Provider not found");
    }

    const currentData = { ...existing, apiKey: maskApiKey(existing.apiKey) };
    const currentETag = generateETag(currentData);
    const ifMatch = c.req.header("If-Match");

    if (!checkIfMatch(ifMatch, currentETag)) {
      throw new PreconditionFailedError(
        "Resource has been modified by another request"
      );
    }

    const updates: Partial<typeof providerConfigs.$inferInsert> = {
      updatedAt: new Date()
    };

    if (name !== undefined) {
      updates.name = name || null;
    }

    if (apiKey !== undefined) {
      updates.apiKey = encrypt(apiKey, env.ENCRYPTION_SECRET);
    }

    if (isEnabled !== undefined) {
      updates.isEnabled = isEnabled;
    }

    const [updated] = await db
      .update(providerConfigs)
      .set(updates)
      .where(eq(providerConfigs.id, id))
      .returning();

    const record = updated as NonNullable<typeof updated>;

    // Invalidate provider configs cache
    void redis.del(cacheKeys.providerConfigs(record.provider));

    const masked = maskApiKey(record.apiKey);
    void publishEvent("provider.updated", {
      ...record,
      apiKey: masked
    });
    void logAudit(db, {
      action: "provider.updated",
      actorId: user.id,
      metadata: { apiKeyChanged: apiKey !== undefined, isEnabled, name },
      resourceId: record.id,
      resourceType: "provider"
    });
    return success(c, { ...record, apiKey: masked });
  };
