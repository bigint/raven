import type { Database } from "@raven/db";
import { routingRules } from "@raven/db";
import type { z } from "zod";
import { auditAndPublish } from "@/lib/audit";
import { created } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import type { createRoutingRuleSchema } from "./schema";

type Body = z.infer<typeof createRoutingRuleSchema>;

export const createRoutingRule =
  (db: Database) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const data = c.req.valid("json");

    const [record] = await db.insert(routingRules).values(data).returning();

    const safe = record as NonNullable<typeof record>;
    void auditAndPublish(db, user, "routing-rule", "created", {
      data: safe,
      metadata: { ...data },
      resourceId: safe.id
    });
    return created(c, safe);
  };
