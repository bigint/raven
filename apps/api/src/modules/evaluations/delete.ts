import type { Database } from "@raven/db";
import { evaluations } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const deleteEvaluation = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id") as string;

  const [existing] = await db
    .select({ id: evaluations.id })
    .from(evaluations)
    .where(and(eq(evaluations.id, id), eq(evaluations.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Evaluation not found");
  }

  await db
    .delete(evaluations)
    .where(and(eq(evaluations.id, id), eq(evaluations.organizationId, orgId)));

  return success(c, { deleted: true });
};
