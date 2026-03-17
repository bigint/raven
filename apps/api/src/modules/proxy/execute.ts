import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import type { LanguageModel, ToolSet } from "ai";
import { generateText, jsonSchema, streamText, tool } from "ai";
import type { Redis } from "ioredis";
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
import { updateMetrics } from "./latency-tracker";
import { logAndPublish, updateLastUsed } from "./logger";
import type { ParsedRequest } from "./request-parser";
import { analyzeResponse } from "./response-analyzer";
import {
  formatBufferedResponse,
  formatErrorResponse,
  formatStreamingResponse
} from "./response-formatter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExecuteInput {
  db: Database;
  redis: Redis;
  env: Env;
  startTime: number;
  parsedBody: Record<string, unknown>;
  parsed: ParsedRequest;
  requestedModel: string;
  providerName: string;
  providerConfigId: string;
  decryptedApiKey: string;
  virtualKey: {
    id: string;
    organizationId: string;
    teamId: string | null;
  };
  method: string;
  path: string;
  sessionId: string | null;
  guardrailWarnings: string[];
  guardrailMatches: GuardrailMatch[];
  incomingHeaders: Record<string, string>;
  extraResponseHeaders?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Log sanitization
// ---------------------------------------------------------------------------

const sanitizeForLog = (
  body: Record<string, unknown>
): Record<string, unknown> => {
  const messages = body.messages;
  if (!Array.isArray(messages)) return body;

  let hasBase64 = false;
  for (const msg of messages) {
    const m = msg as Record<string, unknown>;
    if (!Array.isArray(m.content)) continue;
    for (const block of m.content) {
      const b = block as Record<string, unknown>;
      if (
        b.type === "image_url" &&
        typeof (b.image_url as Record<string, unknown>)?.url === "string" &&
        ((b.image_url as Record<string, unknown>).url as string).startsWith(
          "data:"
        )
      ) {
        hasBase64 = true;
        break;
      }
      if (
        b.type === "image" &&
        (b.source as Record<string, unknown>)?.type === "base64"
      ) {
        hasBase64 = true;
        break;
      }
    }
    if (hasBase64) break;
  }

  if (!hasBase64) return body;

  const clone = structuredClone(body);
  for (const msg of clone.messages as Record<string, unknown>[]) {
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
        if (src?.type === "base64") src.data = "[base64 image stripped]";
      }
    }
  }
  return clone;
};

// ---------------------------------------------------------------------------
// Tool building
// ---------------------------------------------------------------------------

const buildTools = (tools: ParsedRequest["tools"]): ToolSet | undefined => {
  if (!tools) return undefined;

  return Object.fromEntries(
    Object.entries(tools).map(([name, def]) => [
      name,
      tool({
        description: def.description,
        parameters: jsonSchema({
          type: "object",
          ...def.parameters
        })
      })
    ])
  ) as ToolSet;
};

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

export const execute = async (input: ExecuteInput): Promise<Response> => {
  const {
    db,
    redis,
    env,
    startTime,
    parsedBody,
    parsed,
    requestedModel,
    providerName,
    providerConfigId,
    decryptedApiKey,
    virtualKey,
    method,
    path,
    sessionId,
    guardrailWarnings,
    guardrailMatches,
    incomingHeaders,
    extraResponseHeaders
  } = input;

  const contentAnalysis = analyzeContent(parsedBody, sessionId);

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
    path,
    provider: finalProviderName,
    providerConfigId: finalProviderConfigId,
    reasoningTokens: 0,
    requestBody: sanitizeForLog(parsedBody),
    sessionId: contentAnalysis.sessionId,
    statusCode: 200,
    toolCount: contentAnalysis.toolCount,
    toolNames: [...contentAnalysis.toolNames],
    virtualKeyId: virtualKey.id
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

  // Build headers
  const guardHeaders: Record<string, string> = {};
  if (guardrailWarnings.length > 0) {
    guardHeaders["X-Guardrail-Warnings"] = guardrailWarnings.join("; ");
  }

  const responseHeaders = { ...guardHeaders, ...extraResponseHeaders };

  // Build AI SDK params
  const passthroughHeaders = filterPassthroughHeaders(incomingHeaders);
  const providerBaseUrl = PROVIDERS[providerName]?.baseUrl;

  const makeModel = (apiKey: string, provider: string) =>
    createProviderModel(
      {
        apiKey,
        baseUrl: providerBaseUrl,
        headers: passthroughHeaders,
        provider
      },
      requestedModel
    );

  const aiModel = makeModel(decryptedApiKey, providerName);
  const aiTools = buildTools(parsed.tools);

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
    tools: aiTools,
    topP: parsed.topP
  };

  // Attempt execution with primary, then fallbacks
  const tryExecute = (model: LanguageModel): Response | Promise<Response> =>
    parsed.isStreaming ? doStream(model) : doBuffered(model);

  try {
    return await tryExecute(aiModel);
  } catch (err) {
    const fallbacks = await getFallbackProviders(
      db,
      env,
      virtualKey.organizationId,
      providerConfigId,
      providerName
    );

    for (const fb of fallbacks) {
      try {
        finalProviderConfigId = fb.providerConfigId;
        finalProviderName = fb.providerName;
        return await tryExecute(makeModel(fb.decryptedApiKey, fb.providerName));
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

    return new Response(formatted.text, {
      headers: { "content-type": "application/json", ...responseHeaders },
      status: 200
    });
  }
};
