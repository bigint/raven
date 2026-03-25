import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import type { LanguageModel, ToolSet } from "ai";
import { generateText, jsonSchema, streamText, tool } from "ai";
import type { Redis } from "ioredis";
import { log } from "@/lib/logger";
import { PROVIDERS } from "@/lib/providers";
import {
  createProviderModel,
  filterPassthroughHeaders
} from "./ai-provider-factory";
import { storeCache } from "./cache";
import { analyzeContent } from "./content-analyzer";
import { estimateCost } from "./cost-estimator";
import { getFallbackProviders } from "./fallback";
import type { GuardrailMatch } from "./guardrails";
import { updateLastUsed } from "./last-used";
import { updateMetrics } from "./latency-tracker";
import { logAndPublish } from "./logger";
import type { ParsedRequest } from "./request-parser";
import {
  formatBufferedResponse,
  formatErrorResponse,
  formatStreamingResponse
} from "./response-formatter";

const MAX_PROVIDER_RETRIES = 2;

// Types

export interface ExecuteInput {
  readonly db: Database;
  readonly redis: Redis;
  readonly endUser: string | null;
  readonly env: Env;
  readonly startTime: number;
  readonly parsedBody: Record<string, unknown>;
  readonly parsed: ParsedRequest;
  readonly requestedModel: string;
  readonly providerName: string;
  readonly providerConfigId: string;
  readonly providerConfigName: string | null;
  readonly decryptedApiKey: string;
  readonly virtualKeyId: string;
  readonly method: string;
  readonly path: string;
  readonly sessionId: string | null;
  readonly userAgent: string | null;
  readonly guardrailWarnings: readonly string[];
  readonly guardrailMatches: readonly GuardrailMatch[];
  readonly incomingHeaders: Readonly<Record<string, string>>;
  readonly extraResponseHeaders?: Readonly<Record<string, string>>;
  readonly requestTimeoutMs: number;
  readonly logRequestBodies: boolean;
  readonly logResponseBodies: boolean;
  readonly bodyText?: string;
}

// Tool building

const buildTools = (tools: ParsedRequest["tools"]): ToolSet | undefined => {
  if (!tools) return undefined;

  return Object.fromEntries(
    Object.entries(tools).map(([name, def]) => [
      name,
      tool({
        description: def.description,
        inputSchema: jsonSchema({
          type: "object",
          ...def.parameters
        })
      })
    ])
  ) as ToolSet;
};

// Execute

export const execute = async (input: ExecuteInput): Promise<Response> => {
  const {
    bodyText,
    db,
    redis,
    endUser,
    env,
    startTime,
    parsedBody,
    parsed,
    requestedModel,
    providerName,
    providerConfigId,
    providerConfigName,
    decryptedApiKey,
    virtualKeyId,
    method,
    path,
    sessionId,
    userAgent,
    guardrailWarnings,
    guardrailMatches,
    incomingHeaders,
    extraResponseHeaders,
    requestTimeoutMs,
    logRequestBodies,
    logResponseBodies
  } = input;

  const contentAnalysis = analyzeContent(parsedBody, sessionId);

  // Track active provider via a mutable ref — updated on fallback
  const activeProvider = {
    configId: providerConfigId,
    configName: providerConfigName,
    name: providerName
  };

  const baseLogData = {
    cacheHit: false,
    endUser,
    guardrailMatches:
      guardrailMatches.length > 0 ? guardrailMatches : undefined,
    hasImages: contentAnalysis.hasImages,
    hasToolUse: contentAnalysis.hasToolUse,
    imageCount: contentAnalysis.imageCount,
    method,
    model: requestedModel,
    path,
    sessionId: contentAnalysis.sessionId,
    statusCode: 200,
    toolCount: contentAnalysis.toolCount,
    toolNames: [...contentAnalysis.toolNames],
    userAgent,
    virtualKeyId
  };

  const finalizeLog = (usage: {
    cachedTokens: number;
    cost: number;
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    hasToolUse?: boolean;
    toolCount?: number;
    toolNames?: readonly string[];
    responseText?: string;
  }) => {
    const latencyMs = Date.now() - startTime;
    const logEntry = {
      ...baseLogData,
      cachedTokens: usage.cachedTokens,
      cost: usage.cost,
      hasToolUse: usage.hasToolUse ?? baseLogData.hasToolUse,
      inputTokens: usage.inputTokens,
      latencyMs,
      outputTokens: usage.outputTokens,
      provider: activeProvider.name,
      providerConfigId: activeProvider.configId,
      providerConfigName: activeProvider.configName,
      reasoningTokens: usage.reasoningTokens,
      requestBody: logRequestBodies ? bodyText : undefined,
      responseBody:
        logResponseBodies && usage.responseText
          ? usage.responseText
          : undefined,
      toolCount: usage.toolCount ?? baseLogData.toolCount,
      toolNames: usage.toolNames
        ? [...baseLogData.toolNames, ...usage.toolNames]
        : baseLogData.toolNames
    };
    logAndPublish(db, logEntry, { redis });
    updateLastUsed(redis, virtualKeyId);
    void updateMetrics(redis, activeProvider.configId, latencyMs, usage.cost);
  };

  // Build headers
  const guardHeaders: Record<string, string> = {};
  if (guardrailWarnings.length > 0) {
    guardHeaders["X-Guardrail-Warnings"] = guardrailWarnings.join("; ");
  }

  const responseHeaders = { ...guardHeaders, ...extraResponseHeaders };

  // Build AI SDK params
  const passthroughHeaders = filterPassthroughHeaders(incomingHeaders);
  const providerBaseUrl = PROVIDERS[providerName]?.baseUrl;

  const makeModel = (apiKey: string, providerSlug: string) =>
    createProviderModel(
      {
        apiKey,
        baseUrl: providerBaseUrl,
        headers: passthroughHeaders,
        provider: providerSlug
      },
      requestedModel
    );

  console.log("[execute] provider=%s model=%s baseUrl=%s", providerName, requestedModel, providerBaseUrl);
  const aiModel = makeModel(decryptedApiKey, providerName);
  const aiTools = buildTools(parsed.tools);

  const baseParams = {
    abortSignal:
      requestTimeoutMs > 0 ? AbortSignal.timeout(requestTimeoutMs) : undefined,
    frequencyPenalty: parsed.frequencyPenalty,
    maxRetries: MAX_PROVIDER_RETRIES,
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
    tools: aiTools,
    topP: parsed.topP
  };

  // Attempt execution with primary, then fallbacks
  const tryExecute = (model: LanguageModel): Response | Promise<Response> =>
    parsed.isStreaming ? doStream(model) : doBuffered(model);

  try {
    console.log("[execute] calling AI SDK, streaming=%s", parsed.isStreaming);
    return await tryExecute(aiModel);
  } catch (err) {
    console.error("[execute] primary provider failed:", err);
    const fallbacks = await getFallbackProviders(
      db,
      env,
      providerConfigId,
      providerName
    );

    for (const fb of fallbacks) {
      try {
        activeProvider.configId = fb.providerConfigId;
        activeProvider.configName = fb.providerConfigName ?? null;
        activeProvider.name = fb.providerName;
        return await tryExecute(makeModel(fb.decryptedApiKey, fb.providerName));
      } catch (fbErr) {
        log.error("Fallback provider failed", fbErr, {
          provider: fb.providerName,
          providerConfigId: fb.providerConfigId
        });
      }
    }

    const { body, status } = formatErrorResponse(err);
    const errorLog = {
      ...baseLogData,
      cachedTokens: 0,
      cost: 0,
      inputTokens: 0,
      latencyMs: Date.now() - startTime,
      outputTokens: 0,
      provider: activeProvider.name,
      providerConfigId: activeProvider.configId,
      providerConfigName: activeProvider.configName,
      reasoningTokens: 0,
      statusCode: status
    };
    logAndPublish(db, errorLog, { redis });
    return new Response(body, {
      headers: { "content-type": "application/json", ...responseHeaders },
      status
    });
  }

  // -- Streaming --------------------------------------------------------

  function doStream(model: LanguageModel): Response {
    const result = streamText({ ...baseParams, model } as Parameters<
      typeof streamText
    >[0]);

    const stream = formatStreamingResponse(
      result.fullStream,
      requestedModel,
      parsed.includeUsage,
      (usage) => {
        finalizeLog({
          cachedTokens: usage.cachedTokens,
          cost: estimateCost(requestedModel, usage),
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          reasoningTokens: usage.reasoningTokens
        });
      }
    );

    return new Response(stream, {
      headers: {
        "cache-control": "no-cache",
        connection: "keep-alive",
        "content-type": "text/event-stream",
        ...responseHeaders
      },
      status: 200
    });
  }

  // -- Buffered ---------------------------------------------------------

  async function doBuffered(model: LanguageModel): Promise<Response> {
    const result = await generateText({ ...baseParams, model } as Parameters<
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

    void (() => {
      const toolCallNames = result.toolCalls?.length
        ? result.toolCalls.map((tc) => tc.toolName)
        : undefined;

      finalizeLog({
        cachedTokens: formatted.usage.cachedTokens,
        cost: estimateCost(requestedModel, formatted.usage),
        hasToolUse: result.toolCalls?.length ? true : undefined,
        inputTokens: formatted.usage.inputTokens,
        outputTokens: formatted.usage.outputTokens,
        reasoningTokens: formatted.usage.reasoningTokens,
        responseText: formatted.text,
        toolCount: result.toolCalls?.length
          ? baseLogData.toolCount + result.toolCalls.length
          : undefined,
        toolNames: toolCallNames
      });

      void storeCache(redis, activeProvider.name, parsedBody, formatted.text);
    })();

    return new Response(formatted.text, {
      headers: { "content-type": "application/json", ...responseHeaders },
      status: 200
    });
  }
};
