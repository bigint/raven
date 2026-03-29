import type { QdrantClient } from "@qdrant/js-client-rest";
import type { Env } from "@raven/config";
import { MODEL_CATALOG } from "@raven/data";
import type { Database } from "@raven/db";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { runPipeline } from "../proxy/pipeline";

export const chatCompletionsHandler = (
  db: Database,
  redis: Redis,
  env: Env,
  qdrant: QdrantClient,
  knowledgeEnabled: boolean
) => {
  return async (c: Context): Promise<Response> => {
    const bodyText = await c.req.text();

    // Pre-validate model before entering pipeline
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(bodyText);
    } catch {
      throw new ValidationError("Invalid JSON body");
    }

    const modelSlug = body.model as string;
    if (!modelSlug) throw new ValidationError("'model' field is required");

    const model = MODEL_CATALOG[modelSlug];
    if (!model) {
      throw new NotFoundError(
        `Model '${modelSlug}' is not supported. Use /v1/models to see available models.`
      );
    }

    const providerName = model.provider;

    return runPipeline({
      authHeader: c.req.header("Authorization") ?? "",
      bodyText,
      db,
      env,
      extraResponseHeaders: {
        "X-Raven-Model": modelSlug,
        "X-Raven-Provider": providerName
      },
      incomingHeaders: c.req.header(),
      knowledgeEnabled,
      method: "POST",
      path: c.req.path,
      providerPath: `/v1/proxy/${providerName}/chat/completions`,
      qdrant,
      redis,
      sessionId: c.req.header("x-session-id") ?? null,
      skipRouting: true,
      strictBody: true,
      upstreamPathOverride: "/v1/chat/completions",
      userAgent: c.req.header("user-agent") ?? null,
      userIdHeader: c.req.header("x-user-id")
    });
  };
};
