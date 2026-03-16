import type { Database } from "@raven/db";
import { experiments } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { updateExperimentSchema } from "./schema";

type Body = z.infer<typeof updateExperimentSchema>;

export const updateExperiment =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const data = c.req.valid("json");

    const [existing] = await db
      .select({ id: experiments.id })
      .from(experiments)
      .where(and(eq(experiments.id, id), eq(experiments.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Experiment not found");
    }

    const [updated] = await db
      .update(experiments)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(experiments.id, id), eq(experiments.organizationId, orgId)))
      .returning();

    const record = updated as NonNullable<typeof updated>;
    void publishEvent(orgId, "experiment.updated", record);
    void logAudit(db, {
      action: "experiment.updated",
      actorId: user.id,
      metadata: { ...data },
      orgId,
      resourceId: record.id,
      resourceType: "experiment"
    });
    return success(c, record);
  };
