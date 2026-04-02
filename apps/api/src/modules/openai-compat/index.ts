import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import type { BigRAGClient } from "@/lib/bigrag";
import { chatCompletionsHandler } from "./handler";

export const createOpenAICompatModule = (
  db: Database,
  redis: Redis,
  env: Env,
  bigrag: BigRAGClient,
  knowledgeEnabled: boolean
) => {
  const app = new Hono();
  app.post(
    "/chat/completions",
    chatCompletionsHandler(db, redis, env, bigrag, knowledgeEnabled)
  );
  return app;
};
