import crypto from "node:crypto";
import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { subscriptions } from "@raven/db";
import type { Plan, SubscriptionStatus } from "@raven/types";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import { cacheKeys } from "@/lib/cache-utils";
import { publishEvent } from "@/lib/events";

const WEBHOOK_DEDUP_TTL = 86400;

const verifyLemonSqueezySignature = (
  signature: string,
  rawBody: string,
  secret: string
): boolean => {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
};

const mapStatus = (lsStatus: string): SubscriptionStatus => {
  switch (lsStatus) {
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "cancelled":
    case "expired":
      return "cancelled";
    case "on_trial":
      return "trialing";
    default:
      return "active";
  }
};

const mapPlan = (customPlan: string | undefined): Plan => {
  switch (customPlan) {
    case "pro":
      return "pro";
    case "team":
      return "team";
    case "enterprise":
      return "enterprise";
    default:
      return "free";
  }
};

const upsertSubscription = async (
  db: Database,
  redis: Redis,
  orgId: string,
  plan: Plan,
  status: SubscriptionStatus,
  periodStart: Date,
  periodEnd: Date
): Promise<void> => {
  const [existing] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, orgId))
    .limit(1);

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        currentPeriodEnd: periodEnd,
        currentPeriodStart: periodStart,
        plan,
        status,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.organizationId, orgId));
  } else {
    await db.insert(subscriptions).values({
      currentPeriodEnd: periodEnd,
      currentPeriodStart: periodStart,
      organizationId: orgId,
      plan,
      status
    });
  }

  await redis.del(cacheKeys.orgPlan(orgId));
};

export const handleWebhook =
  (db: Database, env: Env, redis: Redis) => async (c: Context) => {
    const signature = c.req.header("X-Signature");

    if (!signature) {
      return c.json(
        {
          code: "VALIDATION_ERROR",
          message: "Missing X-Signature header"
        },
        400
      );
    }

    const rawBody = await c.req.text();

    if (env.LEMONSQUEEZY_WEBHOOK_SECRET) {
      if (
        !verifyLemonSqueezySignature(
          signature,
          rawBody,
          env.LEMONSQUEEZY_WEBHOOK_SECRET
        )
      ) {
        return c.json(
          { code: "VALIDATION_ERROR", message: "Invalid webhook signature" },
          401
        );
      }
    }

    const body = JSON.parse(rawBody);

    // Idempotency: deduplicate webhook deliveries using Redis
    const eventId: string | undefined = body.data?.id ?? body.meta?.event_id;
    if (eventId) {
      const key = `webhook:processed:${eventId}`;
      const wasSet = await redis.set(key, "1", "EX", WEBHOOK_DEDUP_TTL, "NX");
      if (!wasSet) {
        return c.json({ status: "already_processed" });
      }
    }

    const eventName: string = body?.meta?.event_name ?? "";
    const orgId: string | undefined = body?.meta?.custom_data?.org_id;
    const attributes = body?.data?.attributes;

    switch (eventName) {
      case "subscription_created":
      case "subscription_updated": {
        console.log(`Lemon Squeezy event: ${eventName}`, body.data?.id);
        if (orgId && attributes) {
          const plan = mapPlan(body.meta?.custom_data?.plan);
          const status = mapStatus(attributes.status);
          const periodStart = new Date(
            attributes.current_period_start ?? attributes.created_at
          );
          const periodEnd = new Date(
            attributes.current_period_end ?? attributes.renews_at
          );

          await upsertSubscription(
            db,
            redis,
            orgId,
            plan,
            status,
            periodStart,
            periodEnd
          );
          void publishEvent(orgId, "subscription.updated", body.data);
        }
        break;
      }

      case "subscription_cancelled": {
        console.log(
          "Lemon Squeezy event: subscription_cancelled",
          body.data?.id
        );
        if (orgId) {
          await db
            .update(subscriptions)
            .set({ status: "cancelled", updatedAt: new Date() })
            .where(eq(subscriptions.organizationId, orgId));
          await redis.del(cacheKeys.orgPlan(orgId));
          void publishEvent(orgId, "subscription.updated", body.data);
        }
        break;
      }

      case "subscription_payment_failed": {
        console.log(
          "Lemon Squeezy event: subscription_payment_failed",
          body.data?.id
        );
        if (orgId) {
          await db
            .update(subscriptions)
            .set({ status: "past_due", updatedAt: new Date() })
            .where(eq(subscriptions.organizationId, orgId));
          await redis.del(cacheKeys.orgPlan(orgId));
          void publishEvent(orgId, "subscription.updated", body.data);
        }
        break;
      }

      default: {
        console.log("Lemon Squeezy event (unhandled):", eventName);
        break;
      }
    }

    return c.json({ received: true });
  };
