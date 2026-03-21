import type { Database } from "@raven/db";
import { requestLogs } from "@raven/db";
import { eq } from "drizzle-orm";
import type { AuthContext } from "@/lib/types";

export const toggleStar = (db: Database) => async (c: AuthContext) => {
  const id = c.req.param("id") ?? "";

  const [row] = await db
    .select({ isStarred: requestLogs.isStarred })
    .from(requestLogs)
    .where(eq(requestLogs.id, id))
    .limit(1);

  if (!row) {
    return c.json({ error: { message: "Request not found" } }, 404);
  }

  const newValue = !row.isStarred;

  await db
    .update(requestLogs)
    .set({ isStarred: newValue })
    .where(eq(requestLogs.id, id));

  return c.json({ data: { isStarred: newValue } });
};
