# Backend Performance Optimization Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize the Raven backend to handle millions of requests per hour by adding missing indexes, caching hot-path DB lookups, eliminating redundant work in the proxy handler, and consolidating Redis operations.

**Architecture:** Three-phase approach — (1) add all missing database indexes for immediate query speedup, (2) add Redis caching for repeatedly-fetched data and refactor the proxy handler to parse JSON once, (3) optimize algorithms, combine Redis pipelines, and add bounds to unbounded queries.

**Tech Stack:** Hono, Drizzle ORM, PostgreSQL, Redis (ioredis), TypeScript

---

## Task 1: Add Missing Database Indexes to All Schema Files

**Files:**
- Modify: `packages/db/src/schema/keys.ts`
- Modify: `packages/db/src/schema/providers.ts`
- Modify: `packages/db/src/schema/budgets.ts`
- Modify: `packages/db/src/schema/guardrail-rules.ts`
- Modify: `packages/db/src/schema/routing-rules.ts`
- Modify: `packages/db/src/schema/webhooks.ts`
- Modify: `packages/db/src/schema/subscriptions.ts`
- Modify: `packages/db/src/schema/custom-domains.ts`
- Modify: `packages/db/src/schema/request-logs.ts`
- Modify: `packages/db/src/schema/members.ts`
- Modify: `packages/db/src/schema/teams.ts`

Every table queried on the hot path is missing indexes. This is the single highest-ROI change.

- [ ] Add indexes to `virtualKeys`: (keyHash), (organizationId, isActive)
- [ ] Add indexes to `providerConfigs`: (organizationId, provider, isEnabled)
- [ ] Add indexes to `budgets`: (organizationId, entityId)
- [ ] Add indexes to `guardrailRules`: (organizationId, isEnabled)
- [ ] Add indexes to `routingRules`: (organizationId, sourceModel, isEnabled)
- [ ] Add indexes to `webhooks`: (organizationId, isEnabled)
- [ ] Add indexes to `subscriptions`: (organizationId)
- [ ] Add indexes to `customDomains`: (domain, status)
- [ ] Add indexes to `requestLogs`: (organizationId, virtualKeyId, createdAt), (organizationId, sessionId, createdAt), (provider, model, organizationId, createdAt)
- [ ] Add indexes to `members`: (userId)
- [ ] Add indexes to `teams`: (organizationId)
- [ ] Generate migration with `pnpm db:generate`

---

## Task 2: Create Redis Caching Layer for Hot-Path DB Lookups

**Files:**
- Create: `apps/api/src/lib/cache-utils.ts`
- Modify: `apps/api/src/modules/proxy/auth.ts`
- Modify: `apps/api/src/modules/proxy/plan-gate.ts`
- Modify: `apps/api/src/modules/proxy/plan-check.ts`

Every proxy request hits DB for: auth key lookup, org plan, provider configs. These change rarely but are queried on every single request.

- [ ] Create `cache-utils.ts` with `cachedQuery(redis, key, ttlSeconds, queryFn)` helper
- [ ] Add Redis caching to `authenticateKey()` — cache by keyHash, 60s TTL, invalidate on key update
- [ ] Add Redis caching to `getOrgPlan()` — cache by orgId, 300s TTL
- [ ] Refactor `checkPlanLimit()` to use cached plan instead of re-querying DB

---

## Task 3: Refactor Proxy Handler — Parse JSON Once

**Files:**
- Modify: `apps/api/src/modules/proxy/handler.ts`

The handler currently calls `JSON.parse(bodyText)` 3 separate times (guardrails, content routing, cache key). Parse once and pass the result through.

- [ ] Parse body text once at the top of the handler into `parsedBody`
- [ ] Pass `parsedBody` to `evaluateGuardrails()` instead of re-parsing
- [ ] Pass `parsedBody` to `evaluateRoutingRules()` instead of re-parsing
- [ ] Use `parsedBody` directly for cache key generation (remove third parse)
- [ ] Remove all redundant try/catch JSON.parse blocks

---

## Task 4: Combine Redis Pipelines in Rate Limiter

**Files:**
- Modify: `apps/api/src/modules/proxy/rate-limiter.ts`

RPM and RPD checks use two separate Redis round-trips. Combine into one pipeline.

- [ ] Combine RPM and RPD operations into a single `redis.pipeline()` call
- [ ] Extract counts from combined results array at correct offsets

---

## Task 5: Pipeline Latency & Cost Tracker Redis Calls

**Files:**
- Modify: `apps/api/src/modules/proxy/latency-tracker.ts`

`updateLatency()` does GET then SET (2 round-trips). `updateCost()` does INCRBYFLOAT then EXPIRE (2 round-trips).

- [ ] Refactor `updateLatency()` to use a Lua script or pipeline for atomic GET+SET
- [ ] Refactor `updateCost()` to combine INCRBYFLOAT + EXPIRE into a single pipeline
- [ ] Add combined `updateMetrics(redis, configId, latencyMs, cost)` function that batches both

---

## Task 6: Optimize Guardrail Evaluation

**Files:**
- Modify: `apps/api/src/modules/proxy/guardrails.ts`

`evaluateBlockTopics()` and `evaluateContentFilter()` use nested loops with `.toLowerCase().includes()`. Precompute lowercase and use more efficient matching.

- [ ] Lowercase all contents once at the start of evaluation
- [ ] Lowercase topics/categories once per rule, not per content string
- [ ] Cache compiled RegExp for `evaluateCustomRegex()` to avoid re-compilation

---

## Task 7: Optimize Content Router

**Files:**
- Modify: `apps/api/src/modules/proxy/content-router.ts`

`messagesText.toLowerCase()` is recalculated inside the loop for each keyword_match rule. `JSON.parse(rule.conditionValue)` is called on every rule.

- [ ] Precompute `lowerMessagesText` once before the rule loop
- [ ] Parse `conditionValue` once and reuse

---

## Task 8: Add LIMIT to Unbounded Queries

**Files:**
- Modify: `apps/api/src/modules/proxy/provider-resolver.ts`
- Modify: `apps/api/src/modules/proxy/fallback.ts`
- Modify: `apps/api/src/modules/proxy/router.ts`

Several queries load all rows into memory then pick randomly. Use SQL `ORDER BY RANDOM() LIMIT 1` or reasonable limits.

- [ ] `provider-resolver.ts`: Use `sql\`random()\`` with `.limit(1)` for random config selection
- [ ] `fallback.ts`: Add `.limit(10)` to fallback config query
- [ ] `router.ts`: Select only `id` column (already done), add `.limit(50)` as safety bound

---

## Task 9: Buffer `updateLastUsed` Writes

**Files:**
- Modify: `apps/api/src/modules/proxy/logger.ts`

`updateLastUsed()` fires a DB UPDATE on every single request. Buffer in Redis and flush periodically.

- [ ] Replace immediate DB update with Redis `SET` (`lastused:{keyId}`, timestamp)
- [ ] Add periodic flush function that batch-updates all dirty keys from Redis to DB

---

## Task 10: Increase DB Connection Pool & Optimize Client

**Files:**
- Modify: `packages/db/src/client.ts`

Current pool is 20 connections. For high throughput, increase and add prepare option.

- [ ] Increase `max` from 20 to 50
- [ ] Add `prepare: false` for serverless-friendly behavior (avoids prepared statement leaks)

---

## Task 11: Batch Email Sends

**Files:**
- Modify: `apps/api/src/lib/email-dispatcher.ts`

Budget alert emails are sent sequentially in a for loop. Use `Promise.all` for parallel sends.

- [ ] Replace sequential `for...await` with `Promise.all()` for budget alert emails

---

## Task 12: Add Webhook Query Index & Optimize Dispatcher

**Files:**
- Modify: `apps/api/src/lib/webhook-dispatcher.ts`

Webhook queries use `arrayOverlaps` without index support.

- [ ] Add `select` field list instead of `select()` (avoid fetching unnecessary columns)
- [ ] Add request timeout tracking for observability
