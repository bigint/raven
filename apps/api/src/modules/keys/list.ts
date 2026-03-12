import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { success } from "@/lib/response";
import { safeKey } from "./helpers";

export const listKeys = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;

  const keys = await db
    .select()
    .from(virtualKeys)
    .where(eq(virtualKeys.organizationId, orgId));

  return success(c, keys.map(safeKey));
};
