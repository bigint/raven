import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { models } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { authenticateKey } from "../proxy/auth";
import { checkBudgets } from "../proxy/budget-check";
import { checkCache, serveCacheHit } from "../proxy/cache";
import { execute } from "../proxy/execute";
import { evaluateGuardrails, type GuardrailMatch } from "../proxy/guardrails";
import { checkPlanLimit } from "../proxy/plan-check";
import { resolveProvider } from "../proxy/provider-resolver";
import { checkRateLimit } from "../proxy/rate-limiter";
import { parseIncomingRequest } from "../proxy/request-parser";

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

    // Extract end-user identity
    const endUser =
      (c.req.header("x-user-id") as string | undefined) ??
      (typeof parsedBody.user === "string" ? parsedBody.user : null) ??
      (typeof (parsedBody.metadata as Record<string, unknown> | undefined)
        ?.user_id === "string"
        ? ((parsedBody.metadata as Record<string, unknown>).user_id as string)
        : null);

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
      checkBudgets(db, redis, virtualKey.organizationId, virtualKey.id)
    ]);

    // 5–7. Guardrails, provider resolution, and cache check run in parallel
    const messages = Array.isArray(parsedBody.messages)
      ? parsedBody.messages
      : [];

    const fakeProxyPath = `/v1/proxy/${providerName}/chat/completions`;

    const [guardrailResult, providerResult, cacheResult] = await Promise.all([
      messages.length > 0
        ? evaluateGuardrails(
            db,
            virtualKey.organizationId,
            messages
          ).catch(() => null)
        : Promise.resolve(null),
      resolveProvider(
        db,
        env,
        virtualKey.organizationId,
        fakeProxyPath,
        redis
      ),
      checkCache(
        redis,
        virtualKey.organizationId,
        providerName,
        parsedBody
      )
    ]);

    const guardrailWarnings = guardrailResult?.warnings ?? [];
    const guardrailMatches = guardrailResult?.matches ?? [];
    const { decryptedApiKey, providerConfigId, providerConfigName } =
      providerResult;

    if (cacheResult.hit) {
      return serveCacheHit(db, cacheResult, {
        endUser,
        guardrailMatches,
        guardrailWarnings,
        method: "POST",
        model: modelSlug,
        organizationId: virtualKey.organizationId,
        parsedBody,
        path: "/v1/chat/completions",
        providerConfigId,
        providerConfigName,
        providerName,
        redis,
        sessionHeader: c.req.header("x-session-id") ?? null,
        startTime,
        userAgent: c.req.header("user-agent") ?? null,
        virtualKeyId: virtualKey.id
      });
    }

    // 8. Parse + execute
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

    return execute({
      db,
      decryptedApiKey,
      endUser,
      env,
      extraResponseHeaders: {
        "X-Raven-Latency-Ms": String(Date.now() - startTime),
        "X-Raven-Model": modelSlug,
        "X-Raven-Provider": providerName
      },
      guardrailMatches,
      guardrailWarnings,
      incomingHeaders: c.req.header(),
      method: "POST",
      parsed,
      parsedBody,
      path: "/v1/chat/completions",
      providerConfigId,
      providerConfigName,
      providerName,
      redis,
      requestedModel: modelSlug,
      sessionId: c.req.header("x-session-id") ?? null,
      startTime,
      userAgent: c.req.header("user-agent") ?? null,
      virtualKey: {
        id: virtualKey.id,
        organizationId: virtualKey.organizationId
      }
    });
  };
};
