import type { Database } from "@raven/db";
import {
  budgets,
  guardrailRules,
  modelAliases,
  providerConfigs,
  routingRules,
  virtualKeys,
  webhooks
} from "@raven/db";
import { and, eq, isNull } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const exportSettings = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const [
    providers,
    keys,
    guardrails,
    routes,
    hooks,
    orgBudgets,
    aliases
  ] = await Promise.all([
    db
      .select({
        enabled: providerConfigs.isEnabled,
        name: providerConfigs.name,
        provider: providerConfigs.provider
      })
      .from(providerConfigs)
      .where(eq(providerConfigs.organizationId, orgId)),
    db
      .select({
        environment: virtualKeys.environment,
        expiresAt: virtualKeys.expiresAt,
        name: virtualKeys.name,
        rateLimitRpd: virtualKeys.rateLimitRpd,
        rateLimitRpm: virtualKeys.rateLimitRpm
      })
      .from(virtualKeys)
      .where(eq(virtualKeys.organizationId, orgId)),
    db
      .select({
        action: guardrailRules.action,
        config: guardrailRules.config,
        isEnabled: guardrailRules.isEnabled,
        name: guardrailRules.name,
        priority: guardrailRules.priority,
        type: guardrailRules.type
      })
      .from(guardrailRules)
      .where(eq(guardrailRules.organizationId, orgId)),
    db
      .select({
        condition: routingRules.condition,
        conditionValue: routingRules.conditionValue,
        isEnabled: routingRules.isEnabled,
        name: routingRules.name,
        priority: routingRules.priority,
        sourceModel: routingRules.sourceModel,
        targetModel: routingRules.targetModel
      })
      .from(routingRules)
      .where(eq(routingRules.organizationId, orgId)),
    db
      .select({
        enabled: webhooks.isEnabled,
        events: webhooks.events,
        url: webhooks.url
      })
      .from(webhooks)
      .where(eq(webhooks.organizationId, orgId)),
    db
      .select({
        alertThreshold: budgets.alertThreshold,
        entityId: budgets.entityId,
        entityType: budgets.entityType,
        limitAmount: budgets.limitAmount,
        period: budgets.period,
        periodStart: budgets.periodStart
      })
      .from(budgets)
      .where(eq(budgets.organizationId, orgId)),
    db
      .select({
        alias: modelAliases.alias,
        targetModel: modelAliases.targetModel
      })
      .from(modelAliases)
      .where(
        and(
          eq(modelAliases.organizationId, orgId),
          isNull(modelAliases.deletedAt)
        )
      )
  ]);

  return success(c, {
    budgets: orgBudgets,
    exportedAt: new Date().toISOString(),
    guardrails,
    keys,
    modelAliases: aliases,
    providers,
    routingRules: routes,
    version: "1.0",
    webhooks: hooks
  });
};
