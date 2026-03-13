import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import { eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { safeKey } from "./helpers";

export const listKeys = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const keys = await db
    .select()
    .from(virtualKeys)
    .where(eq(virtualKeys.organizationId, orgId));

  return success(c, keys.map(safeKey));
};
