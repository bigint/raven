import crypto from "node:crypto";
import type { Database } from "@raven/db";
import { webhooks } from "@raven/db";
import { and, arrayOverlaps, eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import pRetry from "p-retry";

interface EventPayload {
  data: unknown;
  timestamp: string;
  type: string;
}

const signPayload = (payload: string, secret: string): string => {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

const deliverWebhook = async (
  url: string,
  body: string,
  secret: string
): Promise<void> => {
  const signature = signPayload(body, secret);

  await pRetry(
    async () => {
      const response = await fetch(url, {
        body,
        headers: {
          "Content-Type": "application/json",
          "X-Raven-Signature": signature
        },
        method: "POST",
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Webhook delivery failed: ${response.status}`);
      }
    },
    {
      retries: 3,
      minTimeout: 1000,
      factor: 2,
      onFailedAttempt: (ctx) => {
        console.error(
          `Webhook attempt ${ctx.attemptNumber} failed for ${url}: ${ctx.error.message}`
        );
      }
    }
  ).catch(() => {
    console.error(`Webhook delivery failed after all retries: ${url}`);
  });
};

export const initWebhookDispatcher = (db: Database, redis: Redis): void => {
  const subscriber = redis.duplicate();

  subscriber.on("error", (err) => {
    console.error("Webhook dispatcher Redis error:", err);
  });

  subscriber.psubscribe("org:*:events").catch((err) => {
    console.error("Failed to subscribe to events:", err);
  });

  subscriber.on("pmessage", (_pattern, channel, message) => {
    const orgId = channel.split(":")[1];
    if (!orgId) return;

    let event: EventPayload;
    try {
      event = JSON.parse(message) as EventPayload;
    } catch {
      return;
    }

    void (async () => {
      try {
        const matchingWebhooks = await db
          .select({
            events: webhooks.events,
            id: webhooks.id,
            secret: webhooks.secret,
            url: webhooks.url
          })
          .from(webhooks)
          .where(
            and(
              eq(webhooks.organizationId, orgId),
              eq(webhooks.isEnabled, true),
              arrayOverlaps(webhooks.events, [event.type])
            )
          );

        for (const webhook of matchingWebhooks) {
          const body = JSON.stringify({
            data: event.data,
            event: event.type,
            timestamp: event.timestamp,
            webhookId: webhook.id
          });

          void deliverWebhook(webhook.url, body, webhook.secret);
        }
      } catch (err) {
        console.error("Webhook dispatcher error:", err);
      }
    })();
  });
};
