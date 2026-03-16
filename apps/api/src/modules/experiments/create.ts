import type { Database } from "@raven/db";
import { experiments } from "@raven/db";
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
    const data = c.req.valid("json");

    const [record] = await db
      .insert(experiments)
      .values({
        ...data,
        organizationId: orgId
      })
      .returning();

    const safe = record as NonNullable<typeof record>;
    void publishEvent(orgId, "experiment.created", safe);
    void logAudit(db, {
      action: "experiment.created",
      actorId: user.id,
      metadata: { name: data.name, sourceModel: data.sourceModel },
      orgId,
      resourceId: safe.id,
      resourceType: "experiment"
    });
    return created(c, safe);
  };
