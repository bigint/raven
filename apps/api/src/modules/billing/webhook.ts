import crypto from "node:crypto";
import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import type { Context } from "hono";
import { publishEvent } from "@/lib/events";

const verifyPaddleSignature = (
  signature: string,
  rawBody: string,
  secret: string
): boolean => {
  const parts = signature.split(";").reduce(
    (acc, part) => {
      const [key, value] = part.split("=");
      if (key && value) acc[key] = value;
      return acc;
    },
    {} as Record<string, string>
  );

  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  const signedPayload = `${ts}:${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(h1), Buffer.from(expected));
  } catch {
    return false;
  }
};

export const handleWebhook =
  (_db: Database, env: Env) => async (c: Context) => {
    const signature = c.req.header("Paddle-Signature");

    if (!signature) {
      return c.json(
        {
          code: "VALIDATION_ERROR",
          message: "Missing Paddle-Signature header"
        },
        400
      );
    }

    const rawBody = await c.req.text();

    if (env.PADDLE_WEBHOOK_SECRET) {
      if (
        !verifyPaddleSignature(signature, rawBody, env.PADDLE_WEBHOOK_SECRET)
      ) {
        return c.json(
          { code: "VALIDATION_ERROR", message: "Invalid webhook signature" },
          401
        );
      }
    }

    const body = JSON.parse(rawBody);
    const eventType: string = body?.event_type ?? "";
    const orgId: string | undefined = body?.data?.custom_data?.org_id;

    switch (eventType) {
      case "subscription.created": {
        console.log("Paddle event: subscription.created", body.data?.id);
        if (orgId) {
          void publishEvent(orgId, "subscription.updated", body.data);
        }
        break;
      }

      case "subscription.updated": {
        console.log("Paddle event: subscription.updated", body.data?.id);
        if (orgId) {
          void publishEvent(orgId, "subscription.updated", body.data);
        }
        break;
      }

      case "subscription.cancelled": {
        console.log("Paddle event: subscription.cancelled", body.data?.id);
        if (orgId) {
          void publishEvent(orgId, "subscription.updated", body.data);
        }
        break;
      }

      case "subscription.past_due": {
        console.log("Paddle event: subscription.past_due", body.data?.id);
        if (orgId) {
          void publishEvent(orgId, "subscription.updated", body.data);
        }
        break;
      }

      default: {
        console.log("Paddle event (unhandled):", eventType);
        break;
      }
    }

    return c.json({ received: true });
  };
