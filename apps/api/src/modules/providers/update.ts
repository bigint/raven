import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import type { z } from "zod";
import { encrypt } from "@/lib/crypto";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import { logAudit } from "@/modules/audit-logs/index";
import { maskApiKey, validateApiKey } from "./helpers";
import type { updateProviderSchema } from "./schema";

export const updateProvider =
  (db: Database, env: Env) => async (c: Context) => {
    const orgId = c.get("orgId" as never) as string;
    const user = c.get("user" as never) as { id: string };
    const id = c.req.param("id") as string;
    const { name, apiKey, isEnabled } = c.req.valid("json" as never) as z.infer<
      typeof updateProviderSchema
    >;

    const [existing] = await db
      .select()
      .from(providerConfigs)
      .where(
        and(
          eq(providerConfigs.id, id),
          eq(providerConfigs.organizationId, orgId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Provider not found");
    }

    const updates: Partial<typeof providerConfigs.$inferInsert> = {
      updatedAt: new Date()
    };

    if (name !== undefined) {
      updates.name = name || null;
    }

    if (apiKey !== undefined) {
      await validateApiKey(existing.provider, apiKey);
      updates.apiKey = encrypt(apiKey, env.ENCRYPTION_SECRET);
    }

    if (isEnabled !== undefined) {
      updates.isEnabled = isEnabled;
    }

    const [updated] = await db
      .update(providerConfigs)
      .set(updates)
      .where(
        and(
          eq(providerConfigs.id, id),
          eq(providerConfigs.organizationId, orgId)
        )
      )
      .returning();

    const record = updated as NonNullable<typeof updated>;
    const masked = maskApiKey(record.apiKey);
    void publishEvent(orgId, "provider.updated", {
      ...record,
      apiKey: masked
    });
    void logAudit(db, {
      action: "provider.updated",
      actorId: user.id,
      metadata: { apiKeyChanged: apiKey !== undefined, isEnabled, name },
      orgId,
      resourceId: record.id,
      resourceType: "provider"
    });
    return success(c, { ...record, apiKey: masked });
  };
