import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { models } from "@raven/db";
import { generateText, jsonSchema, streamText, type ToolSet, tool } from "ai";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { PROVIDERS } from "@/lib/providers";
import {
  createProviderModel,
  filterPassthroughHeaders
} from "../proxy/ai-provider-factory";
import { authenticateKey } from "../proxy/auth";
import { checkBudgets } from "../proxy/budget-check";
import { checkCache, storeCache } from "../proxy/cache";
import { analyzeContent } from "../proxy/content-analyzer";
import { estimateCost } from "../proxy/cost-estimator";
import { getFallbackProviders } from "../proxy/fallback";
import { evaluateGuardrails, type GuardrailMatch } from "../proxy/guardrails";
import { updateMetrics } from "../proxy/latency-tracker";
import { logAndPublish, updateLastUsed } from "../proxy/logger";
import { checkPlanLimit } from "../proxy/plan-check";
import { resolveProvider } from "../proxy/provider-resolver";
import { checkRateLimit } from "../proxy/rate-limiter";
import { parseIncomingRequest } from "../proxy/request-parser";
import { analyzeResponse } from "../proxy/response-analyzer";
import {
  formatBufferedResponse,
  formatErrorResponse,
  formatStreamingResponse
} from "../proxy/response-formatter";
import { extractCachedUsage } from "../proxy/usage-mapper";

// Model → provider cache with 5-minute TTL
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
  setTimeout(() => modelProviderCache.delete(modelSlug), 300_000);
  return model.provider;
};

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

export const chatCompletionsHandler = (
  db: Database,
  redis: Redis,
  env: Env
) => {
  return async (c: Context): Promise<Response> => {
    const startTime = Date.now();

    // 1. Auth
    const authHeader = c.req.header("Authorization") ?? "";
    const { virtualKey } = await authenticateKey(db, authHeader, redis);

    // 2. Parse body
    const bodyText = await c.req.text();
    let parsedBody: Record<string, unknown> = {};
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      throw new ValidationError("Invalid JSON body");
    }

    const modelSlug = parsedBody.model as string;
    if (!modelSlug) throw new ValidationError("'model' field is required");

    // 3. Resolve provider from model
    const providerName = await resolveModelProvider(db, modelSlug);

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
    const { decryptedApiKey, providerConfigId } = await resolveProvider(
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
      const usage = extractCachedUsage(cacheResult.parsed);

      logAndPublish(
        db,
        {
          cachedTokens: usage.cachedTokens,
          cacheHit: true,
          cost: 0,
          guardrailMatches:
            guardrailMatches.length > 0 ? guardrailMatches : undefined,
          hasImages: contentAnalysis.hasImages,
          hasToolUse: contentAnalysis.hasToolUse,
          imageCount: contentAnalysis.imageCount,
          inputTokens: usage.inputTokens,
          latencyMs,
          method: "POST",
          model: modelSlug,
          organizationId: virtualKey.organizationId,
          outputTokens: usage.outputTokens,
          path: "/v1/chat/completions",
          provider: providerName,
          providerConfigId,
          reasoningTokens: usage.reasoningTokens,
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

    // 8. Parse request into AI SDK format
    const parsed = parseIncomingRequest(parsedBody, providerName);

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
    const contentAnalysis = analyzeContent(
      parsedBody,
      c.req.header("x-session-id")
    );

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
      statusCode: 200,
      toolCount: contentAnalysis.toolCount,
      toolNames: [...contentAnalysis.toolNames],
      virtualKeyId: virtualKey.id
    };

    // 10. Build AI SDK model + params
    const passthroughHeaders = filterPassthroughHeaders(c.req.header());
    const providerBaseUrl = PROVIDERS[providerName]?.baseUrl;

    const aiModel = createProviderModel(
      {
        apiKey: decryptedApiKey,
        baseUrl: providerBaseUrl,
        headers: passthroughHeaders,
        provider: providerName
      },
      modelSlug
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

    const guardHeaders: Record<string, string> = {};
    if (guardrailWarnings.length > 0) {
      guardHeaders["X-Guardrail-Warnings"] = guardrailWarnings.join("; ");
    }

    const ravenHeaders = {
      "X-Raven-Latency-Ms": "",
      "X-Raven-Model": modelSlug,
      "X-Raven-Provider": finalProviderName
    };

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

    // 11. Execute via AI SDK
    try {
      if (parsed.isStreaming) {
        return executeStreaming(baseParams, aiModel);
      }
      return await executeBuffered(baseParams, aiModel);
    } catch (err) {
      // Fallback
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
            modelSlug
          );

          finalProviderConfigId = fb.providerConfigId;
          finalProviderName = fb.providerName;
          ravenHeaders["X-Raven-Provider"] = finalProviderName;

          if (parsed.isStreaming) {
            return executeStreaming(baseParams, fbModel);
          }
          return await executeBuffered(baseParams, fbModel);
        } catch (fbErr) {
          console.error(
            `Fallback ${fb.providerName} (${fb.providerConfigId}) failed:`,
            fbErr instanceof Error ? fbErr.message : fbErr
          );
        }
      }

      const { body, status } = formatErrorResponse(err);
      logData.latencyMs = Date.now() - startTime;
      logData.statusCode = status;
      logAndPublish(db, logData, { redis, teamId: virtualKey.teamId });
      return new Response(body, {
        headers: { "content-type": "application/json", ...guardHeaders },
        status
      });
    }

    function executeStreaming(
      params: typeof baseParams,
      model: ReturnType<typeof createProviderModel>
    ): Response {
      const result = streamText({ ...params, model } as Parameters<
        typeof streamText
      >[0]);

      const stream = formatStreamingResponse(
        result.fullStream,
        modelSlug,
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

      ravenHeaders["X-Raven-Latency-Ms"] = String(Date.now() - startTime);

      return new Response(stream, {
        headers: {
          "cache-control": "no-cache",
          connection: "keep-alive",
          "content-type": "text/event-stream",
          ...guardHeaders,
          ...ravenHeaders
        },
        status: 200
      });
    }

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
        modelSlug
      );

      void (() => {
        const respAnalysis = analyzeResponse(formatted.body);
        if (respAnalysis.hasToolCalls) {
          logData.hasToolUse = true;
          logData.toolCount += respAnalysis.toolCallCount;
          logData.toolNames.push(...respAnalysis.toolCallNames);
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
          parsedBody,
          formatted.text
        );

        finalizeLog();
      })();

      ravenHeaders["X-Raven-Latency-Ms"] = String(Date.now() - startTime);

      return new Response(formatted.text, {
        headers: {
          "content-type": "application/json",
          ...guardHeaders,
          ...ravenHeaders
        },
        status: 200
      });
    }
  };
};
