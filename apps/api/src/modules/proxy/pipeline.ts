import type { Env } from "@raven/config";
import { MODEL_CATALOG } from "@raven/data";
import type { Database } from "@raven/db";
import type { Redis } from "ioredis";
import { GuardrailError, ValidationError } from "@/lib/errors";
import { authenticateKey } from "./auth";
import { checkBudgets } from "./budget-check";
import { checkCache, serveCacheHit } from "./cache";
import { evaluateRoutingRules } from "./content-router";
import { execute } from "./execute";
import { evaluateGuardrails } from "./guardrails";
import { parseProviderFromPath, resolveProvider } from "./provider-resolver";
import { checkRateLimit } from "./rate-limiter";
import { parseIncomingRequest } from "./request-parser";

interface PipelineInput {
  readonly db: Database;
  readonly redis: Redis;
  readonly env: Env;
  readonly authHeader: string;
  readonly method: string;
  readonly path: string;
  readonly bodyText: string | undefined;
  readonly sessionId: string | null;
  readonly userAgent: string | null;
  readonly userIdHeader: string | undefined;
  readonly incomingHeaders: Readonly<Record<string, string>>;
  readonly extraResponseHeaders?: Readonly<Record<string, string>>;
  readonly providerPath: string;
  readonly upstreamPathOverride?: string;
  readonly skipRouting?: boolean;
  readonly strictBody?: boolean;
}

export const runPipeline = async (
  input: PipelineInput
): Promise<Response> => {
  const startTime = Date.now();

  // 1. Auth
  const { virtualKey } = await authenticateKey(
    input.db,
    input.authHeader,
    input.redis
  );

  // 2. Gate checks + body parse
  await Promise.all([
    checkRateLimit(
      input.redis,
      virtualKey.id,
      virtualKey.rateLimitRpm,
      virtualKey.rateLimitRpd
    ),
    checkBudgets(input.db, input.redis, virtualKey.id)
  ]);

  // 3. Parse body
  let parsedBody: Record<string, unknown> = {};
  if (input.bodyText) {
    try {
      parsedBody = JSON.parse(input.bodyText);
    } catch {
      if (input.strictBody) {
        throw new ValidationError("Invalid JSON body");
      }
    }
  }

  // 4. Extract end-user identity
  const endUser =
    (input.userIdHeader as string | undefined) ??
    (typeof parsedBody.user === "string" ? parsedBody.user : null) ??
    (typeof (parsedBody.metadata as Record<string, unknown> | undefined)
      ?.user_id === "string"
      ? ((parsedBody.metadata as Record<string, unknown>).user_id as string)
      : null);

  // 5. Guardrails + content routing
  const messages = Array.isArray(parsedBody.messages)
    ? parsedBody.messages
    : [];
  const hasMessages =
    Object.keys(parsedBody).length > 0 && messages.length > 0;
  const hasModel = typeof parsedBody.model === "string";

  if (hasModel && !MODEL_CATALOG[parsedBody.model as string]) {
    return Response.json(
      {
        error: {
          code: "UNSUPPORTED_MODEL",
          message: `Model '${parsedBody.model}' is not supported. Use /v1/models to see available models.`
        }
      },
      { status: 400 }
    );
  }

  const [guardrailResult, routingResult] = await Promise.all([
    hasMessages
      ? evaluateGuardrails(input.db, messages, input.redis).catch(
          (err: unknown) => {
            if (err instanceof GuardrailError) throw err;
            return null;
          }
        )
      : null,
    hasModel && !input.skipRouting
      ? evaluateRoutingRules(input.db, parsedBody.model as string, parsedBody)
      : null
  ]);

  const guardrailWarnings = guardrailResult?.warnings ?? [];
  const guardrailMatches = guardrailResult?.matches ?? [];

  if (routingResult?.ruleApplied) {
    parsedBody = { ...parsedBody, model: routingResult.model };
  }

  // 6. Cache check + provider resolution in parallel
  const { providerName: pathProvider } = parseProviderFromPath(
    input.providerPath
  );

  const [cacheResult, providerResolution] = await Promise.all([
    checkCache(input.redis, pathProvider, parsedBody),
    resolveProvider(input.db, input.env, input.providerPath, input.redis)
  ]);

  const {
    decryptedApiKey,
    providerConfigId,
    providerConfigName,
    providerName,
    upstreamPath
  } = providerResolution;
  const resolvedPath = input.upstreamPathOverride ?? upstreamPath;
  const requestedModel = (parsedBody.model as string) ?? "unknown";

  if (cacheResult.hit) {
    return serveCacheHit(input.db, cacheResult, {
      endUser,
      guardrailMatches,
      guardrailWarnings,
      method: input.method,
      model: requestedModel,
      parsedBody,
      path: resolvedPath,
      providerConfigId,
      providerConfigName,
      providerName,
      redis: input.redis,
      sessionHeader: input.sessionId,
      startTime,
      userAgent: input.userAgent,
      virtualKeyId: virtualKey.id
    });
  }

  // 7. Parse + execute
  const parsed = parseIncomingRequest(parsedBody, providerName);

  if (parsed.requiresRawProxy) {
    return Response.json(
      {
        error: {
          code: "UNSUPPORTED_PARAMETER",
          message:
            'Parameter "n" > 1 is not currently supported. Please send separate requests.'
        }
      },
      { status: 400 }
    );
  }

  return execute({
    db: input.db,
    decryptedApiKey,
    endUser,
    env: input.env,
    extraResponseHeaders: input.extraResponseHeaders,
    guardrailMatches,
    guardrailWarnings,
    incomingHeaders: input.incomingHeaders,
    method: input.method,
    parsed,
    parsedBody,
    path: resolvedPath,
    providerConfigId,
    providerConfigName,
    providerName,
    redis: input.redis,
    requestedModel,
    sessionId: input.sessionId,
    startTime,
    userAgent: input.userAgent,
    virtualKeyId: virtualKey.id
  });
};
