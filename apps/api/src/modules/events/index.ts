import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { Redis } from "ioredis";
import type { AppEnv } from "@/lib/types";

export const createEventsModule = (redis: Redis) => {
  const app = new Hono<AppEnv>();

  app.get("/stream", async (c) => {
    const orgId = c.get("orgId");

    return streamSSE(c, async (stream) => {
      let aborted = false;

      c.req.raw.signal.addEventListener("abort", () => {
        aborted = true;
      });

      // Create a dedicated subscriber connection
      const sub = redis.duplicate();
      const channel = `org:${orgId}:events`;

      await sub.subscribe(channel);

      sub.on("message", async (_ch: string, message: string) => {
        if (aborted) return;
        try {
          const event = JSON.parse(message);
          await stream.writeSSE({
            data: JSON.stringify(event.data),
            event: event.type
          });
        } catch {
          // ignore parse errors
        }
      });

      // Keep connection alive with heartbeat every 15s
      while (!aborted) {
        await stream.sleep(15000);
        if (aborted) break;
        await stream.writeSSE({
          data: "",
          event: "heartbeat"
        });
      }

      // Cleanup subscriber connection
      await sub.unsubscribe(channel);
      sub.disconnect();
    });
  });

  return app;
};
