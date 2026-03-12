import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import { authenticateKey } from "./auth";
import { logAndPublish, updateLastUsed } from "./logger";
import { resolveProvider } from "./provider-resolver";
import { checkRateLimit } from "./rate-limiter";
import { buildResponse } from "./response";
import { extractModel, extractTokenUsage } from "./token-usage";
import { forwardRequest } from "./upstream";

export const proxyHandler = (
  db: Database,
  redis: Redis,
  env: Env
): ((c: Context) => Promise<Response>) => {
  return async (c: Context): Promise<Response> => {
    const startTime = Date.now();

    // 1. Authenticate virtual key
    const authHeader = c.req.header("Authorization") ?? "";
    const { virtualKey } = await authenticateKey(db, authHeader);

    // 2. Rate limit check
    await checkRateLimit(
      redis,
      virtualKey.id,
      virtualKey.rateLimitRpm,
      virtualKey.rateLimitRpd
    );

    // 3. Resolve provider and decrypt credentials
    const { adapter, decryptedApiKey, providerName, upstreamPath } =
      await resolveProvider(db, env, virtualKey.organizationId, c.req.path);

    // 4. Forward request to upstream provider
    const method = c.req.method;
    const hasBody = method !== "GET" && method !== "HEAD";
    const bodyText = hasBody ? await c.req.text() : undefined;

    const {
      isStreaming,
      requestedModel,
      response: upstreamResponse
    } = await forwardRequest({
      adapter,
      body: bodyText,
      decryptedApiKey,
      incomingHeaders: c.req.header(),
      method,
      rawUrl: c.req.url,
      upstreamPath
    });

    const latencyMs = Date.now() - startTime;

    // 5. Build response
    const proxyResponse = await buildResponse(upstreamResponse, isStreaming);

    // 6. Log and update last used (fire-and-forget)
    const logData = {
      cacheHit: false,
      cost: 0,
      inputTokens: 0,
      latencyMs,
      method,
      model: requestedModel,
      organizationId: virtualKey.organizationId,
      outputTokens: 0,
      path: upstreamPath,
      provider: providerName,
      statusCode: upstreamResponse.status,
      virtualKeyId: virtualKey.id
    };

    if (proxyResponse.kind === "buffered") {
      const { inputTokens, outputTokens } = extractTokenUsage(
        proxyResponse.body
      );
      const model = extractModel(proxyResponse.body, requestedModel);
      logData.inputTokens = inputTokens;
      logData.outputTokens = outputTokens;
      logData.model = model;
      logData.cost = adapter.estimateCost(model, inputTokens, outputTokens);
    }

    logAndPublish(db, logData);
    updateLastUsed(db, virtualKey.id);

    // 7. Return response to client
    if (proxyResponse.kind === "streaming") {
      return new Response(proxyResponse.response.body, {
        headers: proxyResponse.headers,
        status: proxyResponse.response.status
      });
    }

    return new Response(proxyResponse.text, {
      headers: proxyResponse.headers,
      status: proxyResponse.response.status
    });
  };
};
