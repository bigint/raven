import { createHash } from "node:crypto";
import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import type { z } from "zod";
import { auditAndPublish } from "@/lib/audit";
import { cacheKeys } from "@/lib/cache-utils";
import { encrypt } from "@/lib/crypto";
import { NotFoundError, PreconditionFailedError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
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
    const currentETag = `"${createHash("sha256").update(JSON.stringify(currentData)).digest("hex").slice(0, 16)}"`;
    const ifMatch = c.req.header("If-Match");

    if (ifMatch && ifMatch !== currentETag) {
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

    void redis.del(cacheKeys.providerConfigs(record.provider));

    const masked = maskApiKey(record.apiKey);
    void auditAndPublish(db, user, "provider", "updated", {
      data: { ...record, apiKey: masked },
      metadata: { apiKeyChanged: apiKey !== undefined, isEnabled, name },
      resourceId: record.id
    });
    return success(c, { ...record, apiKey: masked });
  };
