import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import { safeKey } from "./helpers";
import type { updateKeySchema } from "./schema";

type Body = z.infer<typeof updateKeySchema>;

export const updateKey =
  (db: Database) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const { name, rateLimitRpm, rateLimitRpd, isActive, expiresAt } =
      c.req.valid("json");

    const updates: Partial<typeof virtualKeys.$inferInsert> = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (rateLimitRpm !== undefined) {
      updates.rateLimitRpm = rateLimitRpm;
    }

    if (rateLimitRpd !== undefined) {
      updates.rateLimitRpd = rateLimitRpd;
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    if (expiresAt !== undefined) {
      updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    const [updated] = await db
      .update(virtualKeys)
      .set(updates)
      .where(eq(virtualKeys.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError("Virtual key not found");
    }

    const safeKeyData = safeKey(updated as NonNullable<typeof updated>);
    void publishEvent("key.updated", safeKeyData);
    void logAudit(db, {
      action: "key.updated",
      actorId: user.id,
      metadata: { expiresAt, isActive, name, rateLimitRpd, rateLimitRpm },
      resourceId: id,
      resourceType: "key"
    });
    return success(c, safeKeyData);
  };
