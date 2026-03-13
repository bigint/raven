import type { Database } from "@raven/db";
import { providerConfigs, requestLogs } from "@raven/db";
import { desc, eq } from "drizzle-orm";
import { streamSSE } from "hono/streaming";
import { getEventRedis } from "@/lib/events";
import type { AppContext } from "@/lib/types";

export const getRequestsLive = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  return streamSSE(c, async (stream) => {
    let aborted = false;

    c.req.raw.signal.addEventListener("abort", () => {
      aborted = true;
    });

    // Send initial batch of recent logs
    const initial = await db
      .select({
        cachedTokens: requestLogs.cachedTokens,
        cacheHit: requestLogs.cacheHit,
        cost: requestLogs.cost,
        createdAt: requestLogs.createdAt,
        id: requestLogs.id,
        inputTokens: requestLogs.inputTokens,
        latencyMs: requestLogs.latencyMs,
        method: requestLogs.method,
        model: requestLogs.model,
        organizationId: requestLogs.organizationId,
        outputTokens: requestLogs.outputTokens,
        path: requestLogs.path,
        provider: requestLogs.provider,
        providerConfigName: providerConfigs.name,
        statusCode: requestLogs.statusCode,
        virtualKeyId: requestLogs.virtualKeyId
      })
      .from(requestLogs)
      .leftJoin(
        providerConfigs,
        eq(requestLogs.providerConfigId, providerConfigs.id)
      )
      .where(eq(requestLogs.organizationId, orgId))
      .orderBy(desc(requestLogs.createdAt))
      .limit(50);

    if (initial.length > 0) {
      await stream.writeSSE({
        data: JSON.stringify(initial),
        event: "init"
      });
    }

    // Subscribe to realtime events via Redis pub/sub
    const redis = getEventRedis();
    if (!redis) {
      // Fallback: just keep connection alive without realtime
      while (!aborted) {
        await stream.sleep(15000);
      }
      return;
    }

    const sub = redis.duplicate();
    const channel = `org:${orgId}:events`;

    await sub.subscribe(channel);

    sub.on("message", async (_ch: string, message: string) => {
      if (aborted) return;
      try {
        const event = JSON.parse(message);
        if (event.type === "request.created") {
          await stream.writeSSE({
            data: JSON.stringify([event.data]),
            event: "new"
          });
        }
      } catch {
        // ignore parse errors
      }
    });

    // Keep alive with heartbeat
    while (!aborted) {
      await stream.sleep(15000);
      if (aborted) break;
      await stream.writeSSE({
        data: "",
        event: "heartbeat"
      });
    }

    await sub.unsubscribe(channel);
    sub.disconnect();
  });
};
