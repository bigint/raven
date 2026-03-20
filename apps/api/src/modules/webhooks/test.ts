import crypto from "node:crypto";
import type { z } from "zod";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import type { testWebhookSchema } from "./schema";

type Body = z.infer<typeof testWebhookSchema>;

export const testWebhook = () => async (c: AuthContextWithJson<Body>) => {
  const { url } = c.req.valid("json");
  const secret = crypto.randomBytes(32).toString("hex");

  const payload = JSON.stringify({
    data: {},
    event: "webhook.test",
    timestamp: new Date().toISOString(),
    webhookId: "test"
  });

  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    const response = await fetch(url, {
      body: payload,
      headers: {
        "Content-Type": "application/json",
        "X-Raven-Signature": signature
      },
      method: "POST",
      signal: AbortSignal.timeout(10000)
    });

    return success(c, {
      ok: response.ok,
      status: response.status
    });
  } catch {
    return success(c, {
      ok: false,
      status: 0
    });
  }
};
