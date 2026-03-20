import type { Database } from "@raven/db";
import { routingRules } from "@raven/db";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { createRoutingRuleSchema } from "./schema";

type Body = z.infer<typeof createRoutingRuleSchema>;

export const createRoutingRule =
  (db: Database) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const data = c.req.valid("json");

    const [record] = await db
      .insert(routingRules)
      .values(data)
      .returning();

    const safe = record as NonNullable<typeof record>;
    void publishEvent("routing-rule.created", safe);
    void logAudit(db, {
      action: "routing-rule.created",
      actorId: user.id,
      metadata: { ...data },
      resourceId: safe.id,
      resourceType: "routing-rule"
    });
    return created(c, safe);
  };
