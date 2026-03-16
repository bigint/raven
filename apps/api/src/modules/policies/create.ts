import type { Database } from "@raven/db";
import { policies, policyRules } from "@raven/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import { checkFeatureGate } from "@/modules/proxy/plan-gate";
import type { createPolicySchema } from "./schema";

type Body = z.infer<typeof createPolicySchema>;

export const createPolicy =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");

    await checkFeatureGate(db, orgId, "hasGuardrails");

    const { name, description, scope, scopeTargetId, isEnabled, rules } =
      c.req.valid("json");

    const [policy] = await db
      .insert(policies)
      .values({
        createdBy: user.id,
        description: description ?? null,
        isEnabled,
        name,
        organizationId: orgId,
        scope,
        scopeId: scopeTargetId ?? null
      })
      .returning();

    const safe = policy as NonNullable<typeof policy>;

    if (rules.length > 0) {
      await db.insert(policyRules).values(
        rules.map((rule) => {
          const complianceMap: Record<string, string> = {};
          if (rule.complianceFramework && rule.complianceControl) {
            complianceMap[rule.complianceFramework] = rule.complianceControl;
          }
          return {
            complianceMap,
            condition: rule.conditions as Record<string, unknown>,
            enforcement: rule.enforcement,
            isEnabled: rule.isEnabled,
            name: rule.name,
            policyId: safe.id,
            priority: rule.priority,
            type: "deterministic" as
              | "deterministic"
              | "statistical"
              | "ml_model"
          };
        })
      );
    }

    const createdRules = await db
      .select()
      .from(policyRules)
      .where(eq(policyRules.policyId, safe.id));

    void publishEvent(orgId, "policy.created", {
      ...safe,
      rules: createdRules
    });
    void logAudit(db, {
      action: "policy.created",
      actorId: user.id,
      metadata: { name, scope },
      orgId,
      resourceId: safe.id,
      resourceType: "policy"
    });

    return created(c, { ...safe, rules: createdRules });
  };
