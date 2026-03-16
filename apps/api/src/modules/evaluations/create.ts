import type { Database } from "@raven/db";
import { evaluations } from "@raven/db";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { createEvaluationSchema } from "./schema";

type Body = z.infer<typeof createEvaluationSchema>;

export const createEvaluation =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const { name, model, metadata } = c.req.valid("json");

    const [record] = await db
      .insert(evaluations)
      .values({
        config: metadata ?? {},
        createdBy: user.id,
        evaluatorType: "default",
        model,
        name,
        organizationId: orgId
      })
      .returning();

    const safe = record as NonNullable<typeof record>;
    void publishEvent(orgId, "evaluation.created", safe);
    void logAudit(db, {
      action: "evaluation.created",
      actorId: user.id,
      metadata: { model, name },
      orgId,
      resourceId: safe.id,
      resourceType: "evaluation"
    });
    return created(c, safe);
  };
