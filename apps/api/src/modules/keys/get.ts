import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { safeKey } from "./helpers";

export const getKey = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id") as string;

  const [key] = await db
    .select()
    .from(virtualKeys)
    .where(and(eq(virtualKeys.id, id), eq(virtualKeys.organizationId, orgId)))
    .limit(1);

  if (!key) {
    throw new NotFoundError("Virtual key not found");
  }

  return success(c, safeKey(key));
};
