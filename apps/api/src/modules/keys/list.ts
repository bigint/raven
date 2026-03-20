import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";
import { safeKey } from "./helpers";

export const listKeys = (db: Database) => async (c: AuthContext) => {
  const keys = await db
    .select()
    .from(virtualKeys)
    .limit(200);

  return success(c, keys.map(safeKey));
};
