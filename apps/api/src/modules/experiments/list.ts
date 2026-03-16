import type { Database } from "@raven/db";
import { experiments } from "@raven/db";
import { eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const listExperiments = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const rows = await db
    .select()
    .from(experiments)
    .where(eq(experiments.organizationId, orgId));

  return success(c, rows);
};
