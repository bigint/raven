import type { Database } from "@raven/db";
import { guardrailRules } from "@raven/db";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import { checkFeatureGate } from "@/modules/proxy/plan-gate";
import type { createGuardrailSchema } from "./schema";

type Body = z.infer<typeof createGuardrailSchema>;

export const createGuardrail =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");

    await checkFeatureGate(db, orgId, "hasGuardrails");

    const { name, type, config, action, isEnabled, priority } =
      c.req.valid("json");

    const [record] = await db
      .insert(guardrailRules)
      .values({
        action,
        config,
        isEnabled,
        name,
        organizationId: orgId,
        priority,
        type
      })
      .returning();

    const safe = record as NonNullable<typeof record>;
    void publishEvent(orgId, "guardrail.created", safe);
    void logAudit(db, {
      action: "guardrail.created",
      actorId: user.id,
      metadata: { action, name, type },
      orgId,
      resourceId: safe.id,
      resourceType: "guardrail"
    });
    return created(c, safe);
  };
