import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { models } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { authenticateKey } from "../proxy/auth";
import { checkBudgets } from "../proxy/budget-check";
import { checkCache, storeCache } from "../proxy/cache";
import { analyzeContent } from "../proxy/content-analyzer";
import { withFallback } from "../proxy/fallback";
import { evaluateGuardrails, type GuardrailMatch } from "../proxy/guardrails";
import { updateMetrics } from "../proxy/latency-tracker";
import { logAndPublish, updateLastUsed } from "../proxy/logger";
import { checkPlanLimit } from "../proxy/plan-check";
import { resolveProvider } from "../proxy/provider-resolver";
import { checkRateLimit } from "../proxy/rate-limiter";
import { buildResponse } from "../proxy/response";
import { analyzeResponse } from "../proxy/response-analyzer";
import { withRetry } from "../proxy/retry";
import {
  extractModel,
  extractTokenUsage,
  StreamTokenAccumulator
} from "../proxy/token-usage";
import { forwardRequest } from "../proxy/upstream";

// Maps model slugs to provider names. Cached in memory for performance.
const modelProviderCache = new Map<string, string>();

const resolveModelProvider = async (
  db: Database,
  modelSlug: string
): Promise<string> => {
  const cached = modelProviderCache.get(modelSlug);
  if (cached) return cached;

  const [model] = await db
    .select({ provider: models.provider })
    .from(models)
    .where(eq(models.slug, modelSlug))
    .limit(1);

  if (!model) {
    throw new NotFoundError(
      `Model "${modelSlug}" not found. Use GET /v1/models to see available models.`
    );
  }

  modelProviderCache.set(modelSlug, model.provider);
  // Evict cache after 5 minutes
  setTimeout(() => modelProviderCache.delete(modelSlug), 300_000);
  return model.provider;
};

export const chatCompletionsHandler = (
  db: Database,
  redis: Redis,
  env: Env
) => {
  return async (c: Context): Promise<Response> => {
    const startTime = Date.now();

    // 1. Auth
    const authHeader = c.req.header("Authorization") ?? "";
    console.log("[openai-compat] Auth header present:", !!authHeader, "starts with Bearer:", authHeader.startsWith("Bearer "));
    const { virtualKey } = await authenticateKey(db, authHeader, redis);

    // 2. Parse body
    const bodyText = await c.req.text();
    let parsedBody: Record<string, unknown> = {};
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      throw new ValidationError("Invalid JSON body");
    }

    const modelSlug = parsedBody.model as string | undefined;
    console.log("[openai-compat] Model requested:", modelSlug);
    if (!modelSlug) {
      throw new ValidationError("'model' field is required");
    }

    // 3. Resolve provider from model
    let providerName: string;
    try {
      providerName = await resolveModelProvider(db, modelSlug);
      console.log("[openai-compat] Resolved provider:", providerName);
    } catch (err) {
      console.error("[openai-compat] Model resolution failed:", modelSlug, err instanceof Error ? err.message : err);
      throw err;
    }

    // 4. Gate checks
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

    // 5. Guardrails
    const messages = Array.isArray(parsedBody.messages)
      ? parsedBody.messages
      : [];
    let guardrailWarnings: string[] = [];
    let guardrailMatches: GuardrailMatch[] = [];

    if (messages.length > 0) {
      const result = await evaluateGuardrails(
        db,
        virtualKey.organizationId,
        messages
      ).catch(() => null);
      if (result) {
        guardrailWarnings = result.warnings;
        guardrailMatches = result.matches;
      }
    }

    // 6. Resolve provider config
    const fakeProxyPath = `/v1/proxy/${providerName}/chat/completions`;
    const { adapter, decryptedApiKey, providerConfigId } =
      await resolveProvider(
        db,
        env,
        virtualKey.organizationId,
        fakeProxyPath,
        redis
      );

    // 7. Cache check
    const cacheResult = await checkCache(
      redis,
      virtualKey.organizationId,
      providerName,
      parsedBody
    );

    if (cacheResult.hit) {
      const latencyMs = Date.now() - startTime;
      const contentAnalysis = analyzeContent(
        parsedBody,
        c.req.header("x-session-id")
      );
      const { inputTokens, outputTokens, reasoningTokens, cachedTokens } =
        extractTokenUsage(cacheResult.parsed);
      logAndPublish(
        db,
        {
          cachedTokens,
          cacheHit: true,
          cost: 0,
          guardrailMatches:
            guardrailMatches.length > 0 ? guardrailMatches : undefined,
          hasImages: contentAnalysis.hasImages,
          hasToolUse: contentAnalysis.hasToolUse,
          imageCount: contentAnalysis.imageCount,
          inputTokens,
          latencyMs,
          method: "POST",
          model: modelSlug,
          organizationId: virtualKey.organizationId,
          outputTokens,
          path: "/v1/chat/completions",
          provider: providerName,
          providerConfigId,
          reasoningTokens,
          requestBody: parsedBody,
          sessionId: contentAnalysis.sessionId,
          statusCode: 200,
          toolCount: contentAnalysis.toolCount,
          toolNames: contentAnalysis.toolNames,
          virtualKeyId: virtualKey.id
        },
        { redis, teamId: virtualKey.teamId }
      );
      updateLastUsed(redis, virtualKey.id);
      const headers: Record<string, string> = {
        "content-type": "application/json"
      };
      if (guardrailWarnings.length > 0) {
        headers["X-Guardrail-Warnings"] = guardrailWarnings.join("; ");
      }
      return new Response(cacheResult.body, { headers, status: 200 });
    }

    // 8. Normalize request for provider
    let finalBody = parsedBody;
    if (adapter.normalizeRequest)
      finalBody = adapter.normalizeRequest(parsedBody);
    if (adapter.transformBody) finalBody = adapter.transformBody(finalBody);
    const finalBodyText = JSON.stringify(finalBody);

    const resolvedPath = adapter.chatEndpoint;

    // 9. Forward with retry
    const forwardInput = {
      adapter,
      body: finalBodyText,
      decryptedApiKey,
      incomingHeaders: c.req.header(),
      method: "POST",
      rawUrl: c.req.url,
      upstreamPath: resolvedPath
    };

    let upstreamResult = await withRetry(() => forwardRequest(forwardInput));
    let finalProviderConfigId = providerConfigId;
    let finalProviderName = providerName;

    console.log("[openai-compat] Upstream response:", upstreamResult.response.status, upstreamResult.response.statusText);
    if (!upstreamResult.response.ok) {
      const errBody = await upstreamResult.response.clone().text().catch(() => "");
      console.error("[openai-compat] Upstream error body:", errBody.slice(0, 500));
    }

    // 10. Fallback
    if (!upstreamResult.response.ok) {
      const fallbackResult = await withFallback(
        db,
        env,
        virtualKey.organizationId,
        providerConfigId,
        (overrides) =>
          withRetry(() => forwardRequest({ ...forwardInput, ...overrides }))
      );
      if (fallbackResult) {
        upstreamResult = fallbackResult.result;
        finalProviderConfigId = fallbackResult.providerConfigId;
        finalProviderName = fallbackResult.providerName;
      }
    }

    const latencyMs = Date.now() - startTime;
    const proxyResponse = await buildResponse(
      upstreamResult.response,
      upstreamResult.isStreaming
    );
    const contentAnalysis = analyzeContent(
      parsedBody,
      c.req.header("x-session-id")
    );

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
      method: "POST",
      model: modelSlug,
      organizationId: virtualKey.organizationId,
      outputTokens: 0,
      path: "/v1/chat/completions",
      provider: finalProviderName,
      providerConfigId: finalProviderConfigId,
      reasoningTokens: 0,
      requestBody: parsedBody,
      sessionId: contentAnalysis.sessionId,
      statusCode: upstreamResult.response.status,
      toolCount: contentAnalysis.toolCount,
      toolNames: [...contentAnalysis.toolNames],
      virtualKeyId: virtualKey.id
    };

    if (guardrailWarnings.length > 0) {
      proxyResponse.headers["X-Guardrail-Warnings"] =
        guardrailWarnings.join("; ");
    }

    // Add Raven-specific headers
    proxyResponse.headers["X-Raven-Provider"] = finalProviderName;
    proxyResponse.headers["X-Raven-Model"] = modelSlug;
    proxyResponse.headers["X-Raven-Latency-Ms"] = String(latencyMs);

    if (proxyResponse.kind === "buffered") {
      const responseStatus = proxyResponse.response.status;
      const responseOk = upstreamResult.response.ok;
      const responseText = proxyResponse.text;
      const responseBody = proxyResponse.body;

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
        const model = extractModel(responseBody, modelSlug);
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

        const respAnalysis = analyzeResponse(responseBody);
        if (respAnalysis.hasToolCalls) {
          logData.hasToolUse = true;
          logData.toolCount += respAnalysis.toolCallCount;
          logData.toolNames.push(...respAnalysis.toolCallNames);
        }

        if (responseOk) {
          void storeCache(
            redis,
            virtualKey.organizationId,
            finalProviderName,
            parsedBody,
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

    // Streaming
    const accumulator = new StreamTokenAccumulator();
    let partialLine = "";

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      flush() {
        if (partialLine) accumulator.processChunk(partialLine);
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
            ? modelSlug
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
            if (trimmed) accumulator.processChunk(trimmed);
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
