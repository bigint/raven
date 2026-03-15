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
  reasoningTokens: number;
  cost: number;
  latencyMs: number;
  cachedTokens: number;
  cacheHit: boolean;
  hasImages: boolean;
  imageCount: number;
  hasToolUse: boolean;
  toolCount: number;
  toolNames: string[];
  requestBody?: Record<string, unknown>;
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
        cachedTokens: data.cachedTokens,
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
        reasoningTokens: data.reasoningTokens,
        requestBody: data.requestBody,
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

export const updateLastUsed = (redis: Redis, keyId: string): void => {
  redis
    .set(`lastused:${keyId}`, Date.now().toString(), "EX", 300)
    .catch((err) => console.error("Failed to buffer lastUsedAt:", err));
};

/**
 * Flush all buffered lastUsedAt timestamps to the database.
 * Call this periodically (e.g., every 60 seconds).
 */
export const flushLastUsed = async (
  db: Database,
  redis: Redis
): Promise<void> => {
  const stream = redis.scanStream({ count: 100, match: "lastused:*" });

  const updates: { keyId: string; timestamp: Date }[] = [];

  for await (const keys of stream) {
    if (!Array.isArray(keys) || keys.length === 0) continue;
    const values = await redis.mget(...(keys as string[]));
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i] as string;
      const val = values[i];
      if (!val) continue;
      const keyId = key.replace("lastused:", "");
      updates.push({ keyId, timestamp: new Date(Number.parseInt(val, 10)) });
    }
    // Delete processed keys
    await redis.del(...(keys as string[]));
  }

  // Batch update DB
  for (const { keyId, timestamp } of updates) {
    await db
      .update(virtualKeys)
      .set({ lastUsedAt: timestamp })
      .where(eq(virtualKeys.id, keyId))
      .catch((err) => console.error("Failed to flush lastUsedAt:", err));
  }
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
