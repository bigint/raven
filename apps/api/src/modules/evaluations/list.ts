import type { Database } from "@raven/db";
import { evaluations } from "@raven/db";
import { desc, eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const listEvaluations = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const rows = await db
    .select()
    .from(evaluations)
    .where(eq(evaluations.organizationId, orgId))
    .orderBy(desc(evaluations.createdAt));

  return success(c, rows);
};
