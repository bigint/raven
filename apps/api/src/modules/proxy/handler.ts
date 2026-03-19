import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { modelAliases } from "@raven/db";
import { and, eq, isNull } from "drizzle-orm";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import { cachedQuery } from "@/lib/cache-utils";
import { GuardrailError } from "@/lib/errors";
import { authenticateKey } from "./auth";
import { checkBudgets } from "./budget-check";
import { checkCache, serveCacheHit } from "./cache";
import { evaluateRoutingRules } from "./content-router";
import { execute } from "./execute";
import { evaluateGuardrails } from "./guardrails";
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

    // 3.5 Extract end-user identity
    const endUser =
      (c.req.header("x-user-id") as string | undefined) ??
      (typeof parsedBody.user === "string" ? parsedBody.user : null) ??
      (typeof (parsedBody.metadata as Record<string, unknown> | undefined)
        ?.user_id === "string"
        ? ((parsedBody.metadata as Record<string, unknown>).user_id as string)
        : null);

    // 3.6 Resolve model alias
    if (typeof parsedBody.model === "string") {
      const aliasKey = `model-alias:${virtualKey.organizationId}:${parsedBody.model}`;
      const resolved = await cachedQuery(redis, aliasKey, 300, async () => {
        const [row] = await db
          .select({ targetModel: modelAliases.targetModel })
          .from(modelAliases)
          .where(
            and(
              eq(modelAliases.alias, parsedBody.model as string),
              eq(modelAliases.organizationId, virtualKey.organizationId),
              isNull(modelAliases.deletedAt)
            )
          )
          .limit(1);
        return row ?? null;
      });

      if (resolved) {
        parsedBody = { ...parsedBody, model: resolved.targetModel };
      }
    }

    // 4. Guardrails + content routing
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

    const guardrailWarnings = guardrailResult?.warnings ?? [];
    const guardrailMatches = guardrailResult?.matches ?? [];

    // Apply routing result immutably — create new object instead of mutating
    if (routingResult?.ruleApplied) {
      parsedBody = { ...parsedBody, model: routingResult.model };
    }

    // 5. Cache check + provider resolution in parallel
    const { providerName: pathProvider } = parseProviderFromPath(c.req.path);

    const [cacheResult, providerResolution] = await Promise.all([
      checkCache(redis, virtualKey.organizationId, pathProvider, parsedBody),
      resolveProvider(db, env, virtualKey.organizationId, c.req.path, redis)
    ]);

    const {
      decryptedApiKey,
      providerConfigId,
      providerConfigName,
      providerName,
      upstreamPath
    } = providerResolution;
    const requestedModel = (parsedBody.model as string) ?? "unknown";

    if (cacheResult.hit) {
      return serveCacheHit(db, cacheResult, {
        endUser,
        guardrailMatches,
        guardrailWarnings,
        method,
        model: requestedModel,
        organizationId: virtualKey.organizationId,
        parsedBody,
        path: upstreamPath,
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
      endUser,
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
      providerConfigName,
      providerName,
      redis,
      requestedModel,
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
