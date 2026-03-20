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
import { refreshPricingCache } from "./lib/pricing-cache";
import { getRedis } from "./lib/redis";
import { sendPasswordResetEmail } from "./lib/send-password-reset-email";
import { sendWelcomeEmail } from "./lib/send-welcome-email";
import { initWebhookDispatcher } from "./lib/webhook-dispatcher";
import { createAuthMiddleware } from "./middleware/auth";
import { platformAdminMiddleware } from "./middleware/platform-admin";
import { requestId } from "./middleware/request-id";
import { requestTiming } from "./middleware/request-timing";
import { createAdminModule } from "./modules/admin/index";
import { createAnalyticsModule } from "./modules/analytics/index";
import { createAuditLogsModule } from "./modules/audit-logs/index";
import { createAuthModule } from "./modules/auth/index";
import {
  createBillingModule,
  createBillingWebhookModule
} from "./modules/billing/index";
import { createBudgetsModule } from "./modules/budgets/index";
import { createGuardrailsModule } from "./modules/guardrails/index";
import { createKeysModule } from "./modules/keys/index";
import { listAvailableModels } from "./modules/models/available";
import { createModelsModule } from "./modules/models/index";
import { createOpenAICompatModule } from "./modules/openai-compat/index";
import { createPromptsModule } from "./modules/prompts/index";
import { createProvidersModule } from "./modules/providers/index";
import { proxyHandler } from "./modules/proxy/handler";
import { flushLastUsed } from "./modules/proxy/last-used";
import { flushLogBuffer } from "./modules/proxy/logger";
import { createRoutingRulesModule } from "./modules/routing-rules/index";
import { createSettingsModule } from "./modules/settings/index";
import { createTeamsModule } from "./modules/teams/index";
import { createUserModule } from "./modules/user/index";
import { createWebhooksModule } from "./modules/webhooks/index";

const env = parseEnv();
export const db = createDatabase(env.DATABASE_URL);
export const redis = getRedis(env.REDIS_URL);
initEventBus(redis);
initWebhookDispatcher(db, redis);
initEmailDispatcher(db, redis, env.APP_URL);

// Flush buffered lastUsedAt timestamps every 60 seconds
const flushInterval = setInterval(() => {
  void flushLastUsed(db, redis);
}, 60_000);

// Load pricing cache from DB
void refreshPricingCache(db).catch((err) =>
  console.error("Failed to load pricing cache:", err)
);

const auth = createAuth(db, env, {
  onResetPassword: (user, url) => void sendPasswordResetEmail(user, url),
  onUserCreated: (user) => void sendWelcomeEmail(user, env.APP_URL)
});

const app = new Hono();

// Global middleware — disable request logger in production to reduce noise
if (env.NODE_ENV !== "production") {
  app.use("*", logger());
}

// Request body size limit (10MB)
app.use("*", async (c, next) => {
  const contentLength = c.req.header("content-length");
  if (contentLength && Number.parseInt(contentLength, 10) > 10 * 1024 * 1024) {
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

app.use("*", compress());

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

  console.error("Unhandled error:", err);
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
app.route("/api/auth", createAuthModule(auth));

// OpenAI-compatible endpoints (before proxy catch-all)
app.route("/v1", createOpenAICompatModule(db, redis, env));

app.all("/v1/proxy/*", proxyHandler(db, redis, env));

// Billing webhooks (no auth)
app.route("/webhooks/billing", createBillingWebhookModule(db, env, redis));

// Public models catalog (no auth required)
app.route("/v1/models", createModelsModule(db));

// User-level routes (session auth)
const userRoutes = new Hono();
userRoutes.use("*", createAuthMiddleware(auth));
userRoutes.route("/", createUserModule(db));
app.route("/v1/user", userRoutes);

// Admin routes (session auth + platform admin check)
const adminRoutes = new Hono();
adminRoutes.use("*", createAuthMiddleware(auth));
adminRoutes.use("*", platformAdminMiddleware);
adminRoutes.route("/", createAdminModule(db, redis));
app.route("/v1/admin", adminRoutes);

// Protected API routes (session auth)
const v1 = new Hono();
v1.use("*", createAuthMiddleware(auth));
v1.get("/available-models", listAvailableModels(db));
v1.route("/providers", createProvidersModule(db, env, redis));
v1.route("/keys", createKeysModule(db, redis));
v1.route("/prompts", createPromptsModule(db));
v1.route("/budgets", createBudgetsModule(db, redis));
v1.route("/guardrails", createGuardrailsModule(db, redis));
v1.route("/analytics", createAnalyticsModule(db, redis));
v1.route("/teams", createTeamsModule(db, redis));
v1.route("/settings", createSettingsModule(db, redis));
v1.route("/billing", createBillingModule(db, redis));
v1.route("/webhooks", createWebhooksModule(db, redis));
v1.route("/routing-rules", createRoutingRulesModule(db));
v1.route("/audit-logs", createAuditLogsModule(db, redis));
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

const server = serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
  console.log(`Raven API running on http://localhost:${info.port}`);
});

const shutdown = async (): Promise<void> => {
  console.log("Shutting down gracefully...");
  server.close();
  clearInterval(flushInterval);
  await flushLogBuffer().catch((err) =>
    console.error("Failed to flush log buffer on shutdown:", err)
  );
  await flushLastUsed(db, redis).catch((err) =>
    console.error("Failed to flush lastUsed on shutdown:", err)
  );
  await redis.quit();
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());

export { auth };
export default app;
