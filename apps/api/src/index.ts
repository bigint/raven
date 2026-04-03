import { BigRAG } from "@bigrag/client";
import { serve } from "@hono/node-server";
import { createAuth } from "@raven/auth";
import { parseEnv } from "@raven/config";
import { createDatabase } from "@raven/db";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { initEmailDispatcher } from "./lib/email-dispatcher";
import { AppError } from "./lib/errors";
import { initEventBus } from "./lib/events";
import { getInstanceSettings } from "./lib/instance-settings";
import { log } from "./lib/logger";
import { getRedis } from "./lib/redis";
import { sendPasswordResetEmail, sendWelcomeEmail } from "./lib/send-email";
import { initWebhookDispatcher } from "./lib/webhook-dispatcher";
import { createAuthMiddleware } from "./middleware/auth";
import { platformAdminMiddleware } from "./middleware/platform-admin";
import { requestId } from "./middleware/request-id";
import { requestTiming } from "./middleware/request-timing";
import { createWriterMiddleware } from "./middleware/writer";
import { createAdminModule } from "./modules/admin/index";
import { getPublicSettings } from "./modules/admin/settings";
import { createAnalyticsModule } from "./modules/analytics/index";
import { createAuditLogsModule } from "./modules/audit-logs/index";
import { createAuthModule } from "./modules/auth/index";
import { createBudgetsModule } from "./modules/budgets/index";
import { createGuardrailsModule } from "./modules/guardrails/index";
import { createInvitationsModule } from "./modules/invitations/index";
import { createKeysModule } from "./modules/keys/index";
import { createKnowledgeAnalyticsModule } from "./modules/knowledge/analytics/index";
import {
  createKeyBindingsModule,
  createKnowledgeModule
} from "./modules/knowledge/index";
import { listAvailableModels } from "./modules/models/available";
import { createModelsModule } from "./modules/models/index";
import { createOpenAICompatModule } from "./modules/openai-compat/index";
import { createProvidersModule } from "./modules/providers/index";
import { flushLastUsed } from "./modules/proxy/last-used";
import { flushLogBuffer } from "./modules/proxy/logger";
import { runPipeline } from "./modules/proxy/pipeline";
import { createRoutingRulesModule } from "./modules/routing-rules/index";
import { createSetupModule } from "./modules/setup/index";
import { createUserModule } from "./modules/user/index";
import { createWebhooksModule } from "./modules/webhooks/index";

const env = parseEnv();
export const db = createDatabase(env.DATABASE_URL);
export const redis = getRedis(env.REDIS_URL);
const bigrag = new BigRAG({ baseUrl: env.BIGRAG_URL });
initEventBus(redis);
initWebhookDispatcher(db, redis);
initEmailDispatcher(db, redis);

// Flush buffered lastUsedAt timestamps every 60 seconds
const flushInterval = setInterval(() => {
  void flushLastUsed(db, redis);
}, 60_000);

const instanceSettings = await getInstanceSettings(db, redis);

const auth = createAuth(db, env, {
  onResetPassword: (user, url) => void sendPasswordResetEmail(db, user, url),
  onUserCreated: (user) => void sendWelcomeEmail(db, user, env.APP_URL),
  sessionTimeoutHours: instanceSettings.session_timeout_hours
});

const app = new Hono();

// Global middleware — disable request logger in production to reduce noise
if (env.NODE_ENV !== "production") {
  app.use("*", logger());
}

// Request body size limit (skip knowledge document uploads — bigRAG handles its own limits)
const maxBodyBytes = instanceSettings.max_request_body_size_gb * 1024 * 1024 * 1024;
app.use("*", async (c, next) => {
  if (c.req.path.match(/\/v1\/knowledge\/collections\/[^/]+\/documents$/)) {
    return next();
  }
  const contentLength = c.req.header("content-length");
  if (contentLength && Number.parseInt(contentLength, 10) > maxBodyBytes) {
    return c.json(
      {
        detail: "Request body too large",
        instance: c.req.path,
        status: 413,
        title: "Request body too large",
        type: "about:blank"
      },
      { headers: { "Content-Type": "application/problem+json" }, status: 413 }
    );
  }
  return next();
});

app.use("*", requestId());
app.use("*", requestTiming());
app.use(
  "*",
  cors({
    credentials: true,
    origin: [env.APP_URL]
  })
);

app.use("*", async (c, next) => {
  if (
    c.req.path.startsWith("/v1/proxy/") ||
    c.req.path === "/v1/chat/completions"
  ) {
    return next();
  }
  return compress()(c, next);
});

// Security headers
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "0");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
});

// Global error handler (RFC 9457 Problem Details)
app.onError((err, c) => {
  const instance = c.req.path;

  if (err instanceof AppError) {
    return c.json(err.toProblemDetails(instance), {
      headers: { "Content-Type": "application/problem+json" },
      status: err.statusCode as 400 | 401 | 403 | 404 | 409 | 412 | 429 | 500
    });
  }

  log.error("Unhandled error", err);
  return c.json(
    {
      detail: "Internal server error",
      instance,
      status: 500,
      title: "Internal server error",
      type: "about:blank"
    },
    { headers: { "Content-Type": "application/problem+json" }, status: 500 }
  );
});

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Auth routes (no auth middleware)
app.route("/api/auth", createAuthModule(auth, db, redis));

// OpenAI-compatible endpoints (before proxy catch-all)
app.route(
  "/v1",
  createOpenAICompatModule(
    db,
    redis,
    env,
    bigrag,
    instanceSettings.knowledge_enabled
  )
);

app.all("/v1/proxy/*", async (c) => {
  const method = c.req.method;
  const hasBody = method !== "GET" && method !== "HEAD";
  return runPipeline({
    authHeader: c.req.header("Authorization") ?? "",
    bigrag,
    bodyText: hasBody ? await c.req.text() : undefined,
    db,
    env,
    incomingHeaders: c.req.header(),
    knowledgeEnabled: instanceSettings.knowledge_enabled,
    method,
    path: c.req.path,
    providerPath: c.req.path,
    redis,
    sessionId: c.req.header("x-session-id") ?? null,
    userAgent: c.req.header("user-agent") ?? null,
    userIdHeader: c.req.header("x-user-id")
  });
});

// Public models catalog (no auth required)
app.route("/v1/models", createModelsModule(db));

// Public settings (no auth required)
app.get("/v1/settings/public", getPublicSettings(db));

// Public invitation validation (no auth required)
app.route("/v1/invitations", createInvitationsModule(db));

// Public setup (no auth required)
app.route("/v1/setup", createSetupModule(db, auth));

// User-level routes (session auth)
const userRoutes = new Hono();
userRoutes.use("*", createAuthMiddleware(auth));
userRoutes.route("/", createUserModule(db));
app.route("/v1/user", userRoutes);

// Admin routes (session auth + platform admin check)
const adminRoutes = new Hono();
adminRoutes.use("*", createAuthMiddleware(auth));
adminRoutes.use("*", platformAdminMiddleware);
adminRoutes.route("/", createAdminModule(db, env.APP_URL, redis));
adminRoutes.route("/knowledge", createKnowledgeAnalyticsModule(db));
app.route("/v1/admin", adminRoutes);

// Protected API routes (session auth + writer middleware for mutations)
const v1 = new Hono();
v1.use("*", createAuthMiddleware(auth));
v1.use("*", createWriterMiddleware());
v1.get("/available-models", listAvailableModels(db));
v1.route("/providers", createProvidersModule(db, env, redis));
v1.route("/keys", createKeysModule(db));
v1.route("/budgets", createBudgetsModule(db));
v1.route("/guardrails", createGuardrailsModule(db));
v1.route("/analytics", createAnalyticsModule(db, redis));
v1.route("/webhooks", createWebhooksModule(db));
v1.route("/routing-rules", createRoutingRulesModule(db));
v1.route("/audit-logs", createAuditLogsModule(db));
v1.route("/knowledge", createKnowledgeModule(db, bigrag));
v1.route("/keys", createKeyBindingsModule(db));
app.route("/v1", v1);

app.notFound((c) =>
  c.json(
    {
      detail: "Route not found",
      instance: c.req.path,
      status: 404,
      title: "Route not found",
      type: "about:blank"
    },
    { headers: { "Content-Type": "application/problem+json" }, status: 404 }
  )
);

const server = serve(
  { fetch: app.fetch, hostname: env.API_HOST, port: env.API_PORT },
  (info) => {
    log.info("Raven API started", { host: env.API_HOST, port: info.port });
  }
);

// Allow long-running proxy requests (large context windows, streaming)
server.setTimeout(0);
(server as unknown as import("node:http").Server).requestTimeout = 0;
(server as unknown as import("node:http").Server).headersTimeout = 60_000;

const shutdown = async (): Promise<void> => {
  log.info("Shutting down gracefully");
  server.close();
  clearInterval(flushInterval);
  await flushLogBuffer().catch((err) =>
    log.error("Failed to flush log buffer on shutdown", err)
  );
  await flushLastUsed(db, redis).catch((err) =>
    log.error("Failed to flush lastUsed on shutdown", err)
  );
  await redis.quit();
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());

export { auth };
export default app;
