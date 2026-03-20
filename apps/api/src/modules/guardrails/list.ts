import type { Database } from "@raven/db";
import { guardrailRules } from "@raven/db";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const listGuardrails = (db: Database) => async (c: AuthContext) => {
  const rows = await db.select().from(guardrailRules);

  return success(c, rows);
};
