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
  providerConfigName: string | null;
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
  endUser: string | null;
  hasImages: boolean;
  imageCount: number;
  hasToolUse: boolean;
  toolCount: number;
  toolNames: readonly string[];
  sessionId: string | null;
  userAgent: string | null;
  guardrailMatches?: readonly {
    ruleName: string;
    ruleType: string;
    action: string;
    matchedContent: string;
  }[];
}

// --- Write buffer for batching log inserts ---
const FLUSH_INTERVAL = 2000;
const MAX_BUFFER = 100;

interface BufferedEntry {
  db: Database;
  values: typeof requestLogs.$inferInsert;
}

const logBuffer: BufferedEntry[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

const startFlushTimer = (): void => {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    void flushLogBuffer();
  }, FLUSH_INTERVAL);
};

export const flushLogBuffer = async (): Promise<void> => {
  if (logBuffer.length === 0) return;

  const batch = logBuffer.splice(0, logBuffer.length);

  // Group entries by db instance in case multiple are used
  const byDb = new Map<Database, (typeof requestLogs.$inferInsert)[]>();
  for (const entry of batch) {
    const existing = byDb.get(entry.db);
    if (existing) {
      existing.push(entry.values);
    } else {
      byDb.set(entry.db, [entry.values]);
    }
  }

  const inserts = [...byDb.entries()].map(([db, values]) =>
    db
      .insert(requestLogs)
      .values(values)
      .catch((err) => console.error("Failed to flush log buffer:", err))
  );

  await Promise.all(inserts);
};

export const logProxyRequest = async (
  db: Database,
  data: LogData
): Promise<typeof requestLogs.$inferSelect | null> => {
  try {
    const values: typeof requestLogs.$inferInsert = {
      cachedTokens: data.cachedTokens,
      cacheHit: data.cacheHit,
      cost: data.cost.toFixed(6),
      endUser: data.endUser,
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
      sessionId: data.sessionId,
      statusCode: data.statusCode,
      toolCount: data.toolCount,
      toolNames: data.toolNames.length > 0 ? [...data.toolNames] : undefined,
      userAgent: data.userAgent,
      virtualKeyId: data.virtualKeyId
    };

    logBuffer.push({ db, values });
    startFlushTimer();

    // Flush immediately when buffer reaches threshold
    if (logBuffer.length >= MAX_BUFFER) {
      void flushLogBuffer();
    }

    return null;
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
  const keysToDelete: string[] = [];

  for await (const keys of stream) {
    if (!Array.isArray(keys) || keys.length === 0) continue;
    const values = await redis.mget(...(keys as string[]));
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i] as string;
      const val = values[i];
      if (!val) continue;
      const keyId = key.replace("lastused:", "");
      updates.push({ keyId, timestamp: new Date(Number.parseInt(val, 10)) });
      keysToDelete.push(key);
    }
  }

  if (updates.length === 0) return;

  // Write to DB first, then delete Redis keys only on success
  await Promise.all(
    updates.map(({ keyId, timestamp }) =>
      db
        .update(virtualKeys)
        .set({ lastUsedAt: timestamp })
        .where(eq(virtualKeys.id, keyId))
        .catch((err) => console.error("Failed to flush lastUsedAt:", err))
    )
  );

  if (keysToDelete.length > 0) {
    await redis
      .del(...keysToDelete)
      .catch((err) =>
        console.error("Failed to delete lastUsed Redis keys:", err)
      );
  }
};

export interface BudgetContext {
  redis: Redis;
}

export const logAndPublish = (
  db: Database,
  data: LogData,
  budgetCtx?: BudgetContext
): void => {
  // Publish event directly from input data instead of waiting for DB row
  void publishEvent(data.organizationId, "request.created", {
    ...data,
    cost: data.cost.toFixed(6),
    toolNames: data.toolNames.length > 0 ? [...data.toolNames] : []
  });

  // Buffer the log insert
  void logProxyRequest(db, data);

  if (budgetCtx && data.cost > 0) {
    void incrementBudgetSpend(
      db,
      budgetCtx.redis,
      data.organizationId,
      data.virtualKeyId,
      data.cost
    );
  }
};
