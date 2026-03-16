import type { Database } from "@raven/db";
import { experiments } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

export const deleteExperiment = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const user = c.get("user");
  const id = c.req.param("id") as string;

  const [existing] = await db
    .select({ id: experiments.id })
    .from(experiments)
    .where(and(eq(experiments.id, id), eq(experiments.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Experiment not found");
  }

  await db
    .delete(experiments)
    .where(and(eq(experiments.id, id), eq(experiments.organizationId, orgId)));

  void publishEvent(orgId, "experiment.deleted", { id });
  void logAudit(db, {
    action: "experiment.deleted",
    actorId: user.id,
    orgId,
    resourceId: id,
    resourceType: "experiment"
  });
  return success(c, { success: true });
};
