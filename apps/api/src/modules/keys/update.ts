import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import { logAudit } from "@/modules/audit-logs/index";
import { safeKey } from "./helpers";
import { updateKeySchema } from "./schema";

export const updateKey = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const user = c.get("user" as never) as { id: string };
  const id = c.req.param("id") as string;
  const body = await c.req.json();
  const result = updateKeySchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Invalid request body", {
      errors: result.error.flatten().fieldErrors
    });
  }

  const [existing] = await db
    .select({ id: virtualKeys.id })
    .from(virtualKeys)
    .where(and(eq(virtualKeys.id, id), eq(virtualKeys.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Virtual key not found");
  }

  const { name, rateLimitRpm, rateLimitRpd, isActive } = result.data;

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

  const [updated] = await db
    .update(virtualKeys)
    .set(updates)
    .where(and(eq(virtualKeys.id, id), eq(virtualKeys.organizationId, orgId)))
    .returning();

  const safeKeyData = safeKey(updated as NonNullable<typeof updated>);
  void publishEvent(orgId, "key.updated", safeKeyData);
  void logAudit(db, {
    action: "key.updated",
    actorId: user.id,
    metadata: { isActive, name, rateLimitRpd, rateLimitRpm },
    orgId,
    resourceId: id,
    resourceType: "key"
  });
  return success(c, safeKeyData);
};
