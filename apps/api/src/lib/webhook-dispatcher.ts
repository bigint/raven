import crypto from "node:crypto";
import type { Database } from "@raven/db";
import { webhooks } from "@raven/db";
import { and, arrayOverlaps, eq } from "drizzle-orm";
import type { Redis } from "ioredis";

interface EventPayload {
  data: unknown;
  timestamp: string;
  type: string;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

const signPayload = (payload: string, secret: string): string => {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

const deliverWebhook = async (
  url: string,
  body: string,
  secret: string
): Promise<void> => {
  const signature = signPayload(body, secret);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        body,
        headers: {
          "Content-Type": "application/json",
          "X-Raven-Signature": signature
        },
        method: "POST",
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        return;
      }

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch {
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`Webhook delivery failed after ${MAX_RETRIES} retries: ${url}`);
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
            id: webhooks.id,
            url: webhooks.url,
            secret: webhooks.secret,
            events: webhooks.events
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
