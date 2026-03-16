import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { models } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import { ForbiddenError, GuardrailError } from "@/lib/errors";
import { authenticateKey } from "./auth";
import { checkBudgets } from "./budget-check";
import { checkCache, storeCache } from "./cache";
import { analyzeContent } from "./content-analyzer";
import { evaluateRoutingRules } from "./content-router";
import { withFallback } from "./fallback";
import { evaluateGuardrails, type GuardrailMatch } from "./guardrails";
import { updateMetrics } from "./latency-tracker";
import { logAndPublish, updateLastUsed } from "./logger";
import { checkPlanLimit } from "./plan-check";
import { resolveProvider } from "./provider-resolver";
import { checkRateLimit } from "./rate-limiter";
import { buildResponse } from "./response";
import { analyzeResponse } from "./response-analyzer";
import { withRetry } from "./retry";
import {
  extractModel,
  extractTokenUsage,
  StreamTokenAccumulator
} from "./token-usage";
import { forwardRequest } from "./upstream";

/**
 * Strip base64 image data from the request body to keep log storage small.
 * Replaces base64 strings with a placeholder while preserving the structure.
 */
const hasBase64Images = (body: Record<string, unknown>): boolean => {
  const messages = body.messages;
  if (!Array.isArray(messages)) return false;

  for (const msg of messages) {
    const m = msg as Record<string, unknown>;
    if (!Array.isArray(m.content)) continue;
    for (const block of m.content) {
      const b = block as Record<string, unknown>;
      if (b.type === "image_url") {
        const img = b.image_url as Record<string, unknown> | undefined;
        if (img && typeof img.url === "string" && img.url.startsWith("data:")) {
          return true;
        }
      }
      if (b.type === "image") {
        const src = b.source as Record<string, unknown> | undefined;
        if (src && src.type === "base64") {
          return true;
        }
      }
    }
  }
  return false;
};

const sanitizeForLog = (
  body: Record<string, unknown>
): Record<string, unknown> => {
  if (!hasBase64Images(body)) return body;

  const clone = structuredClone(body);
  const messages = clone.messages as Record<string, unknown>[];

  for (const msg of messages) {
    if (!Array.isArray(msg.content)) continue;
    for (const block of msg.content) {
      const b = block as Record<string, unknown>;
      // OpenAI: image_url with data URI
      if (b.type === "image_url") {
        const img = b.image_url as Record<string, unknown> | undefined;
        if (img && typeof img.url === "string" && img.url.startsWith("data:")) {
          img.url = "[base64 image stripped]";
        }
      }
      // Anthropic: image with base64 source
      if (b.type === "image") {
        const src = b.source as Record<string, unknown> | undefined;
        if (src && src.type === "base64") {
          src.data = "[base64 image stripped]";
        }
      }
    }
  }
  return clone;
};

export const proxyHandler = (
  db: Database,
  redis: Redis,
  env: Env
): ((c: Context) => Promise<Response>) => {
  return async (c: Context): Promise<Response> => {
    const startTime = Date.now();

    // 1. Authenticate virtual key
    const authHeader = c.req.header("Authorization") ?? "";
    const { virtualKey } = await authenticateKey(db, authHeader, redis);

    // Verify key belongs to custom domain's org if present
    const domainOrgId = c.get("domainOrgId") as string | undefined;
    if (domainOrgId && virtualKey.organizationId !== domainOrgId) {
      throw new ForbiddenError(
        "Virtual key does not belong to this domain's organization"
      );
    }

    // 2-4. Run independent gate checks in parallel
    await Promise.all([
      checkRateLimit(
        redis,
        virtualKey.id,
        virtualKey.rateLimitRpm,
        virtualKey.rateLimitRpd
      ),
      checkPlanLimit(db, redis, virtualKey.organizationId),
      checkBudgets(
        db,
        redis,
        virtualKey.organizationId,
        virtualKey.teamId,
        virtualKey.id
      )
    ]);

    // 5. Extract body and evaluate guardrails
    const method = c.req.method;
    const hasBody = method !== "GET" && method !== "HEAD";
    const bodyText = hasBody ? await c.req.text() : undefined;

    // Parse body once for all downstream consumers
    let parsedBody: Record<string, unknown> = {};
    if (bodyText) {
      try {
        parsedBody = JSON.parse(bodyText);
      } catch {
        // Non-JSON body — leave as empty object
      }
    }

    let guardrailWarnings: string[] = [];
    let guardrailMatches: GuardrailMatch[] = [];
    let finalBodyText = bodyText;

    // 5a-5b. Run guardrails and content routing in parallel
    const messages = Array.isArray(parsedBody.messages)
      ? parsedBody.messages
      : [];
    const hasMessages =
      Object.keys(parsedBody).length > 0 && messages.length > 0;
    const hasModel = typeof parsedBody.model === "string";

    const [guardrailResult, routingResult] = await Promise.all([
      hasMessages
        ? evaluateGuardrails(db, virtualKey.organizationId, messages).catch(
            (err: unknown) => {
              if (err instanceof GuardrailError) throw err;
              return null;
            }
          )
        : null,
      hasModel
        ? evaluateRoutingRules(
            db,
            virtualKey.organizationId,
            parsedBody.model as string,
            parsedBody
          )
        : null
    ]);

    if (guardrailResult) {
      guardrailWarnings = guardrailResult.warnings;
      guardrailMatches = guardrailResult.matches;
    }

    if (routingResult?.ruleApplied) {
      parsedBody.model = routingResult.model;
      finalBodyText = JSON.stringify(parsedBody);
    }

    // 5c. Validate model is enabled in the platform
    const requestedModelSlug = parsedBody.model as string | undefined;
    if (requestedModelSlug) {
      const [allowedModel] = await db
        .select({ id: models.id })
        .from(models)
        .where(eq(models.slug, requestedModelSlug))
        .limit(1);

      if (!allowedModel) {
        return c.json(
          {
            error: {
              code: "MODEL_NOT_SUPPORTED",
              message: `Model "${requestedModelSlug}" is not supported in Raven. Please contact us at support@raven.ai.`
            }
          },
          400
        );
      }
    }

    // 6. Resolve provider and decrypt credentials
    const {
      adapter,
      decryptedApiKey,
      providerConfigId,
      providerName,
      upstreamPath
    } = await resolveProvider(
      db,
      env,
      virtualKey.organizationId,
      c.req.path,
      redis
    );

    // 7. Use pre-parsed body for cache lookup
    const requestBody = parsedBody;

    // 8. Check cache before forwarding
    const cacheResult = await checkCache(
      redis,
      virtualKey.organizationId,
      providerName,
      requestBody
    );

    if (cacheResult.hit) {
      const latencyMs = Date.now() - startTime;
      const requestedModel = (requestBody.model as string) ?? "unknown";

      const cacheAnalysis = analyzeContent(
        requestBody,
        c.req.header("x-session-id")
      );
      const logData = {
        cachedTokens: 0,
        cacheHit: true,
        cost: 0,
        guardrailMatches:
          guardrailMatches.length > 0 ? guardrailMatches : undefined,
        hasImages: cacheAnalysis.hasImages,
        hasToolUse: cacheAnalysis.hasToolUse,
        imageCount: cacheAnalysis.imageCount,
        inputTokens: 0,
        latencyMs,
        method,
        model: requestedModel,
        organizationId: virtualKey.organizationId,
        outputTokens: 0,
        path: upstreamPath,
        provider: providerName,
        providerConfigId,
        reasoningTokens: 0,
        requestBody: sanitizeForLog(requestBody),
        sessionId: cacheAnalysis.sessionId,
        statusCode: 200,
        toolCount: cacheAnalysis.toolCount,
        toolNames: cacheAnalysis.toolNames,
        virtualKeyId: virtualKey.id
      };

      const { inputTokens, outputTokens, reasoningTokens, cachedTokens } =
        extractTokenUsage(cacheResult.parsed);
      const model = extractModel(cacheResult.parsed, requestedModel);
      logData.cachedTokens = cachedTokens;
      logData.inputTokens = inputTokens;
      logData.outputTokens = outputTokens;
      logData.reasoningTokens = reasoningTokens;
      logData.model = model;

      logAndPublish(db, logData, { redis, teamId: virtualKey.teamId });
      updateLastUsed(redis, virtualKey.id);

      const cacheHeaders: Record<string, string> = {
        "content-type": "application/json"
      };

      if (guardrailWarnings.length > 0) {
        cacheHeaders["X-Guardrail-Warnings"] = guardrailWarnings.join("; ");
      }

      return new Response(cacheResult.body, {
        headers: cacheHeaders,
        status: 200
      });
    }

    // 8b. Normalize request from OpenAI format to provider-native format
    if (
      adapter.normalizeRequest &&
      parsedBody &&
      Object.keys(parsedBody).length > 0
    ) {
      parsedBody = adapter.normalizeRequest(parsedBody);
      finalBodyText = JSON.stringify(parsedBody);
    }

    // 8c. Apply provider-specific optimizations (e.g. cache control)
    if (
      adapter.transformBody &&
      parsedBody &&
      Object.keys(parsedBody).length > 0
    ) {
      const transformed = adapter.transformBody(parsedBody);
      finalBodyText = JSON.stringify(transformed);
    }

    // 8d. Override upstream path to provider's chat endpoint when applicable
    const resolvedUpstreamPath =
      upstreamPath === "/chat/completions" &&
      adapter.chatEndpoint !== "/chat/completions"
        ? adapter.chatEndpoint
        : upstreamPath;

    // 9. Forward request with retry logic
    const forwardInput = {
      adapter,
      body: finalBodyText,
      decryptedApiKey,
      incomingHeaders: c.req.header(),
      method,
      rawUrl: c.req.url,
      upstreamPath: resolvedUpstreamPath
    };

    let upstreamResult = await withRetry(() => forwardRequest(forwardInput));
    let finalProviderConfigId = providerConfigId;
    let finalProviderName = providerName;

    // 10. If retries exhausted and response is not ok, try fallbacks
    if (!upstreamResult.response.ok) {
      const fallbackResult = await withFallback(
        db,
        env,
        virtualKey.organizationId,
        providerConfigId,
        (overrides) =>
          withRetry(() =>
            forwardRequest({
              ...forwardInput,
              ...overrides
            })
          )
      );

      if (fallbackResult) {
        upstreamResult = fallbackResult.result;
        finalProviderConfigId = fallbackResult.providerConfigId;
        finalProviderName = fallbackResult.providerName;
      }
    }

    const latencyMs = Date.now() - startTime;

    // 11. Build response
    const proxyResponse = await buildResponse(
      upstreamResult.response,
      upstreamResult.isStreaming
    );

    // 11b. Analyze request content for multi-modal and agentic tracking
    const sessionHeader = c.req.header("x-session-id");
    const contentAnalysis = analyzeContent(requestBody, sessionHeader);

    // 12. Prepare log data
    const logData = {
      cachedTokens: 0,
      cacheHit: false,
      cost: 0,
      guardrailMatches:
        guardrailMatches.length > 0 ? guardrailMatches : undefined,
      hasImages: contentAnalysis.hasImages,
      hasToolUse: contentAnalysis.hasToolUse,
      imageCount: contentAnalysis.imageCount,
      inputTokens: 0,
      latencyMs,
      method,
      model: upstreamResult.requestedModel,
      organizationId: virtualKey.organizationId,
      outputTokens: 0,
      path: upstreamPath,
      provider: finalProviderName,
      providerConfigId: finalProviderConfigId,
      reasoningTokens: 0,
      requestBody: sanitizeForLog(requestBody),
      sessionId: contentAnalysis.sessionId,
      statusCode: upstreamResult.response.status,
      toolCount: contentAnalysis.toolCount,
      toolNames: [...contentAnalysis.toolNames],
      virtualKeyId: virtualKey.id
    };

    // 13. Add guardrail warning headers if present
    if (guardrailWarnings.length > 0) {
      proxyResponse.headers["X-Guardrail-Warnings"] =
        guardrailWarnings.join("; ");
    }

    if (proxyResponse.kind === "buffered") {
      const responseStatus = proxyResponse.response.status;
      const responseOk = upstreamResult.response.ok;
      const responseText = proxyResponse.text;
      const responseBody = proxyResponse.body;
      const requestedModel = upstreamResult.requestedModel;

      // Defer all post-processing — none of it affects the response
      void (() => {
        const {
          inputTokens,
          outputTokens,
          reasoningTokens,
          cachedTokens,
          cacheReadTokens,
          cacheWriteTokens
        } = extractTokenUsage(responseBody);
        const model = extractModel(responseBody, requestedModel);
        logData.cachedTokens = cachedTokens;
        logData.inputTokens = inputTokens;
        logData.outputTokens = outputTokens;
        logData.reasoningTokens = reasoningTokens;
        logData.model = model;
        logData.cost = adapter.estimateCost(
          model,
          inputTokens,
          outputTokens,
          cacheReadTokens,
          cacheWriteTokens
        );

        const responseAnalysis = analyzeResponse(responseBody);
        if (responseAnalysis.hasToolCalls) {
          logData.hasToolUse = true;
          logData.toolCount += responseAnalysis.toolCallCount;
          logData.toolNames.push(...responseAnalysis.toolCallNames);
        }

        if (responseOk) {
          void storeCache(
            redis,
            virtualKey.organizationId,
            finalProviderName,
            requestBody,
            responseText
          );
        }

        logAndPublish(db, logData, { redis, teamId: virtualKey.teamId });
        updateLastUsed(redis, virtualKey.id);
        void updateMetrics(
          redis,
          finalProviderConfigId,
          latencyMs,
          logData.cost
        );
      })();

      return new Response(responseText, {
        headers: proxyResponse.headers,
        status: responseStatus
      });
    }

    // 14. Streaming: pipe through a TransformStream to accumulate tokens
    const accumulator = new StreamTokenAccumulator();
    let partialLine = "";

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      flush() {
        // Process any remaining partial line
        if (partialLine) {
          accumulator.processChunk(partialLine);
        }

        // Fire-and-forget: log accumulated token usage
        const {
          inputTokens,
          outputTokens,
          reasoningTokens,
          cachedTokens,
          cacheReadTokens,
          cacheWriteTokens
        } = accumulator.getUsage();
        const model =
          accumulator.getModel() === "unknown"
            ? upstreamResult.requestedModel
            : accumulator.getModel();
        logData.cachedTokens = cachedTokens;
        logData.inputTokens = inputTokens;
        logData.outputTokens = outputTokens;
        logData.reasoningTokens = reasoningTokens;
        logData.model = model;
        logData.cost = adapter.estimateCost(
          model,
          inputTokens,
          outputTokens,
          cacheReadTokens,
          cacheWriteTokens
        );

        logAndPublish(db, logData, { redis, teamId: virtualKey.teamId });
        updateLastUsed(redis, virtualKey.id);

        void updateMetrics(
          redis,
          finalProviderConfigId,
          latencyMs,
          logData.cost
        );
      },
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const combined = partialLine + text;
        const lines = combined.split("\n");

        partialLine = lines.pop() ?? "";

        if (adapter.normalizeStreamChunk) {
          const encoder = new TextEncoder();
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
              accumulator.processChunk(trimmed);
              const normalized = adapter.normalizeStreamChunk(trimmed);
              if (normalized) {
                controller.enqueue(encoder.encode(`${normalized}\n\n`));
              }
            } else {
              controller.enqueue(encoder.encode("\n"));
            }
          }
        } else {
          controller.enqueue(chunk);
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
              accumulator.processChunk(trimmed);
            }
          }
        }
      }
    });

    const streamBody = proxyResponse.response.body?.pipeThrough(transform);

    return new Response(streamBody, {
      headers: proxyResponse.headers,
      status: proxyResponse.response.status
    });
  };
};
