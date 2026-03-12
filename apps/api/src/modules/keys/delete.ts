import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import { logAudit } from "@/modules/audit-logs/index";

export const deleteKey = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const user = c.get("user" as never) as { id: string };
  const id = c.req.param("id") as string;

  const [existing] = await db
    .select({ id: virtualKeys.id })
    .from(virtualKeys)
    .where(and(eq(virtualKeys.id, id), eq(virtualKeys.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Virtual key not found");
  }

  await db
    .delete(virtualKeys)
    .where(and(eq(virtualKeys.id, id), eq(virtualKeys.organizationId, orgId)));

  void publishEvent(orgId, "key.deleted", { id });
  void logAudit(db, {
    action: "key.deleted",
    actorId: user.id,
    orgId,
    resourceId: id,
    resourceType: "key"
  });
  return success(c, { success: true });
};
