import type { Database } from "@raven/db";
import { experiments, experimentVariants } from "@raven/db";
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
    const { name, description, status, variants } = c.req.valid("json");

    const [existing] = await db
      .select({ id: experiments.id })
      .from(experiments)
      .where(and(eq(experiments.id, id), eq(experiments.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Experiment not found");
    }

    const updates: Partial<typeof experiments.$inferInsert> = {
      updatedAt: new Date()
    };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;

    const [updated] = await db
      .update(experiments)
      .set(updates)
      .where(and(eq(experiments.id, id), eq(experiments.organizationId, orgId)))
      .returning();

    // Replace variants if provided
    if (variants !== undefined) {
      await db
        .delete(experimentVariants)
        .where(eq(experimentVariants.experimentId, id));

      if (variants.length > 0) {
        await db.insert(experimentVariants).values(
          variants.map((v) => ({
            experimentId: id,
            model: v.model,
            name: v.name,
            provider: v.provider ?? null,
            weight: v.weight
          }))
        );
      }
    }

    const record = updated as NonNullable<typeof updated>;
    void publishEvent(orgId, "experiment.updated", record);
    void logAudit(db, {
      action: "experiment.updated",
      actorId: user.id,
      metadata: { name, status },
      orgId,
      resourceId: record.id,
      resourceType: "experiment"
    });
    return success(c, record);
  };
