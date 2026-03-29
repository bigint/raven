import type { QdrantClient } from "@qdrant/js-client-rest";
import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import { chatCompletionsHandler } from "./handler";

export const createOpenAICompatModule = (
  db: Database,
  redis: Redis,
  env: Env,
  qdrant: QdrantClient,
  knowledgeEnabled: boolean
) => {
  const app = new Hono();
  app.post(
    "/chat/completions",
    chatCompletionsHandler(db, redis, env, qdrant, knowledgeEnabled)
  );
  return app;
};
