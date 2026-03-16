import type { Database } from "@raven/db";
import { policies, policyRules } from "@raven/db";
import { eq, inArray } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const listPolicies = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const rows = await db
    .select()
    .from(policies)
    .where(eq(policies.organizationId, orgId));

  const policyIds = rows.map((r) => r.id);

  let rulesMap: Record<string, (typeof policyRules.$inferSelect)[]> = {};

  if (policyIds.length > 0) {
    const allRules = await db
      .select()
      .from(policyRules)
      .where(inArray(policyRules.policyId, policyIds));

    rulesMap = allRules.reduce(
      (acc: Record<string, (typeof policyRules.$inferSelect)[]>, rule) => {
        if (!acc[rule.policyId]) {
          acc[rule.policyId] = [];
        }
        (acc[rule.policyId] as (typeof policyRules.$inferSelect)[]).push(rule);
        return acc;
      },
      {}
    );
  }

  const result = rows.map((policy) => ({
    ...policy,
    rules: rulesMap[policy.id] ?? []
  }));

  return success(c, result);
};
