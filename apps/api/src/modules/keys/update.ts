import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { auditAndPublish } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { filterUndefined } from "@/lib/utils";
import { safeKey } from "./helpers";
import type { updateKeySchema } from "./schema";

type Body = z.infer<typeof updateKeySchema>;

export const updateKey =
  (db: Database) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const { name, rateLimitRpm, rateLimitRpd, isActive, expiresAt } =
      c.req.valid("json");

    const [updated] = await db
      .update(virtualKeys)
      .set({
        ...filterUndefined({ isActive, name, rateLimitRpd, rateLimitRpm }),
        ...(expiresAt !== undefined && {
          expiresAt: expiresAt ? new Date(expiresAt) : null
        })
      })
      .where(eq(virtualKeys.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError("Virtual key not found");
    }

    const safeKeyData = safeKey(updated as NonNullable<typeof updated>);
    void auditAndPublish(db, user, "key", "updated", {
      data: safeKeyData,
      metadata: { expiresAt, isActive, name, rateLimitRpd, rateLimitRpm },
      resourceId: id
    });
    return success(c, safeKeyData);
  };
