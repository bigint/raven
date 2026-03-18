import type { Database } from "@raven/db";
import {
  auditLogs,
  budgets,
  guardrailRules,
  invitations,
  members,
  organizations,
  prompts,
  providerConfigs,
  requestLogs,
  routingRules,
  subscriptions,
  virtualKeys,
  webhooks
} from "@raven/db";
import { eq } from "drizzle-orm";
import { ForbiddenError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

export const deleteSettings = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const orgRole = c.get("orgRole");
  const user = c.get("user");

  if (orgRole !== "owner") {
    throw new ForbiddenError("Only the owner can delete the organization");
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    // Hard delete: keys, providers, budgets, guardrails, prompts, routing, webhooks, invitations, members, subscriptions
    await Promise.all([
      tx.delete(virtualKeys).where(eq(virtualKeys.organizationId, orgId)),
      tx
        .delete(providerConfigs)
        .where(eq(providerConfigs.organizationId, orgId)),
      tx.delete(budgets).where(eq(budgets.organizationId, orgId)),
      tx.delete(guardrailRules).where(eq(guardrailRules.organizationId, orgId)),
      tx.delete(prompts).where(eq(prompts.organizationId, orgId)),
      tx.delete(routingRules).where(eq(routingRules.organizationId, orgId)),
      tx.delete(webhooks).where(eq(webhooks.organizationId, orgId)),
      tx.delete(invitations).where(eq(invitations.organizationId, orgId)),
      tx.delete(members).where(eq(members.organizationId, orgId)),
      tx.delete(subscriptions).where(eq(subscriptions.organizationId, orgId))
    ]);

    // Soft delete: request logs, audit logs, and the organization itself
    await Promise.all([
      tx
        .update(requestLogs)
        .set({ deletedAt: now })
        .where(eq(requestLogs.organizationId, orgId)),
      tx
        .update(auditLogs)
        .set({ deletedAt: now })
        .where(eq(auditLogs.organizationId, orgId)),
      tx
        .update(organizations)
        .set({ deletedAt: now })
        .where(eq(organizations.id, orgId))
    ]);
  });

  void publishEvent(orgId, "settings.deleted", { id: orgId });
  void logAudit(db, {
    action: "org.deleted",
    actorId: user.id,
    orgId,
    resourceId: orgId,
    resourceType: "organization"
  });
  return success(c, { success: true });
};
