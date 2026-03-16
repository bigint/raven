import type { Database } from "@raven/db";
import { policies, policyEvaluations, policyRules } from "@raven/db";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { Redis } from "ioredis";
import { cachedQuery } from "@/lib/cache-utils";
import { evaluateCondition } from "./evaluate-condition";

export interface PolicyEvaluationContext {
  organizationId: string;
  teamId?: string;
  virtualKeyId?: string;
  requestBody: Record<string, unknown>;
  model?: string;
  provider?: string;
  estimatedCost?: number;
  requestId: string;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  blocked: boolean;
  blockReason?: string;
  warnings: string[];
  evaluations: Array<{
    policyId: string;
    ruleId: string;
    ruleName: string;
    matched: boolean;
    enforcement: string;
    evidence?: Record<string, unknown>;
    complianceFramework?: string;
    complianceControl?: string;
  }>;
}

interface LoadedPolicy {
  id: string;
  name: string;
  scope: string;
  scopeId: string | null;
  rules: Array<{
    id: string;
    name: string;
    condition: Record<string, unknown>;
    enforcement: string;
    priority: number;
    isEnabled: boolean;
    complianceMap: Record<string, string>;
  }>;
}

const extractTextContent = (body: Record<string, unknown>): string[] => {
  const messages = body.messages;
  if (!Array.isArray(messages)) return [];
  return messages
    .map((m: Record<string, unknown>) =>
      typeof m.content === "string" ? m.content : ""
    )
    .filter(Boolean);
};

const loadPolicies = async (
  db: Database,
  redis: Redis,
  orgId: string,
  teamId?: string,
  virtualKeyId?: string
): Promise<LoadedPolicy[]> => {
  const cacheKey = `policies:${orgId}:${teamId ?? ""}:${virtualKeyId ?? ""}`;

  return cachedQuery(redis, cacheKey, 60, async () => {
    const policyRows = await db
      .select()
      .from(policies)
      .where(
        and(eq(policies.organizationId, orgId), eq(policies.isEnabled, true))
      );

    // Filter by scope hierarchy: platform > org > team > key
    const applicable = policyRows.filter((p) => {
      if (p.scope === "platform" || p.scope === "organization") return true;
      if (p.scope === "team" && teamId && p.scopeId === teamId) return true;
      if (p.scope === "key" && virtualKeyId && p.scopeId === virtualKeyId)
        return true;
      return false;
    });

    if (applicable.length === 0) return [];

    const policyIds = applicable.map((p) => p.id);

    const rules =
      policyIds.length === 1
        ? await db
            .select()
            .from(policyRules)
            .where(eq(policyRules.policyId, policyIds[0] as string))
            .orderBy(asc(policyRules.priority))
        : await db
            .select()
            .from(policyRules)
            .where(inArray(policyRules.policyId, policyIds))
            .orderBy(asc(policyRules.priority));

    const rulesMap: Record<string, (typeof policyRules.$inferSelect)[]> = {};
    for (const rule of rules) {
      if (!rulesMap[rule.policyId]) {
        rulesMap[rule.policyId] = [];
      }
      (rulesMap[rule.policyId] as (typeof policyRules.$inferSelect)[]).push(
        rule
      );
    }

    // Sort by scope priority: platform first, then org, then team, then key
    const scopeOrder = { key: 3, organization: 1, platform: 0, team: 2 };
    applicable.sort(
      (a, b) =>
        (scopeOrder[a.scope as keyof typeof scopeOrder] ?? 1) -
        (scopeOrder[b.scope as keyof typeof scopeOrder] ?? 1)
    );

    return applicable.map((p) => ({
      id: p.id,
      name: p.name,
      rules: (rulesMap[p.id] ?? []).map((r) => ({
        complianceMap: r.complianceMap,
        condition: r.condition,
        enforcement: r.enforcement,
        id: r.id,
        isEnabled: r.isEnabled,
        name: r.name,
        priority: r.priority
      })),
      scope: p.scope,
      scopeId: p.scopeId
    }));
  });
};

const logEvaluationsAsync = (
  db: Database,
  orgId: string,
  requestId: string,
  evaluations: PolicyEvaluationResult["evaluations"]
): void => {
  if (evaluations.length === 0) return;

  void db
    .insert(policyEvaluations)
    .values(
      evaluations.map((ev) => ({
        complianceControl: ev.complianceControl ?? null,
        complianceFramework: ev.complianceFramework ?? null,
        enforcement: ev.enforcement,
        evidence: ev.evidence ?? null,
        matched: ev.matched,
        organizationId: orgId,
        policyId: ev.policyId,
        requestId,
        ruleId: ev.ruleId
      }))
    )
    .catch((err) => {
      console.error("Failed to log policy evaluations:", err);
    });
};

export const evaluatePolicies = async (
  db: Database,
  redis: Redis,
  context: PolicyEvaluationContext
): Promise<PolicyEvaluationResult> => {
  const loadedPolicies = await loadPolicies(
    db,
    redis,
    context.organizationId,
    context.teamId,
    context.virtualKeyId
  );

  if (loadedPolicies.length === 0) {
    return {
      allowed: true,
      blocked: false,
      evaluations: [],
      warnings: []
    };
  }

  const contents = extractTextContent(context.requestBody);
  const evaluations: PolicyEvaluationResult["evaluations"] = [];
  const warnings: string[] = [];
  let blocked = false;
  let blockReason: string | undefined;

  for (const policy of loadedPolicies) {
    for (const rule of policy.rules) {
      if (!rule.isEnabled) continue;

      const result = evaluateCondition(rule.condition, context, contents);

      // Extract first compliance mapping from complianceMap for logging
      const complianceEntries = Object.entries(rule.complianceMap);
      const complianceFramework =
        complianceEntries.length > 0 ? complianceEntries[0]?.[0] : undefined;
      const complianceControl =
        complianceEntries.length > 0 ? complianceEntries[0]?.[1] : undefined;

      const evaluation = {
        complianceControl,
        complianceFramework,
        enforcement: rule.enforcement,
        evidence: result.evidence,
        matched: result.matched,
        policyId: policy.id,
        ruleId: rule.id,
        ruleName: rule.name
      };
      evaluations.push(evaluation);

      if (!result.matched) continue;

      if (rule.enforcement === "block") {
        blocked = true;
        blockReason = `Policy "${policy.name}" rule "${rule.name}" blocked the request`;
      }

      if (rule.enforcement === "warn") {
        warnings.push(
          `Policy "${policy.name}" rule "${rule.name}": ${
            result.evidence
              ? JSON.stringify(result.evidence)
              : "condition matched"
          }`
        );
      }
    }
  }

  // Log evaluations asynchronously — do not block the request
  logEvaluationsAsync(
    db,
    context.organizationId,
    context.requestId,
    evaluations
  );

  return {
    allowed: !blocked,
    blocked,
    blockReason,
    evaluations,
    warnings
  };
};
