import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { models } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import { cachedQuery } from "@/lib/cache-utils";
import { GuardrailError } from "@/lib/errors";
import { authenticateKey } from "./auth";
import { checkBudgets } from "./budget-check";
import { checkCache, serveCacheHit } from "./cache";
import { evaluateRoutingRules } from "./content-router";
import { execute } from "./execute";
import { evaluateGuardrails, type GuardrailMatch } from "./guardrails";
import { checkPlanLimit } from "./plan-check";
import { parseProviderFromPath, resolveProvider } from "./provider-resolver";
import { checkRateLimit } from "./rate-limiter";
import { parseIncomingRequest } from "./request-parser";

export const proxyHandler = (
  db: Database,
  redis: Redis,
  env: Env
): ((c: Context) => Promise<Response>) => {
  return async (c: Context): Promise<Response> => {
    const startTime = Date.now();

    // 1. Auth
    const authHeader = c.req.header("Authorization") ?? "";
    const { virtualKey } = await authenticateKey(db, authHeader, redis);

    // 2. Gate checks + body parse in parallel
    const method = c.req.method;
    const hasBody = method !== "GET" && method !== "HEAD";
    const [, , , bodyText] = await Promise.all([
      checkRateLimit(
        redis,
        virtualKey.id,
        virtualKey.rateLimitRpm,
        virtualKey.rateLimitRpd
      ),
      checkPlanLimit(db, redis, virtualKey.organizationId),
      checkBudgets(db, redis, virtualKey.organizationId, virtualKey.id),
      hasBody ? c.req.text() : undefined
    ]);

    // 3. Parse body
    let parsedBody: Record<string, unknown> = {};
    if (bodyText) {
      try {
        parsedBody = JSON.parse(bodyText);
      } catch {
        // Non-JSON body
      }
    }

    // 4. Guardrails + content routing
    const messages = Array.isArray(parsedBody.messages)
      ? parsedBody.messages
      : [];
    const hasMessages =
      Object.keys(parsedBody).length > 0 && messages.length > 0;
    const hasModel = typeof parsedBody.model === "string";

    let guardrailWarnings: string[] = [];
    let guardrailMatches: GuardrailMatch[] = [];

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

    // 5. Cache check + model validation + provider resolution in parallel
    const requestedModelSlug = parsedBody.model as string | undefined;
    const { providerName: pathProvider } = parseProviderFromPath(c.req.path);

    const [cacheResult, allowedModel, providerResolution] = await Promise.all([
      checkCache(redis, virtualKey.organizationId, pathProvider, parsedBody),
      requestedModelSlug
        ? cachedQuery(redis, `model:${requestedModelSlug}`, 300, async () => {
            const [row] = await db
              .select({ id: models.id })
              .from(models)
              .where(eq(models.slug, requestedModelSlug))
              .limit(1);
            return row ?? null;
          })
        : null,
      resolveProvider(db, env, virtualKey.organizationId, c.req.path, redis)
    ]);

    const { decryptedApiKey, providerConfigId, providerName, upstreamPath } =
      providerResolution;
    const requestedModel = (parsedBody.model as string) ?? "unknown";

    if (cacheResult.hit) {
      return serveCacheHit(db, cacheResult, {
        guardrailMatches,
        guardrailWarnings,
        method,
        model: requestedModel,
        organizationId: virtualKey.organizationId,
        parsedBody,
        path: upstreamPath,
        providerConfigId,
        providerName,
        redis,
        sessionHeader: c.req.header("x-session-id") ?? null,
        startTime,
        virtualKeyId: virtualKey.id
      });
    }

    if (requestedModelSlug && !allowedModel) {
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

    // 6. Parse + execute
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
      env,
      extraResponseHeaders: undefined,
      guardrailMatches,
      guardrailWarnings,
      incomingHeaders: c.req.header(),
      method,
      parsed,
      parsedBody,
      path: upstreamPath,
      providerConfigId,
      providerName,
      redis,
      requestedModel,
      sessionId: c.req.header("x-session-id") ?? null,
      startTime,
      virtualKey: {
        id: virtualKey.id,
        organizationId: virtualKey.organizationId
      }
    });
  };
};
