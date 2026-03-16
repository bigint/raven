import type { Database } from "@raven/db";
import { policies, policyRules } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { updatePolicySchema } from "./schema";

type Body = z.infer<typeof updatePolicySchema>;

export const updatePolicy =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const { name, description, scope, scopeTargetId, isEnabled, rules } =
      c.req.valid("json");

    const [existing] = await db
      .select()
      .from(policies)
      .where(and(eq(policies.id, id), eq(policies.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Policy not found");
    }

    const updates: Partial<typeof policies.$inferInsert> = {
      updatedAt: new Date(),
      version: existing.version + 1
    };

    if (name !== undefined) {
      updates.name = name;
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (scope !== undefined) {
      updates.scope = scope;
    }

    if (scopeTargetId !== undefined) {
      updates.scopeTargetId = scopeTargetId;
    }

    if (isEnabled !== undefined) {
      updates.isEnabled = isEnabled;
    }

    const [updated] = await db
      .update(policies)
      .set(updates)
      .where(and(eq(policies.id, id), eq(policies.organizationId, orgId)))
      .returning();

    // Replace rules if provided
    if (rules !== undefined) {
      await db.delete(policyRules).where(eq(policyRules.policyId, id));

      if (rules.length > 0) {
        await db.insert(policyRules).values(
          rules.map((rule) => ({
            complianceControl: rule.complianceControl ?? null,
            complianceFramework: rule.complianceFramework ?? null,
            conditions: rule.conditions,
            enforcement: rule.enforcement,
            isEnabled: rule.isEnabled,
            name: rule.name,
            policyId: id,
            priority: rule.priority
          }))
        );
      }
    }

    const updatedRules = await db
      .select()
      .from(policyRules)
      .where(eq(policyRules.policyId, id));

    void publishEvent(orgId, "policy.updated", {
      ...updated,
      rules: updatedRules
    });
    void logAudit(db, {
      action: "policy.updated",
      actorId: user.id,
      metadata: { name, scope },
      orgId,
      resourceId: id,
      resourceType: "policy"
    });

    return success(c, { ...updated, rules: updatedRules });
  };
