import type { Database } from "@raven/db";
import { users } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import type { z } from "zod";
import { UnauthorizedError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { updateProfileSchema } from "./schema";

export const updateProfile = (db: Database) => async (c: Context) => {
  const user = c.get("user" as never) as
    | { id: string; email: string }
    | undefined;
  if (!user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const data = c.req.valid("json" as never) as z.infer<
    typeof updateProfileSchema
  >;

  const [updated] = await db
    .update(users)
    .set({ name: data.name, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  return success(c, updated);
};
