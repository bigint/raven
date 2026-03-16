import type { Database } from "@raven/db";
import { evaluationResults, evaluations } from "@raven/db";
import { and, asc, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const getEvaluation = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id") as string;

  const [evaluation] = await db
    .select()
    .from(evaluations)
    .where(and(eq(evaluations.id, id), eq(evaluations.organizationId, orgId)))
    .limit(1);

  if (!evaluation) {
    throw new NotFoundError("Evaluation not found");
  }

  const results = await db
    .select()
    .from(evaluationResults)
    .where(eq(evaluationResults.evaluationId, id))
    .orderBy(asc(evaluationResults.createdAt));

  return success(c, { ...evaluation, results });
};
