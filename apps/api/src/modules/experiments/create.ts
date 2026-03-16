import type { Database } from "@raven/db";
import { experiments, experimentVariants } from "@raven/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { createExperimentSchema } from "./schema";

type Body = z.infer<typeof createExperimentSchema>;

export const createExperiment =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const { name, description, variants } = c.req.valid("json");

    const [record] = await db
      .insert(experiments)
      .values({
        createdBy: user.id,
        description: description ?? "",
        name,
        organizationId: orgId
      })
      .returning();

    const safe = record as NonNullable<typeof record>;

    if (variants.length > 0) {
      await db.insert(experimentVariants).values(
        variants.map((v) => ({
          experimentId: safe.id,
          model: v.model,
          name: v.name,
          provider: v.provider ?? null,
          weight: v.weight
        }))
      );
    }

    const createdVariants = await db
      .select()
      .from(experimentVariants)
      .where(eq(experimentVariants.experimentId, safe.id));

    void publishEvent(orgId, "experiment.created", {
      ...safe,
      variants: createdVariants
    });
    void logAudit(db, {
      action: "experiment.created",
      actorId: user.id,
      metadata: { name },
      orgId,
      resourceId: safe.id,
      resourceType: "experiment"
    });
    return created(c, { ...safe, variants: createdVariants });
  };
