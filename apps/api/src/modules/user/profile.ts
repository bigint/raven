import type { Database } from "@raven/db";
import { users } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";

export const updateProfile = (db: Database) => async (c: Context) => {
  const user = c.get("user" as never) as
    | { id: string; email: string }
    | undefined;
  if (!user) {
    return c.json({ code: "UNAUTHORIZED", message: "Not authenticated" }, 401);
  }

  const body = await c.req.json<{ name: string }>();
  const name = body.name?.trim();
  if (!name) {
    return c.json(
      { code: "VALIDATION_ERROR", message: "Name is required" },
      400
    );
  }

  const [updated] = await db
    .update(users)
    .set({ name, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  return c.json(updated);
};
