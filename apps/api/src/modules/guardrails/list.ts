import type { Database } from "@raven/db";
import { guardrailRules } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { success } from "@/lib/response";

export const listGuardrails = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;

  const rows = await db
    .select()
    .from(guardrailRules)
    .where(eq(guardrailRules.organizationId, orgId));

  return success(c, rows);
};
