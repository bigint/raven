import type { Database } from "@raven/db";
import { requestLogs } from "@raven/db";
import type { Redis } from "ioredis";
import { publishEvent } from "@/lib/events";
import { incrementBudgetSpend } from "./budget-check";

export interface LogData {
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

let bufferDb: Database | null = null;
const logBuffer: (typeof requestLogs.$inferInsert)[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

const startFlushTimer = (): void => {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    void flushLogBuffer();
  }, FLUSH_INTERVAL);
};

export const flushLogBuffer = async (): Promise<void> => {
  if (logBuffer.length === 0 || !bufferDb) return;

  const batch = logBuffer.splice(0, logBuffer.length);

  await bufferDb
    .insert(requestLogs)
    .values(batch)
    .catch((err) => console.error("Failed to flush log buffer:", err));
};

const bufferLogEntry = (db: Database, data: LogData): void => {
  bufferDb = db;
  logBuffer.push({
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
  });
  startFlushTimer();

  if (logBuffer.length >= MAX_BUFFER) {
    void flushLogBuffer();
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
  void publishEvent("request.created", {
    ...data,
    cost: data.cost.toFixed(6),
    toolNames: data.toolNames.length > 0 ? [...data.toolNames] : []
  });

  bufferLogEntry(db, data);

  if (budgetCtx && data.cost > 0) {
    void incrementBudgetSpend(
      db,
      budgetCtx.redis,
      data.virtualKeyId,
      data.cost
    );
  }
};
