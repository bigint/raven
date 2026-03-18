import type { Database } from "@raven/db";
import { requestLogs } from "@raven/db";
import { and, eq, isNull } from "drizzle-orm";
import type { AppContext } from "@/lib/types";

export const toggleStar = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id") ?? "";

  const [row] = await db
    .select({ isStarred: requestLogs.isStarred })
    .from(requestLogs)
    .where(
      and(
        eq(requestLogs.id, id),
        eq(requestLogs.organizationId, orgId),
        isNull(requestLogs.deletedAt)
      )
    )
    .limit(1);

  if (!row) {
    return c.json({ error: { message: "Request not found" } }, 404);
  }

  const newValue = !row.isStarred;

  await db
    .update(requestLogs)
    .set({ isStarred: newValue })
    .where(
      and(
        eq(requestLogs.id, id),
        eq(requestLogs.organizationId, orgId)
      )
    );

  return c.json({ data: { isStarred: newValue } });
};
