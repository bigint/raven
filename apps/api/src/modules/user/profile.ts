import type { Database } from "@raven/db";
import { users } from "@raven/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { UnauthorizedError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import type { updateProfileSchema } from "./schema";

type Body = z.infer<typeof updateProfileSchema>;

export const updateProfile =
  (db: Database) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    if (!user) {
      throw new UnauthorizedError("Not authenticated");
    }

    const data = c.req.valid("json");

    const [updated] = await db
      .update(users)
      .set({ name: data.name, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();

    return success(c, updated);
  };
