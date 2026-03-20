import type { Database } from "@raven/db";
import { routingRules } from "@raven/db";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const listRoutingRules = (db: Database) => async (c: AuthContext) => {
  const rows = await db.select().from(routingRules);

  return success(c, rows);
};
