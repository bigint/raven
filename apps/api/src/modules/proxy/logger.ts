import type { Database } from "@raven/db";
import { requestLogs, virtualKeys } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import { publishEvent } from "@/lib/events";
import { incrementBudgetSpend } from "./budget-check";

export interface LogData {
  organizationId: string;
  virtualKeyId: string;
  provider: string;
  providerConfigId: string;
  model: string;
  method: string;
  path: string;
  statusCode: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  cacheHit: boolean;
  hasImages: boolean;
  imageCount: number;
  hasToolUse: boolean;
  toolCount: number;
  toolNames: string[];
  sessionId: string | null;
  guardrailMatches?: Array<{
    ruleName: string;
    ruleType: string;
    action: string;
    matchedContent: string;
  }>;
}

export const logProxyRequest = async (
  db: Database,
  data: LogData
): Promise<typeof requestLogs.$inferSelect | null> => {
  try {
    const [row] = await db
      .insert(requestLogs)
      .values({
        cachedTokens: 0,
        cacheHit: data.cacheHit,
        cost: data.cost.toFixed(6),
        hasImages: data.hasImages,
        hasToolUse: data.hasToolUse,
        imageCount: data.imageCount,
        inputTokens: data.inputTokens,
        latencyMs: data.latencyMs,
        method: data.method,
        model: data.model,
        organizationId: data.organizationId,
        outputTokens: data.outputTokens,
        path: data.path,
        provider: data.provider,
        providerConfigId: data.providerConfigId,
        sessionId: data.sessionId,
        statusCode: data.statusCode,
        toolCount: data.toolCount,
        toolNames: data.toolNames.length > 0 ? data.toolNames : undefined,
        virtualKeyId: data.virtualKeyId
      })
      .returning();
    return row ?? null;
  } catch (err) {
    console.error("Failed to log request:", err);
    return null;
  }
};

export const updateLastUsed = (db: Database, keyId: string): void => {
  db.update(virtualKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(virtualKeys.id, keyId))
    .catch((err) => console.error("Failed to update lastUsedAt:", err));
};

export interface BudgetContext {
  redis: Redis;
  teamId: string | null;
}

export const logAndPublish = (
  db: Database,
  data: LogData,
  budgetCtx?: BudgetContext
): void => {
  void logProxyRequest(db, data).then((row) => {
    if (row) void publishEvent(data.organizationId, "request.created", row);

    if (budgetCtx && data.cost > 0) {
      void incrementBudgetSpend(
        db,
        budgetCtx.redis,
        data.organizationId,
        budgetCtx.teamId,
        data.virtualKeyId,
        data.cost
      );
    }
  });
};
