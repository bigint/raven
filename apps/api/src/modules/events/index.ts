import { Hono } from "hono";
import type { EventType, RavenEvent } from "@/lib/event-system";
import { eventSystem } from "@/lib/event-system";
import type { AppContext, AppEnv } from "@/lib/types";

export const createEventsModule = () => {
  const app = new Hono<AppEnv>();

  // Get recent events
  app.get("/", async (c: AppContext) => {
    const orgId = c.get("orgId");
    const limit = Number(c.req.query("limit") ?? "50");
    const type = c.req.query("type");

    const events: RavenEvent[] = type
      ? await eventSystem.getEventsByType(orgId, type as EventType, limit)
      : await eventSystem.getRecentEvents(orgId, limit);

    return c.json({ data: events });
  });

  // SSE event stream
  app.get("/stream", async (c: AppContext) => {
    const orgId = c.get("orgId");

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        const handler = (event: any) => {
          if (event.organizationId === orgId) {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        };

        eventSystem.on("*", handler);

        // Keep-alive
        const keepAlive = setInterval(() => {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        }, 30000);

        // Cleanup on close
        c.req.raw.signal.addEventListener("abort", () => {
          eventSystem.off("*", handler);
          clearInterval(keepAlive);
          controller.close();
        });
      }
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream"
      }
    });
  });

  return app;
};
