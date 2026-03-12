import { serve } from "@hono/node-server";
import { createAuth } from "@raven/auth";
import { parseEnv } from "@raven/config";
import { createDatabase } from "@raven/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { AppError } from "./lib/errors";
import { initEventBus } from "./lib/events";
import { getRedis } from "./lib/redis";
import { initWebhookDispatcher } from "./lib/webhook-dispatcher";
import { createAuthMiddleware } from "./middleware/auth";
import { requestId } from "./middleware/request-id";
import { requestTiming } from "./middleware/request-timing";
import { createTenantMiddleware } from "./middleware/tenant";
import { createAnalyticsModule } from "./modules/analytics/index";
import { createAuditLogsModule } from "./modules/audit-logs/index";
import { createAuthModule } from "./modules/auth/index";
import {
  createBillingModule,
  createBillingWebhookModule
} from "./modules/billing/index";
import { createBudgetsModule } from "./modules/budgets/index";
import { createEventsModule } from "./modules/events/index";
import { createGuardrailsModule } from "./modules/guardrails/index";
import { createKeysModule } from "./modules/keys/index";
import { createPromptsModule } from "./modules/prompts/index";
import { createProvidersModule } from "./modules/providers/index";
import { createRoutingRulesModule } from "./modules/routing-rules/index";
import { createProxyModule } from "./modules/proxy/index";
import { createSettingsModule } from "./modules/settings/index";
import { createTeamsModule } from "./modules/teams/index";
import { createUserModule } from "./modules/user/index";
import { createWebhooksModule } from "./modules/webhooks/index";

const env = parseEnv();
export const db = createDatabase(env.DATABASE_URL);
export const redis = getRedis(env.REDIS_URL);
initEventBus(redis);
initWebhookDispatcher(db, redis);
const auth = createAuth(db, env);

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use("*", requestId());
app.use("*", requestTiming());
app.use(
  "*",
  cors({
    credentials: true,
    origin: [env.APP_URL]
  })
);

// Global error handler
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {})
        }
      },
      err.statusCode as 400 | 401 | 403 | 404 | 409 | 429 | 500
    );
  }
  console.error("Unhandled error:", err);
  return c.json(
    { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    500
  );
});

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Auth routes (no auth middleware)
app.route("/api/auth", createAuthModule(auth));

// Proxy routes (virtual key auth, no session auth)
app.route("/v1/proxy", createProxyModule(db, redis, env));

// Billing webhooks (no auth)
app.route("/webhooks/billing", createBillingWebhookModule(db, env));

// User-level routes (session auth, no tenant)
const userRoutes = new Hono();
userRoutes.use("*", createAuthMiddleware(auth));
userRoutes.route("/", createUserModule(db));
app.route("/v1/user", userRoutes);

// Protected API routes (session auth + tenant)
const v1 = new Hono();
v1.use("*", createAuthMiddleware(auth));
v1.use("*", createTenantMiddleware(db));
v1.route("/providers", createProvidersModule(db, env));
v1.route("/keys", createKeysModule(db));
v1.route("/prompts", createPromptsModule(db));
v1.route("/budgets", createBudgetsModule(db));
v1.route("/guardrails", createGuardrailsModule(db));
v1.route("/analytics", createAnalyticsModule(db));
v1.route("/teams", createTeamsModule(db));
v1.route("/settings", createSettingsModule(db));
v1.route("/billing", createBillingModule(db));
v1.route("/audit-logs", createAuditLogsModule(db));
v1.route("/webhooks", createWebhooksModule(db));
v1.route("/routing-rules", createRoutingRulesModule(db));
v1.route("/events", createEventsModule(redis));
app.route("/v1", v1);

app.notFound((c) =>
  c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404)
);

serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
  console.log(`Raven API running on http://localhost:${info.port}`);
});

export { auth };
export default app;
