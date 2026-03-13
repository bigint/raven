import crypto from "node:crypto";
import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import type { Context } from "hono";
import { publishEvent } from "@/lib/events";

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

export const handleWebhook =
  (_db: Database, env: Env) => async (c: Context) => {
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
    const eventName: string = body?.meta?.event_name ?? "";
    const orgId: string | undefined = body?.meta?.custom_data?.org_id;

    switch (eventName) {
      case "subscription_created": {
        console.log("Lemon Squeezy event: subscription_created", body.data?.id);
        if (orgId) {
          void publishEvent(orgId, "subscription.updated", body.data);
        }
        break;
      }

      case "subscription_updated": {
        console.log("Lemon Squeezy event: subscription_updated", body.data?.id);
        if (orgId) {
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
