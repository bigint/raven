import type { Database } from "@raven/db";
import { routingRules } from "@raven/db";
import type { Context } from "hono";
import { ValidationError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import { createRoutingRuleSchema } from "./schema";

export const createRoutingRule = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const body = await c.req.json();
  const result = createRoutingRuleSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Invalid request body", {
      errors: result.error.flatten().fieldErrors
    });
  }

  const [record] = await db
    .insert(routingRules)
    .values({
      ...result.data,
      organizationId: orgId
    })
    .returning();

  void publishEvent(orgId, "routing-rule.created", record);
  return created(c, record);
};
