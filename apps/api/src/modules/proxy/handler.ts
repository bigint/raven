import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import { GuardrailError } from "@/lib/errors";
import { authenticateKey } from "./auth";
import { checkBudgets } from "./budget-check";
import { checkCache, storeCache } from "./cache";
import { analyzeContent } from "./content-analyzer";
import { evaluateRoutingRules } from "./content-router";
import { withFallback } from "./fallback";
import { evaluateGuardrails, type GuardrailMatch } from "./guardrails";
import { updateCost, updateLatency } from "./latency-tracker";
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

    // 3. Plan limit check
    await checkPlanLimit(db, redis, virtualKey.organizationId);

    // 4. Budget check
    await checkBudgets(
      db,
      redis,
      virtualKey.organizationId,
      virtualKey.teamId,
      virtualKey.id
    );

    // 5. Extract body and evaluate guardrails
    const method = c.req.method;
    const hasBody = method !== "GET" && method !== "HEAD";
    const bodyText = hasBody ? await c.req.text() : undefined;

    let guardrailWarnings: string[] = [];
    let guardrailMatches: GuardrailMatch[] = [];

    if (bodyText) {
      try {
        const parsed = JSON.parse(bodyText);
        const messages = Array.isArray(parsed.messages) ? parsed.messages : [];
        if (messages.length > 0) {
          const result = await evaluateGuardrails(
            db,
            virtualKey.organizationId,
            messages
          );
          guardrailWarnings = result.warnings;
          guardrailMatches = result.matches;
        }
      } catch (err) {
        if (err instanceof GuardrailError) throw err;
        // Non-JSON body or missing messages - skip guardrail evaluation
      }
    }

    // 5b. Content-based routing: evaluate routing rules to potentially switch model
    let finalBodyText = bodyText;
    if (bodyText) {
      try {
        const parsed = JSON.parse(bodyText);
        if (typeof parsed.model === "string") {
          const routingResult = await evaluateRoutingRules(
            db,
            virtualKey.organizationId,
            parsed.model,
            parsed
          );
          if (routingResult.ruleApplied) {
            parsed.model = routingResult.model;
            finalBodyText = JSON.stringify(parsed);
          }
        }
      } catch {
        // Non-JSON or missing model, skip content routing
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

    // 7. Parse request body for cache lookup
    let requestBody: Record<string, unknown> = {};
    if (bodyText) {
      try {
        requestBody = JSON.parse(bodyText);
      } catch {
        requestBody = {};
      }
    }

    // 8. Check cache before forwarding
    const cacheResult = await checkCache(redis, providerName, requestBody);

    if (cacheResult.hit) {
      const latencyMs = Date.now() - startTime;
      const requestedModel = (requestBody.model as string) ?? "unknown";

      const cacheAnalysis = analyzeContent(
        requestBody,
        c.req.header("x-session-id")
      );
      const logData = {
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
        sessionId: cacheAnalysis.sessionId,
        statusCode: 200,
        toolCount: cacheAnalysis.toolCount,
        toolNames: cacheAnalysis.toolNames,
        virtualKeyId: virtualKey.id
      };

      const { inputTokens, outputTokens } = extractTokenUsage(
        cacheResult.parsed
      );
      const model = extractModel(cacheResult.parsed, requestedModel);
      logData.inputTokens = inputTokens;
      logData.outputTokens = outputTokens;
      logData.model = model;

      logAndPublish(db, logData, { redis, teamId: virtualKey.teamId });
      updateLastUsed(db, virtualKey.id);

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

    // 9. Forward request with retry logic
    const forwardInput = {
      adapter,
      body: finalBodyText,
      decryptedApiKey,
      incomingHeaders: c.req.header(),
      method,
      rawUrl: c.req.url,
      upstreamPath
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
      const { inputTokens, outputTokens } = extractTokenUsage(
        proxyResponse.body
      );
      const model = extractModel(
        proxyResponse.body,
        upstreamResult.requestedModel
      );
      logData.inputTokens = inputTokens;
      logData.outputTokens = outputTokens;
      logData.model = model;
      logData.cost = adapter.estimateCost(model, inputTokens, outputTokens);

      // Analyze response for tool calls
      const responseAnalysis = analyzeResponse(proxyResponse.body);
      if (responseAnalysis.hasToolCalls) {
        logData.hasToolUse = true;
        logData.toolCount += responseAnalysis.toolCallCount;
        logData.toolNames.push(...responseAnalysis.toolCallNames);
      }

      // Cache successful non-streaming responses
      if (upstreamResult.response.ok) {
        void storeCache(
          redis,
          finalProviderName,
          requestBody,
          proxyResponse.text
        );
      }

      logAndPublish(db, logData, { redis, teamId: virtualKey.teamId });
      updateLastUsed(db, virtualKey.id);

      // Track latency and cost for routing strategies
      void updateLatency(redis, finalProviderConfigId, latencyMs);
      void updateCost(redis, finalProviderConfigId, logData.cost);

      return new Response(proxyResponse.text, {
        headers: proxyResponse.headers,
        status: proxyResponse.response.status
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
        const { inputTokens, outputTokens } = accumulator.getUsage();
        const model =
          accumulator.getModel() !== "unknown"
            ? accumulator.getModel()
            : upstreamResult.requestedModel;
        logData.inputTokens = inputTokens;
        logData.outputTokens = outputTokens;
        logData.model = model;
        logData.cost = adapter.estimateCost(model, inputTokens, outputTokens);

        logAndPublish(db, logData, { redis, teamId: virtualKey.teamId });
        updateLastUsed(db, virtualKey.id);

        void updateLatency(redis, finalProviderConfigId, latencyMs);
        void updateCost(redis, finalProviderConfigId, logData.cost);
      },
      transform(chunk, controller) {
        controller.enqueue(chunk);

        // Decode the chunk and process SSE lines
        const text = new TextDecoder().decode(chunk);
        const combined = partialLine + text;
        const lines = combined.split("\n");

        // Last element may be incomplete; keep it for next chunk
        partialLine = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            accumulator.processChunk(trimmed);
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
