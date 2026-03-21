import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import { eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

export const deleteKey = (db: Database) => async (c: AuthContext) => {
  const user = c.get("user");
  const id = c.req.param("id") as string;

  const [deleted] = await db
    .delete(virtualKeys)
    .where(eq(virtualKeys.id, id))
    .returning({ id: virtualKeys.id });

  if (!deleted) {
    throw new NotFoundError("Virtual key not found");
  }

  void publishEvent("key.deleted", { id });
  void logAudit(db, {
    action: "key.deleted",
    actorId: user.id,
    resourceId: id,
    resourceType: "key"
  });
  return success(c, { success: true });
};
