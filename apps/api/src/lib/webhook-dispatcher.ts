import crypto from "node:crypto";
import type { Database } from "@raven/db";
import { webhooks } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import pRetry from "p-retry";
import { log } from "./logger";

interface EventPayload {
  data: unknown;
  timestamp: string;
  type: string;
}

interface WebhookConfig {
  events: string[];
  id: string;
  secret: string;
  url: string;
}

// Module-level concurrency control
const MAX_CONCURRENT = 10;
let inFlight = 0;
const queue: (() => void)[] = [];

const withConcurrency = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (inFlight >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => queue.push(resolve));
  }
  inFlight++;
  try {
    return await fn();
  } finally {
    inFlight--;
    const next = queue.shift();
    if (next) next();
  }
};

// Simple TTL cache for webhook configs
const WEBHOOK_CONFIG_TTL_MS = 30_000;

interface CacheEntry {
  configs: WebhookConfig[];
  expiresAt: number;
}

let webhookConfigCache: CacheEntry | null = null;

const getWebhookConfigs = async (
  db: Database,
  eventType: string
): Promise<WebhookConfig[]> => {
  const now = Date.now();

  if (webhookConfigCache && webhookConfigCache.expiresAt > now) {
    return webhookConfigCache.configs.filter((c) =>
      c.events.includes(eventType)
    );
  }

  const configs = await db
    .select({
      events: webhooks.events,
      id: webhooks.id,
      secret: webhooks.secret,
      url: webhooks.url
    })
    .from(webhooks)
    .where(eq(webhooks.isEnabled, true));

  webhookConfigCache = {
    configs,
    expiresAt: now + WEBHOOK_CONFIG_TTL_MS
  };

  return configs.filter((c) => c.events.includes(eventType));
};

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
      factor: 2,
      minTimeout: 1000,
      onFailedAttempt: (ctx) => {
        console.error(
          `Webhook attempt ${ctx.attemptNumber} failed for ${url}: ${ctx.error.message}`
        );
      },
      retries: 3
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

  subscriber.subscribe("raven:events").catch((err) => {
    console.error("Failed to subscribe to events:", err);
  });

  subscriber.on("message", (_channel, message) => {
    let event: EventPayload;
    try {
      event = JSON.parse(message) as EventPayload;
    } catch {
      return;
    }

    void (async () => {
      try {
        const matchingWebhooks = await getWebhookConfigs(db, event.type);

        for (const webhook of matchingWebhooks) {
          const body = JSON.stringify({
            data: event.data,
            event: event.type,
            timestamp: event.timestamp,
            webhookId: webhook.id
          });

          void withConcurrency(() =>
            deliverWebhook(webhook.url, body, webhook.secret)
          );
        }
      } catch (err) {
        console.error("Webhook dispatcher error:", err);
      }
    })();
  });
};
