import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { models } from "@raven/db";
import { generateText, jsonSchema, streamText, type ToolSet, tool } from "ai";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import { cachedQuery } from "@/lib/cache-utils";
import { ForbiddenError, GuardrailError } from "@/lib/errors";
import { PROVIDERS } from "@/lib/providers";
import {
  createProviderModel,
  filterPassthroughHeaders
} from "./ai-provider-factory";
import { authenticateKey } from "./auth";
import { checkBudgets } from "./budget-check";
import { checkCache, storeCache } from "./cache";
import { analyzeContent } from "./content-analyzer";
import { evaluateRoutingRules } from "./content-router";
import { estimateCost } from "./cost-estimator";
import { getFallbackProviders } from "./fallback";
import { evaluateGuardrails, type GuardrailMatch } from "./guardrails";
import { updateMetrics } from "./latency-tracker";
import { logAndPublish, updateLastUsed } from "./logger";
import { checkPlanLimit } from "./plan-check";
import { resolveProvider } from "./provider-resolver";
import { checkRateLimit } from "./rate-limiter";
import { parseIncomingRequest } from "./request-parser";
import { analyzeResponse } from "./response-analyzer";
import {
  formatBufferedResponse,
  formatErrorResponse,
  formatStreamingResponse
} from "./response-formatter";
import { extractCachedUsage, extractModel } from "./usage-mapper";

// ---------------------------------------------------------------------------
// Log sanitization (strip base64 images before storing)
// ---------------------------------------------------------------------------

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
        if (src && src.type === "base64") return true;
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
      if (b.type === "image_url") {
        const img = b.image_url as Record<string, unknown> | undefined;
        if (img && typeof img.url === "string" && img.url.startsWith("data:")) {
          img.url = "[base64 image stripped]";
        }
      }
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

// ---------------------------------------------------------------------------
// AI SDK parameter builder
// ---------------------------------------------------------------------------

const buildAiSdkTools = (
  tools:
    | Record<
        string,
        { description?: string; parameters: Record<string, unknown> }
      >
    | undefined
) => {
  if (!tools) return undefined;

  return Object.fromEntries(
    Object.entries(tools).map(([name, def]) => [
      name,
      tool({
        description: def.description,
        parameters: jsonSchema(def.parameters)
      })
    ])
  );
};

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

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

    const domainOrgId = c.get("domainOrgId") as string | undefined;
    if (domainOrgId && virtualKey.organizationId !== domainOrgId) {
      throw new ForbiddenError(
        "Virtual key does not belong to this domain's organization"
      );
    }

    // 2-4. Gate checks in parallel
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

    // 5. Parse body
    const method = c.req.method;
    const hasBody = method !== "GET" && method !== "HEAD";
    const bodyText = hasBody ? await c.req.text() : undefined;

    let parsedBody: Record<string, unknown> = {};
    if (bodyText) {
      try {
        parsedBody = JSON.parse(bodyText);
      } catch {
        // Non-JSON body
      }
    }

    let guardrailWarnings: string[] = [];
    let guardrailMatches: GuardrailMatch[] = [];

    // 5a-5b. Guardrails and content routing in parallel
    const messages = Array.isArray(parsedBody.messages)
      ? parsedBody.messages
      : [];
    const hasMessages =
      Object.keys(parsedBody).length > 0 && messages.length > 0;
    const hasModel = typeof parsedBody.model === "string";

    const [guardrailResult, routingResult] = await Promise.all([
      hasMessages
        ? evaluateGuardrails(
            db,
            virtualKey.organizationId,
            messages,
            redis
          ).catch((err: unknown) => {
            if (err instanceof GuardrailError) throw err;
            return null;
          })
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
    }

    // 5c. Validate model
    const requestedModelSlug = parsedBody.model as string | undefined;
    if (requestedModelSlug) {
      const allowedModel = await cachedQuery(
        redis,
        `model:${requestedModelSlug}`,
        300,
        async () => {
          const [row] = await db
            .select({ id: models.id })
            .from(models)
            .where(eq(models.slug, requestedModelSlug))
            .limit(1);
          return row ?? null;
        }
      );

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

    // 6. Resolve provider credentials
    const { decryptedApiKey, providerConfigId, providerName, upstreamPath } =
      await resolveProvider(
        db,
        env,
        virtualKey.organizationId,
        c.req.path,
        redis
      );

    const requestBody = parsedBody;
    const requestedModel = (requestBody.model as string) ?? "unknown";

    // 7. Check cache
    const cacheResult = await checkCache(
      redis,
      virtualKey.organizationId,
      providerName,
      requestBody
    );

    if (cacheResult.hit) {
      const latencyMs = Date.now() - startTime;
      const cacheAnalysis = analyzeContent(
        requestBody,
        c.req.header("x-session-id")
      );

      const usage = extractCachedUsage(cacheResult.parsed);
      const model = extractModel(cacheResult.parsed, requestedModel);

      logAndPublish(
        db,
        {
          cachedTokens: usage.cachedTokens,
          cacheHit: true,
          cost: 0,
          guardrailMatches:
            guardrailMatches.length > 0 ? guardrailMatches : undefined,
          hasImages: cacheAnalysis.hasImages,
          hasToolUse: cacheAnalysis.hasToolUse,
          imageCount: cacheAnalysis.imageCount,
          inputTokens: usage.inputTokens,
          latencyMs,
          method,
          model,
          organizationId: virtualKey.organizationId,
          outputTokens: usage.outputTokens,
          path: upstreamPath,
          provider: providerName,
          providerConfigId,
          reasoningTokens: usage.reasoningTokens,
          requestBody: sanitizeForLog(requestBody),
          sessionId: cacheAnalysis.sessionId,
          statusCode: 200,
          toolCount: cacheAnalysis.toolCount,
          toolNames: cacheAnalysis.toolNames,
          virtualKeyId: virtualKey.id
        },
        { redis, teamId: virtualKey.teamId }
      );
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

    // 8. Parse request into AI SDK format
    const parsed = parseIncomingRequest(parsedBody, providerName);

    // Guard: n > 1 not supported through AI SDK
    if (parsed.requiresRawProxy) {
      return c.json(
        {
          error: {
            code: "UNSUPPORTED_PARAMETER",
            message:
              'Parameter "n" > 1 is not currently supported. Please send separate requests.'
          }
        },
        400
      );
    }

    // 9. Content analysis for logging
    const sessionHeader = c.req.header("x-session-id");
    const contentAnalysis = analyzeContent(requestBody, sessionHeader);

    // 10. Prepare mutable log data
    let finalProviderConfigId = providerConfigId;
    let finalProviderName = providerName;

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
      latencyMs: 0,
      method,
      model: requestedModel,
      organizationId: virtualKey.organizationId,
      outputTokens: 0,
      path: upstreamPath,
      provider: finalProviderName,
      providerConfigId: finalProviderConfigId,
      reasoningTokens: 0,
      requestBody: sanitizeForLog(requestBody),
      sessionId: contentAnalysis.sessionId,
      statusCode: 200,
      toolCount: contentAnalysis.toolCount,
      toolNames: [...contentAnalysis.toolNames],
      virtualKeyId: virtualKey.id
    };

    // 11. Build AI SDK parameters
    const passthroughHeaders = filterPassthroughHeaders(c.req.header());
    const providerBaseUrl = PROVIDERS[providerName]?.baseUrl;

    const aiModel = createProviderModel(
      {
        apiKey: decryptedApiKey,
        baseUrl: providerBaseUrl,
        headers: passthroughHeaders,
        provider: providerName
      },
      requestedModel
    );

    const aiSdkTools = buildAiSdkTools(parsed.tools);

    const baseParams = {
      frequencyPenalty: parsed.frequencyPenalty,
      maxRetries: 2,
      maxTokens: parsed.maxTokens,
      messages: parsed.messages,
      presencePenalty: parsed.presencePenalty,
      providerOptions: parsed.providerOptions,
      seed: parsed.seed,
      stopSequences: parsed.stopSequences,
      system: parsed.system,
      temperature: parsed.temperature,
      toolChoice: parsed.toolChoice as Parameters<
        typeof streamText
      >[0]["toolChoice"],
      tools: aiSdkTools as ToolSet | undefined,
      topP: parsed.topP
    };

    // DEBUG: log tool schemas to diagnose input_schema.type issue
    if (aiSdkTools) {
      for (const [name, t] of Object.entries(aiSdkTools)) {
        const params = (t as Record<string, unknown>).parameters as Record<string, unknown> | undefined;
        const schema = params?.jsonSchema as Record<string, unknown> | undefined;
        console.log(`[DEBUG] Tool "${name}" schema:`, JSON.stringify(schema));
      }
    }

    // Helper: finalize logging after a successful response
    const finalizeLog = () => {
      logData.latencyMs = Date.now() - startTime;
      logData.provider = finalProviderName;
      logData.providerConfigId = finalProviderConfigId;
      logAndPublish(db, logData, { redis, teamId: virtualKey.teamId });
      updateLastUsed(redis, virtualKey.id);
      void updateMetrics(
        redis,
        finalProviderConfigId,
        logData.latencyMs,
        logData.cost
      );
    };

    // Build guardrail headers
    const guardHeaders: Record<string, string> = {};
    if (guardrailWarnings.length > 0) {
      guardHeaders["X-Guardrail-Warnings"] = guardrailWarnings.join("; ");
    }

    // 12. Execute via AI SDK
    try {
      if (parsed.isStreaming) {
        return executeStreaming(baseParams, aiModel);
      }
      return await executeBuffered(baseParams, aiModel);
    } catch (err) {
      // 13. Attempt fallback on failure
      const fallbacks = await getFallbackProviders(
        db,
        env,
        virtualKey.organizationId,
        providerConfigId,
        providerName
      );

      for (const fb of fallbacks) {
        try {
          const fbModel = createProviderModel(
            {
              apiKey: fb.decryptedApiKey,
              baseUrl: providerBaseUrl,
              headers: passthroughHeaders,
              provider: fb.providerName
            },
            requestedModel
          );

          finalProviderConfigId = fb.providerConfigId;
          finalProviderName = fb.providerName;

          if (parsed.isStreaming) {
            return executeStreaming(baseParams, fbModel);
          }
          return await executeBuffered(baseParams, fbModel);
        } catch (fbErr) {
          console.error(
            `Fallback provider ${fb.providerName} (${fb.providerConfigId}) failed:`,
            fbErr instanceof Error ? fbErr.message : fbErr
          );
        }
      }

      // All attempts failed
      const { body, status } = formatErrorResponse(err);
      logData.latencyMs = Date.now() - startTime;
      logData.statusCode = status;
      logAndPublish(db, logData, { redis, teamId: virtualKey.teamId });
      return new Response(body, {
        headers: { "content-type": "application/json", ...guardHeaders },
        status
      });
    }

    // -- Streaming execution ------------------------------------------

    function executeStreaming(
      params: typeof baseParams,
      model: ReturnType<typeof createProviderModel>
    ): Response {
      const result = streamText({ ...params, model } as Parameters<
        typeof streamText
      >[0]);

      const stream = formatStreamingResponse(
        result.fullStream,
        requestedModel,
        parsed.includeUsage,
        (usage) => {
          logData.inputTokens = usage.inputTokens;
          logData.outputTokens = usage.outputTokens;
          logData.reasoningTokens = usage.reasoningTokens;
          logData.cachedTokens = usage.cachedTokens;
          logData.cost = estimateCost(finalProviderName, logData.model, usage);
          finalizeLog();
        }
      );

      return new Response(stream, {
        headers: {
          "cache-control": "no-cache",
          connection: "keep-alive",
          "content-type": "text/event-stream",
          ...guardHeaders
        },
        status: 200
      });
    }

    // -- Buffered execution -------------------------------------------

    async function executeBuffered(
      params: typeof baseParams,
      model: ReturnType<typeof createProviderModel>
    ): Promise<Response> {
      const result = await generateText({ ...params, model } as Parameters<
        typeof generateText
      >[0]);

      const formatted = formatBufferedResponse(
        {
          finishReason: result.finishReason,
          reasoning: result.reasoning,
          text: result.text,
          toolCalls: result.toolCalls,
          usage: result.usage
        },
        requestedModel
      );

      // Deferred post-processing
      void (() => {
        const responseAnalysis = analyzeResponse(formatted.body);
        if (responseAnalysis.hasToolCalls) {
          logData.hasToolUse = true;
          logData.toolCount += responseAnalysis.toolCallCount;
          logData.toolNames.push(...responseAnalysis.toolCallNames);
        }

        logData.inputTokens = formatted.usage.inputTokens;
        logData.outputTokens = formatted.usage.outputTokens;
        logData.reasoningTokens = formatted.usage.reasoningTokens;
        logData.cachedTokens = formatted.usage.cachedTokens;
        logData.cost = estimateCost(
          finalProviderName,
          logData.model,
          formatted.usage
        );

        void storeCache(
          redis,
          virtualKey.organizationId,
          finalProviderName,
          requestBody,
          formatted.text
        );

        finalizeLog();
      })();

      return new Response(formatted.text, {
        headers: {
          "content-type": "application/json",
          ...guardHeaders
        },
        status: 200
      });
    }
  };
};
