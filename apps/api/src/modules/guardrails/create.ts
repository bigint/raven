import type { Database } from "@raven/db";
import { guardrailRules } from "@raven/db";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { createGuardrailSchema } from "./schema";

type Body = z.infer<typeof createGuardrailSchema>;

export const createGuardrail =
  (db: Database) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");

    const { name, type, config, action, isEnabled, priority } =
      c.req.valid("json");

    const [record] = await db
      .insert(guardrailRules)
      .values({
        action,
        config,
        isEnabled,
        name,
        priority,
        type
      })
      .returning();

    const safe = record as NonNullable<typeof record>;
    void publishEvent("guardrail.created", safe);
    void logAudit(db, {
      action: "guardrail.created",
      actorId: user.id,
      metadata: { action, name, type },
      resourceId: safe.id,
      resourceType: "guardrail"
    });
    return created(c, safe);
  };
