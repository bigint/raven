import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import { eq } from "drizzle-orm";
import { auditAndPublish } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

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

  void auditAndPublish(db, user, "key", "deleted", { resourceId: id });
  return success(c, { success: true });
};
