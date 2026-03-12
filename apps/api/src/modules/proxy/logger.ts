import type { Database } from "@raven/db";
import { requestLogs, virtualKeys } from "@raven/db";
import { eq } from "drizzle-orm";
import { publishEvent } from "@/lib/events";

export interface LogData {
  organizationId: string;
  virtualKeyId: string;
  provider: string;
  model: string;
  method: string;
  path: string;
  statusCode: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  cacheHit: boolean;
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
        inputTokens: data.inputTokens,
        latencyMs: data.latencyMs,
        method: data.method,
        model: data.model,
        organizationId: data.organizationId,
        outputTokens: data.outputTokens,
        path: data.path,
        provider: data.provider,
        statusCode: data.statusCode,
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

export const logAndPublish = (db: Database, data: LogData): void => {
  void logProxyRequest(db, data).then((row) => {
    if (row) void publishEvent(data.organizationId, "request.created", row);
  });
};
