import type { Database } from "@raven/db";
import { guardrailRules } from "@raven/db";
import { eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const listGuardrails = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const rows = await db
    .select()
    .from(guardrailRules)
    .where(eq(guardrailRules.organizationId, orgId));

  return success(c, rows);
};
