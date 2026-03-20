import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

export const deleteKey = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const user = c.get("user");
  const id = c.req.param("id") as string;

  const [deleted] = await db
    .delete(virtualKeys)
    .where(and(eq(virtualKeys.id, id), eq(virtualKeys.organizationId, orgId)))
    .returning({ id: virtualKeys.id });

  if (!deleted) {
    throw new NotFoundError("Virtual key not found");
  }

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
