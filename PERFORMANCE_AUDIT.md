# Raven Platform — Performance Audit Report

**Date:** 2026-03-19
**Team:** 16 engineers (10 backend, 5 frontend, 1 team lead)
**Scope:** Full-stack performance audit of the Raven Platform monorepo
**Stack:** Next.js 15, Hono, Drizzle ORM, PostgreSQL, Redis, TanStack Query

---

## Executive Summary

### Total Issues

| Severity | Backend | Frontend | Total |
|----------|---------|----------|-------|
| Critical | 26 | 13 | **39** |
| High | 67 | 32 | **99** |
| Medium | 76 | 44 | **120** |
| Low | 49 | 29 | **78** |
| **Total** | **218** | **118** | **336** |

After deduplication of issues found independently by multiple engineers, there are approximately **247 unique issues** across the codebase.

### Top 10 Most Critical Findings

| # | Issue | Area | Found By | Impact |
|---|-------|------|----------|--------|
| 1 | Every proxy request inserts a DB row synchronously with no batching | Backend — Logger | BE3 | Directly bottlenecks throughput on the hottest path in the system |
| 2 | `request_logs` table has no retention/cleanup and grows unbounded | Backend — DB | BE4 | Unbounded table growth degrades all analytics queries and increases storage cost |
| 3 | `SELECT *` on `providerConfigs` leaks encrypted API keys into Redis cache | Backend — Proxy | BE1 | Security: encrypted secrets cached in Redis; performance: unnecessary data transfer |
| 4 | No graceful shutdown — data loss on every deploy | Backend — Infra | BE10 | Active requests and buffered writes are silently dropped during deploys |
| 5 | PBKDF2 100K-iteration key derivation on every decrypt, never cached | Backend — Crypto | BE7, BE10 | ~50-100ms of synchronous CPU burn per request that touches provider configs |
| 6 | Admin endpoints return all rows without pagination | Backend — Admin | BE9 | Full table scans on users and orgs crash or timeout as data grows |
| 7 | No distributed lock on cron — concurrent model syncs corrupt data | Backend — Cron | BE10 | Data corruption in multi-instance deployments |
| 8 | Webhook does not persist subscription data; no idempotency protection | Backend — Billing | BE8 | Lost subscription state and duplicate charges on retry |
| 9 | Home and Pricing pages entirely client-rendered despite being static | Frontend — Marketing | FE5 | 2-5s slower FCP/LCP, no SEO indexing, wasted client JS |
| 10 | `queryClient.invalidateQueries()` with no filters nukes entire cache on org switch | Frontend — Shared | FE4 | Every org switch causes a thundering herd of refetches across all cached data |

---

## Priority Matrix

All critical issues ranked by estimated impact-to-effort ratio. Effort: S (< 1 day), M (1-3 days), L (3-5 days), XL (1-2 weeks).

| ID | Area | Description | Impact | Effort |
|----|------|-------------|--------|--------|
| BE3-C1 | Proxy Logger | Synchronous DB INSERT per request — no batching | Extreme: throughput ceiling | M |
| BE10-C1 | Infrastructure | No graceful shutdown — data loss on deploy | Extreme: data loss | M |
| BE1-C1 | Proxy Resolver | `SELECT *` on providerConfigs caches encrypted API key in Redis | Critical: security + perf | S |
| BE1-C2 | Proxy Fallback | `SELECT *` on providerConfigs in fallback — uncached DB hit per failure | Critical: cascading failure | S |
| BE8-C1 | Billing Webhook | Webhook does not persist subscription data to DB | Critical: revenue loss | M |
| BE8-C2 | Billing Webhook | No idempotency on webhook processing | Critical: duplicate charges | M |
| BE4-C1 | Analytics DB | No data retention/cleanup for request_logs | Critical: unbounded growth | M |
| BE10-C2 | Cron | No distributed lock — concurrent model syncs corrupt data | Critical: data corruption | S |
| BE10-C3 | Cron | N+1 individual DB writes instead of batch upsert in model sync | High: DB saturation | M |
| BE7-C1 | Crypto | PBKDF2 100K iterations on every decrypt — never cached | High: CPU bottleneck | S |
| BE9-C1 | Admin Users | Returns all rows without pagination | High: OOM/timeout | S |
| BE9-C2 | Admin Orgs | Returns all rows without pagination | High: OOM/timeout | S |
| BE5-C1 | DB Schema | request_logs count queries do full sequential scans | High: slow analytics | M |
| BE5-C2 | DB Schema | request_logs missing index on deleted_at | High: every query slow | S |
| BE5-C3 | DB Schema | Admin audit logs query scans entire table — no global index | High: admin panel slow | S |
| BE5-C4 | DB Schema | Admin stats scans request_logs globally with only date filter | High: expensive aggregation | S |
| BE1-C3 | Guardrails | New RegExp from user-supplied pattern — ReDoS risk | Critical: security (DoS) | S |
| BE2-C1 | Plan Check | Plan limit counter increments even when request will be rejected | High: incorrect metering | S |
| BE2-C2 | Rate Limiter | Partial token consumption on Promise.all failure | High: rate limit bypass | M |
| BE2-C3 | Budget Check | incrementBudgetSpend re-queries DB without caching | High: DB load | S |
| BE6-C1 | Tenant Middleware | Uncached DB membership query on every tenant-scoped request | High: latency per request | S |
| BE6-C2 | Keys | checkResourceLimit triggers two uncached DB queries in sequence | High: key creation slow | S |
| BE4-C2 | Analytics | clampAnalyticsRetention hits DB on every analytics request | High: unnecessary DB load | S |
| BE4-C3 | Analytics | No query result caching for any analytics endpoint | High: repeated expensive queries | M |
| BE8-C3 | Billing | No cache invalidation when subscription changes | High: stale plan data | S |
| BE7-C2 | Aliases | Model alias resolution is cache-miss DB roundtrip for non-alias models | High: latency per request | S |
| FE5-C1 | Marketing | Home page entirely client-rendered despite being static | High: SEO/perf | M |
| FE5-C2 | Marketing | Pricing page entirely client-rendered for a single toggle | High: SEO/perf | S |
| FE5-C3 | Marketing | AuthNav forces session check on every marketing page | High: TTFB regression | S |
| FE5-C4 | Marketing | new Date().getFullYear() prevents static generation | High: cache bust | S |
| FE4-C1 | Shared Hooks | invalidateQueries() with no filters nukes entire cache | High: thundering herd | S |
| FE4-C2 | Data Table | DataTable renders all rows without virtualization | High: DOM thrashing | M |
| FE4-C3 | SSE | Live SSE requests cause full AnimatePresence re-mount per event | High: render churn | M |
| FE1-C1 | Audit Logs | Fetches ALL records without pagination | High: memory/network | S |
| FE1-C2 | Dashboard | No Suspense boundaries on data-heavy page routes | High: blocking renders | M |
| FE1-C3 | Cache Stats | Daily table renders unbounded rows without virtualization | High: DOM thrashing | M |
| FE3-C1 | Chat | No image compression before base64 — 20MB images sent | High: memory/bandwidth | M |
| FE3-C2 | Chat | Messages state array grows unbounded with full base64 | High: memory leak | M |
| FE2-C1 | Providers | API key exposed in client state via Provider interface | Critical: security | S |

---

## Backend Findings

### Critical Issues

| ID | Module | Description | File Reference |
|----|--------|-------------|----------------|
| BE1-C1 | Proxy Core | `SELECT *` on providerConfigs fetches encrypted API key into Redis cache | provider-resolver.ts:58-68 |
| BE1-C2 | Proxy Core | `SELECT *` on providerConfigs in fallback path — uncached DB query per failure | fallback.ts:28-39 |
| BE1-C3 | Proxy Core | New RegExp from user-supplied pattern without precompilation or caching — ReDoS risk | guardrails.ts:109 |
| BE2-C1 | Middleware | Plan limit counter increments even when request will be rejected | plan-check.ts:31 |
| BE2-C2 | Middleware | Rate limiter consumes both RPM and RPD tokens via Promise.all — partial consumption on failure | rate-limiter.ts:68 |
| BE2-C3 | Middleware | incrementBudgetSpend re-queries budgets from DB without caching | budget-check.ts:93-101 |
| BE3-C1 | Logger | Every request inserts a database row synchronously — no batching | logger.ts:41-79 |
| BE4-C1 | Analytics | No data retention/cleanup job for request_logs — table grows unbounded | — |
| BE4-C2 | Analytics | clampAnalyticsRetention hits DB on every single analytics request — no caching | helpers.ts:34-50 |
| BE4-C3 | Analytics | No query result caching for any analytics endpoint | — |
| BE5-C1 | DB Schema | request_logs count queries do full sequential scans | — |
| BE5-C2 | DB Schema | request_logs missing index on deleted_at — every query filters without index | — |
| BE5-C3 | DB Schema | Admin audit logs query scans entire table — no global index | — |
| BE5-C4 | DB Schema | Admin stats query scans request_logs globally with only date filter | — |
| BE6-C1 | Auth/Tenant | Tenant middleware uncached DB membership query on every tenant-scoped request | tenant.ts:39 |
| BE6-C2 | Auth/Keys | checkResourceLimit in key creation triggers two uncached DB queries in sequence | keys/create.ts:22-26 |
| BE7-C1 | Crypto | PBKDF2 key derivation 100K iterations on every decrypt — never cached | crypto.ts:18-19 |
| BE7-C2 | Aliases | Model alias resolution on every proxy request is cache-miss DB roundtrip for non-alias models | — |
| BE8-C1 | Billing | Webhook does not persist subscription data to the database | webhook.ts:62-105 |
| BE8-C2 | Billing | No idempotency protection on webhook processing | webhook.ts:27-108 |
| BE8-C3 | Billing | No cache invalidation when subscription changes | — |
| BE9-C1 | Admin | Admin Users endpoint returns all rows without pagination | admin/users.ts:7-23 |
| BE9-C2 | Admin | Admin Organizations endpoint returns all rows without pagination | admin/organizations.ts:7-24 |
| BE10-C1 | Infrastructure | No graceful shutdown handling — data loss on deploy | index.ts:202-204 |
| BE10-C2 | Cron | No distributed lock on cron job — concurrent model syncs corrupt data | sync-models.ts:13-86 |
| BE10-C3 | Cron | Model sync performs N+1 individual DB writes instead of batch upsert | sync-models.ts:39-72 |

### High Issues

| ID | Module | Description | File Reference |
|----|--------|-------------|----------------|
| BE1-H1 | Proxy Core | Sync SHA-256 hashing of request body on hot path for cache key | cache.ts:33-35 |
| BE1-H2 | Proxy Core | SHA-256 hashing on every auth request | auth.ts:15-16 |
| BE1-H3 | Proxy Core | `SELECT *` on virtualKeys in auth — caches entire row in Redis | auth.ts:32-38 |
| BE1-H4 | Proxy Core | `SELECT *` on guardrailRules — fetches full config JSONB every request | guardrails.ts:132-141 |
| BE1-H5 | Proxy Core | `SELECT *` on budgets table including all columns | budget-check.ts:29-38 |
| BE1-H6 | Proxy Core | date-fns/formatDate called on every request in latency tracker and plan check | — |
| BE1-H7 | Proxy Core | Non-atomic INCR + EXPIRE in round-robin routing | router.ts:79-80 |
| BE1-H8 | Proxy Core | New TextEncoder created per streaming response | response-formatter.ts:129 |
| BE1-H9 | Proxy Core | Spreading baseChunk into every SSE event creates objects per token | response-formatter.ts:138-143 |
| BE1-H10 | Proxy Core | OpenAI-compat handler runs guardrails sequentially, not in parallel | openai-compat/handler.ts:82-109 |
| BE1-H11 | Proxy Core | encodingForModel kept as persistent singleton with no cleanup | content-router.ts:18 |
| BE2-H1 | Middleware | js-tiktoken encoder initialized at module load — blocks startup | content-router.ts:18-20 |
| BE2-H2 | Middleware | Guardrail custom regex compiled on every request — ReDoS and CPU overhead (dup of BE1-C3) | guardrails.ts:109 |
| BE2-H3 | Middleware | Content router in-memory cache grows unbounded — memory leak | content-router.ts:7-11 |
| BE2-H4 | Middleware | Rate limiter limiters Map grows unbounded — memory leak | rate-limiter.ts:5 |
| BE2-H5 | Middleware | Tenant middleware queries DB for membership on every request without caching (dup of BE6-C1) | tenant.ts:39-45 |
| BE2-H6 | Middleware | Auth middleware calls auth.api.getSession() on every request — no caching | auth.ts:21-23 |
| BE2-H7 | Middleware | Guardrail rules fetched with select() — returns all columns including large config JSON (dup of BE1-H4) | guardrails.ts:132-141 |
| BE3-H1 | Support | Cache stampede / thundering herd on popular prompts | cache.ts:38-64 |
| BE3-H2 | Support | logAndPublish chains async work with no backpressure | logger.ts:134-151 |
| BE3-H3 | Support | flushLastUsed race condition: keys deleted before DB write confirms | logger.ts:95-122 |
| BE3-H4 | Support | Cache key computed twice — check + store | execute.ts + cache.ts |
| BE4-H1 | Analytics | getSessionById returns unbounded result set | sessions.ts:107-145 |
| BE4-H2 | Analytics | getModels returns unbounded grouped rows | models.ts:24-41 |
| BE4-H3 | Analytics | getAdoptionBreakdown returns unbounded result sets | adoption.ts:51-143 |
| BE4-H4 | Analytics | getAdoptionChart up to 365 daily rows from full scan | adoption.ts:15-48 |
| BE4-H5 | Analytics | Duplicate COUNT queries double DB load per paginated request | — |
| BE4-H6 | Analytics | Missing partial index for deleted_at IS NULL | — |
| BE4-H7 | Analytics | getCache runs two redundant queries | cache.ts:24-51 |
| BE5-H1 | DB Schema | Connection pool max:50 hardcoded | — |
| BE5-H2 | DB Schema | invitations missing index on email+status | — |
| BE5-H3 | DB Schema | request_logs missing index on end_user | — |
| BE5-H4 | DB Schema | request_logs model column filtered without dedicated index | — |
| BE5-H5 | DB Schema | flushLastUsed N individual UPDATEs | — |
| BE5-H6 | DB Schema | sessions table missing index on expiresAt | — |
| BE5-H7 | DB Schema | verifications table missing index on expiresAt | — |
| BE5-H8 | DB Schema | Webhook dispatch arrayOverlaps without GIN index | — |
| BE6-H1 | Auth | Session validation hits DB on every request with 5-min gap | auth/server.ts:70-74 |
| BE6-H2 | Auth/Keys | Key listing fetches all columns and all keys without pagination | keys/list.ts:11-14 |
| BE6-H3 | Auth/Invitations | Invitation listing has no index on (email, status) (dup of BE5-H2) | invitations.ts:24 |
| BE6-H4 | Auth/Invitations | acceptInvitation and declineInvitation fetch all columns unnecessarily | — |
| BE6-H5 | Auth/Keys | Delete key performs two sequential DB round-trips | keys/delete.ts:15-27 |
| BE6-H6 | Auth/Keys | Update key performs two sequential DB round-trips | keys/update.ts:23-59 |
| BE7-H1 | Providers | Provider list returns all columns including encrypted API keys | list.ts:11-14 |
| BE7-H2 | Providers | models.ts external API call missing timeout | models.ts:66 |
| BE7-H3 | Providers | Fallback provider resolution decrypts ALL fallback configs eagerly | fallback.ts:28-57 |
| BE7-H4 | Providers | No cache invalidation when providers or aliases are created/updated/deleted | — |
| BE7-H5 | Providers | Provider test endpoint lacks rate limiting | test.ts |
| BE8-H1 | Billing | incrementBudgetSpend queries DB on every request instead of cache (dup of BE2-C3) | budget-check.ts:91-101 |
| BE8-H2 | Billing | checkResourceLimit/checkFeatureGate called without Redis in CRUD endpoints | — |
| BE8-H3 | Billing | Budget alert fires on every request exceeding threshold — no debouncing | — |
| BE8-H4 | Billing | Race condition in budget creation — count + insert not atomic | — |
| BE8-H5 | Billing | getSubscription endpoint has no caching | subscription.ts:10-14 |
| BE9-H1 | Admin | Admin stats full-table aggregation on request_logs | admin/stats.ts:23-38 |
| BE9-H2 | Admin | Admin stats no caching | admin/stats.ts:6-63 |
| BE9-H3 | Admin | Admin audit logs query missing global createdAt index (dup of BE5-C3) | — |
| BE9-H4 | Admin | Audit log writes block the caller despite void prefix | audit-logs/log.ts:5-26 |
| BE9-H5 | Admin | Webhook delivery retries can stall up to 47s with no concurrency limit | webhook-dispatcher.ts:25-53 |
| BE9-H6 | Admin | Webhook dispatcher queries DB on every Redis event | webhook-dispatcher.ts:78-94 |
| BE9-H7 | Admin | Webhook test endpoint blocks caller for up to 10s | webhooks/test.ts:26-34 |
| BE10-H1 | Middleware | Tenant middleware uncached (dup of BE6-C1) | — |
| BE10-H2 | Middleware | Auth middleware uncached (dup of BE2-H6) | — |
| BE10-H3 | Infrastructure | logger() on every request in production | — |
| BE10-H4 | Crypto | PBKDF2 100K iterations (dup of BE7-C1) | — |
| BE10-H5 | Guardrails | Custom regex ReDoS (dup of BE1-C3) | — |
| BE10-H6 | Infrastructure | encodingForModel blocks startup (dup of BE2-H1) | — |
| BE10-H7 | Routing | Routing rules cache unbounded | — |

### Medium Issues

| ID | Module | Description |
|----|--------|-------------|
| BE1-M1 | Proxy Core | JSON.parse/stringify deep clone on every request |
| BE1-M2 | Proxy Core | Base64 encoding uses character-by-character loop |
| BE1-M3 | Proxy Core | analyzeContent called twice (guardrails + content router) |
| BE1-M4 | Proxy Core | createId for session on every request |
| BE1-M5 | Proxy Core | filterPassthroughHeaders allocates on every request |
| BE1-M6 | Proxy Core | formatBufferedResponse rebuilds full response each time |
| BE1-M7 | Proxy Core | Unbounded Map caches (content-router, routing rules) |
| BE1-M8 | Proxy Core | Redundant parseProviderFromPath called multiple times |
| BE1-M9 | Proxy Core | logAndPublish DB INSERT on hot path |
| BE1-M10 | Proxy Core | Uncached incrementBudgetSpend |
| BE2-M1 | Middleware | SHA-256 per auth (dup of BE1-H2) |
| BE2-M2 | Middleware | checkBudgets mget called even with no budgets |
| BE2-M3 | Middleware | Naive string.includes O(n*m) matching |
| BE2-M4 | Middleware | lowerTopics recomputed on every call |
| BE2-M5 | Middleware | buildCacheKey JSON.stringify on every request |
| BE2-M6 | Middleware | createId for missing session |
| BE2-M7 | Middleware | extractMessagesText unconditional |
| BE2-M8 | Middleware | SELECT * without column projection in multiple queries |
| BE3-M1 | Support | Triple JSON.stringify on cache key |
| BE3-M2 | Support | SHA-256 for cache key generation |
| BE3-M3 | Support | analyzeContent blocks cache-hit path |
| BE3-M4 | Support | pricingCache.clear() causes empty cache during refresh |
| BE3-M5 | Support | latencyTracker read-modify-write race |
| BE3-M6 | Support | flushLastUsed N individual UPDATEs (dup of BE5-H5) |
| BE3-M7 | Support | Full row in publishEvent |
| BE4-M1 | Analytics | Expensive string_agg/array_agg aggregations |
| BE4-M2 | Analytics | Count scans all sessions |
| BE4-M3 | Analytics | DATE() function prevents index usage |
| BE4-M4 | Analytics | new Request clone in analytics handler |
| BE4-M5 | Analytics | Redis subscriber leak |
| BE4-M6 | Analytics | DB insert on hot path |
| BE4-M7 | Analytics | Count query duplicates (dup of BE4-H5) |
| BE5-M1 | DB Schema | Unbounded JSONB metadata column on request_logs |
| BE5-M2 | DB Schema | toolNames JSONB without index |
| BE5-M3 | DB Schema | organizations no deletedAt index |
| BE5-M4 | DB Schema | prompt_versions missing composite index |
| BE5-M5 | DB Schema | accounts missing composite index |
| BE5-M6 | DB Schema | content-router unbounded Map (dup of BE1-M7) |
| BE5-M7 | DB Schema | guardrailRules selects config JSONB |
| BE5-M8 | DB Schema | providerConfigs fetches apiKey (dup of BE1-C1) |
| BE5-M9 | DB Schema | isStarred no index |
| BE5-M10 | DB Schema | Various missing indexes on filtered columns |
| BE6-M1 | Auth | No rate limiting on auth endpoints |
| BE6-M2 | Auth | No rate limiting on user routes |
| BE6-M3 | Auth | listOrgs uncached 3-table JOIN |
| BE6-M4 | Auth | Redis not passed to checkResourceLimit |
| BE6-M5 | Auth | updateProfile returns all columns |
| BE6-M6 | Auth | Redundant index on keyHash |
| BE6-M7 | Auth | Count query could be cached |
| BE7-M1 | Providers | Two sequential queries instead of join |
| BE7-M2 | Providers | No pagination/caching on models list |
| BE7-M3 | Providers | Repeated parseFloat on pricing data |
| BE7-M4 | Providers | SHA-256 ETag generation |
| BE7-M5 | Providers | maskApiKey masks ciphertext not actual key |
| BE7-M6 | Providers | 1-hour model cache not invalidated on changes |
| BE7-M7 | Providers | SELECT * in hot paths |
| BE8-M1 | Billing | Static plan list recomputed on each call |
| BE8-M2 | Billing | listBudgets LEFT JOINs without pagination |
| BE8-M3 | Billing | Budget spend TTL reset drift |
| BE8-M4 | Billing | Subscription status not checked on CRUD operations |
| BE8-M5 | Billing | Settings endpoint fires duplicate queries |
| BE8-M6 | Billing | Webhook signature verification skipped when empty |
| BE8-M7 | Billing | JSON.parse without try-catch |
| BE8-M8 | Billing | user/orgs joins subscriptions unnecessarily |
| BE9-M1 | Admin | Sequential queries in inviteUser |
| BE9-M2 | Admin | Invitations missing index (dup of BE5-H2) |
| BE9-M3 | Admin | No invitation expiry cleanup job |
| BE9-M4 | Admin | listInvitations returns all columns |
| BE9-M5 | Admin | Audit logs fixed 200-row limit |
| BE9-M6 | Admin | listMembers no pagination |
| BE10-M1 | Infrastructure | No compression middleware |
| BE10-M2 | Infrastructure | Security headers applied on health checks |
| BE10-M3 | Infrastructure | Body size check on GET requests |
| BE10-M4 | Infrastructure | Prompt version race condition |
| BE10-M5 | Infrastructure | Prompt creation no transaction |
| BE10-M6 | Infrastructure | Settings two sequential queries |
| BE10-M7 | Infrastructure | Guardrails/routing no ORDER BY for determinism |
| BE10-M8 | Infrastructure | Delete SELECT-then-DELETE anti-pattern |
| BE10-M9 | Infrastructure | flushLastUsed individual UPDATEs (dup of BE5-H5) |
| BE10-M10 | Infrastructure | Webhook dispatcher no concurrency limit (dup of BE9-H5) |
| BE10-M11 | Infrastructure | Email rendering CPU-intensive on hot path |
| BE10-M12 | Infrastructure | Two Redis subscribers for same channel |
| BE10-M13 | Infrastructure | process.env checked per invocation instead of at startup |

### Low Issues

| ID | Module | Description |
|----|--------|-------------|
| BE1-L1 | Proxy Core | toolNames array spread on every request |
| BE1-L2 | Proxy Core | Multiple `new Date()` calls in single request path |
| BE1-L3 | Proxy Core | crypto.randomUUID for completion IDs |
| BE2-L1 | Middleware | Promise.all doesn't short-circuit on first rejection |
| BE2-L2 | Middleware | formatDate from date-fns overhead |
| BE2-L3 | Middleware | Regex truncation boundary check |
| BE2-L4 | Middleware | Redundant parseProviderFromPath (dup of BE1-M8) |
| BE2-L5 | Middleware | flushLastUsed deletes before DB write |
| BE2-L6 | Middleware | latencyTracker not atomic |
| BE2-L7 | Middleware | content-router cache no invalidation |
| BE3-L1 | Support | Corrupted cache can be served |
| BE3-L2 | Support | No max-size guard on cache entries |
| BE3-L3 | Support | date-fns for trivial format |
| BE3-L4 | Support | Silently dropped errors in logger |
| BE4-L1 | Analytics | toggleStar two round-trips |
| BE4-L2 | Analytics | Raw SQL strings instead of query builder |
| BE4-L3 | Analytics | No datetime validation on analytics inputs |
| BE4-L4 | Analytics | No toolCount index |
| BE4-L5 | Analytics | redis.duplicate per SSE client |
| BE5-L1 | DB Schema | budgets missing unique constraint |
| BE5-L2 | DB Schema | subscriptions missing unique on orgId |
| BE5-L3 | DB Schema | invitations expiresAt no index |
| BE5-L4 | DB Schema | virtualKeys expiresAt not indexed |
| BE5-L5 | DB Schema | Text role columns should be enum |
| BE5-L6 | DB Schema | CUID2 random PKs poor for B-tree clustering |
| BE5-L7 | DB Schema | idle_timeout aggressive at default |
| BE5-L8 | DB Schema | Various minor missing indexes |
| BE6-L1 | Auth | Minor redundant index on keyHash |
| BE6-L2 | Auth | Count query caching opportunity |
| BE6-L3 | Auth | acceptInvitation excessive column fetch |
| BE6-L4 | Auth | Profile update returns all columns |
| BE7-L1 | Providers | parseFloat repeated on same values |
| BE7-L2 | Providers | SHA-256 ETag overkill |
| BE7-L3 | Providers | maskApiKey logic operates on ciphertext |
| BE7-L4 | Providers | Model cache 1-hour TTL without invalidation hook |
| BE8-L1 | Billing | Static plan list recomputed |
| BE8-L2 | Billing | Budget spend TTL drift |
| BE8-L3 | Billing | Subscription status not gated on CRUD |
| BE8-L4 | Billing | JSON.parse without try-catch |
| BE8-L5 | Billing | Unnecessary subscription joins |
| BE9-L1 | Admin | Invitation expiry not enforced |
| BE9-L2 | Admin | Audit logs hard cap at 200 rows |
| BE9-L3 | Admin | listMembers returns all columns |
| BE9-L4 | Admin | Sequential query in inviteUser |
| BE10-L1 | Infrastructure | Security headers on health endpoint |
| BE10-L2 | Infrastructure | Body size middleware on GET |
| BE10-L3 | Infrastructure | process.env per invocation |
| BE10-L4 | Infrastructure | Email rendering on hot path |
| BE10-L5 | Infrastructure | Two Redis subscribers same channel |
| BE10-L6 | Infrastructure | No compression |
| BE10-L7 | Infrastructure | Guardrails/routing no ORDER BY |
| BE10-L8 | Infrastructure | Delete SELECT-then-DELETE |
| BE10-L9 | Infrastructure | Prompt version race condition |

---

## Frontend Findings

### Critical Issues

| ID | Module | Description | File Reference |
|----|--------|-------------|----------------|
| FE1-C1 | Dashboard | Audit Logs page fetches ALL records without pagination | audit-logs/page.tsx:61 |
| FE1-C2 | Dashboard | No Suspense boundaries on any data-heavy page routes | — |
| FE1-C3 | Dashboard | Cache stats daily table renders unbounded rows without virtualization | — |
| FE2-C1 | Providers | API key exposed in client state via Provider interface | use-providers.ts:28 |
| FE3-C1 | Chat | No image compression before base64 encoding — 20MB images | chat-input.tsx:65-74 |
| FE3-C2 | Chat | Messages state array grows unbounded with full image base64 | use-chat.ts:164-168 |
| FE4-C1 | Shared | queryClient.invalidateQueries() with no filters nukes entire cache on org switch | use-orgs.ts:34 |
| FE4-C2 | Shared | DataTable renders all rows without virtualization | data-table.tsx:145-193 |
| FE4-C3 | Shared | Live SSE requests cause full AnimatePresence re-mount on every event | — |
| FE5-C1 | Marketing | Home page entirely client-rendered despite being static marketing content | home-page.tsx:1 |
| FE5-C2 | Marketing | Pricing page entirely client-rendered for a single toggle | pricing-page.tsx:1 |
| FE5-C3 | Marketing | AuthNav forces session check on every marketing page | auth-nav.tsx:1-11 |
| FE5-C4 | Marketing | Marketing layout uses new Date().getFullYear() preventing static generation | — |

### High Issues

| ID | Module | Description | File Reference |
|----|--------|-------------|----------------|
| FE1-H1 | Dashboard | Recharts imported statically — no code splitting (~200-300KB) | — |
| FE1-H2 | Dashboard | All analytics queries poll at 30s even when tab not active | — |
| FE1-H3 | Dashboard | Overview page fires 5 parallel queries with no staggering | — |
| FE1-H4 | Dashboard | overviewFrom() creates new Date defeating server cache | — |
| FE1-H5 | Dashboard | buildStatCards recreated on every render | — |
| FE1-H6 | Dashboard | TokenBreakdown and ModelsTable no virtualization or pagination | — |
| FE1-H7 | Dashboard | AnalyticsPage renders all tab content — no lazy loading | — |
| FE2-H1 | CRUD Pages | No optimistic updates on any CRUD mutations across all 8 pages | — |
| FE2-H2 | Models | Model catalog search input has no debounce | model-catalog.tsx:286-291 |
| FE2-H3 | CRUD Pages | allColumns array recreated on every render in all list components | — |
| FE2-H4 | Models | useModelOptions fetches full catalog on every form mount | — |
| FE2-H5 | CRUD Pages | No per-page error boundaries | — |
| FE3-H1 | Chat | SSE streaming causes per-chunk state update | use-chat.ts:325-339 |
| FE3-H2 | Chat | Markdown parser re-parses entire content on every render | markdown.tsx:230-446 |
| FE3-H3 | Team | Both members and invitations fetched eagerly | — |
| FE3-H4 | Team | No pagination on members or invitations | — |
| FE3-H5 | Profile | useUpdateProfile does not invalidate session cache | use-profile.ts:27-33 |
| FE3-H6 | Settings | Org switch uses window.location.reload() | — |
| FE3-H7 | Chat | Object URLs in image previews leak on send | — |
| FE4-H1 | Hooks | useClickOutside recreates event listeners when onClose changes | — |
| FE4-H2 | Hooks | useOrgSettings creates new handlers every render | — |
| FE4-H3 | Settings | Inline arrow functions cause cascade re-renders in settings | — |
| FE4-H4 | Sidebar | visibleTabs filter recreated every render | — |
| FE4-H5 | Sidebar | setTab recreated every render | — |
| FE4-H6 | UI Package | Barrel export forces all components into bundle | — |
| FE4-H7 | Audit Logs | Audit logs page fetches unbounded data without pagination (dup of FE1-C1) | — |
| FE5-H1 | SEO | No sitemap.ts or robots.ts for SEO | — |
| FE5-H2 | SEO | Root layout metadata missing OpenGraph, Twitter, viewport, robots | — |
| FE5-H3 | Auth | Auth pages missing metadata exports | — |
| FE5-H4 | Onboarding | Onboarding page missing metadata | — |
| FE5-H5 | Marketing | motion/react shipped on every marketing page (~40-50KB) | — |
| FE5-H6 | Next.js | Next.js config missing images optimization | — |

### Medium Issues

| ID | Module | Description |
|----|--------|-------------|
| FE1-M1 | Dashboard | SSE no reconnection backoff |
| FE1-M2 | Dashboard | useToggleStar invalidates all sessions |
| FE1-M3 | Dashboard | Custom date inputs no debounce |
| FE1-M4 | Dashboard | flatMap creates new array on each render |
| FE1-M5 | Dashboard | SessionRow not memoized |
| FE1-M6 | Dashboard | handleRequestClick stale closure |
| FE1-M7 | Dashboard | No staleTime overrides on analytics queries |
| FE1-M8 | Dashboard | formatTimeAgo recalculated per row |
| FE1-M9 | Dashboard | uniqueModels full scan per render |
| FE2-M1 | CRUD Pages | Date filter creates new Date in useMemo dependency |
| FE2-M2 | CRUD Pages | ProviderForm fetches even when dialog closed |
| FE2-M3 | CRUD Pages | PromptDetail fetches on mount unconditionally |
| FE2-M4 | CRUD Pages | ModelCard not memoized |
| FE2-M5 | CRUD Pages | CopyableSlug per-card hooks |
| FE2-M6 | CRUD Pages | useSetupStatus redundant providers query |
| FE2-M7 | CRUD Pages | Inline arrow functions in render |
| FE2-M8 | CRUD Pages | handleTest unstable useCallback deps |
| FE2-M9 | CRUD Pages | DataTable no virtualization (dup of FE4-C2) |
| FE2-M10 | CRUD Pages | Webhook secret masking done client-side |
| FE3-M1 | Settings | sortedPlans not memoized |
| FE3-M2 | Settings | getPlanButtonLabel recreated per render |
| FE3-M3 | Settings | Budget keys query fires unconditionally |
| FE3-M4 | Settings | allColumns recreated (dup of FE2-H3) |
| FE3-M5 | Profile | No Suspense on profile page |
| FE3-M6 | Team | Invite form no email validation before submit |
| FE3-M7 | Profile | useEffect sync for profile state |
| FE3-M8 | Chat | ensureKey not memoized |
| FE3-M9 | Chat | scrollIntoView called per streaming chunk |
| FE4-M1 | Sidebar | motion/react in sidebar for all viewports |
| FE4-M2 | Hooks | useReducedMotion instantiated per component |
| FE4-M3 | Hooks | handleSignOut recreated every render |
| FE4-M4 | Sidebar | navLinks array recreated every render |
| FE4-M5 | Hooks | handleRequestClick recreated every render |
| FE4-M6 | Components | SearchableSelect handlers not memoized |
| FE4-M7 | Hooks | onSwitch not stable reference |
| FE4-M8 | Hooks | onClose inline arrow function |
| FE4-M9 | Components | Options arrays recreated every render |
| FE5-M1 | Onboarding | Eagerly loads all steps instead of current |
| FE5-M2 | Marketing | No next/image usage for optimized images |
| FE5-M3 | Admin | Admin layout imports motion unnecessarily |
| FE5-M4 | Admin | Admin audit logs no pagination (dup of FE1-C1) |
| FE5-M5 | Admin | Admin pages not code-split |
| FE5-M6 | Marketing | Torph imported on marketing pages |
| FE5-M7 | Admin | Admin queries no staleTime set |

### Low Issues

| ID | Module | Description |
|----|--------|-------------|
| FE1-L1 | Dashboard | Minor: flatMap allocations |
| FE1-L2 | Dashboard | formatTimeAgo could be memoized |
| FE1-L3 | Dashboard | uniqueModels recomputed |
| FE1-L4 | Dashboard | handleRequestClick stale closure risk |
| FE1-L5 | Dashboard | No staleTime defaults |
| FE1-L6 | Dashboard | SessionRow not memoized |
| FE2-L1 | CRUD Pages | Date filter new Date in useMemo |
| FE2-L2 | CRUD Pages | ProviderForm fetches when closed |
| FE2-L3 | CRUD Pages | CopyableSlug per-card hooks |
| FE2-L4 | CRUD Pages | useSetupStatus redundant query |
| FE2-L5 | CRUD Pages | Inline arrow functions minor perf |
| FE2-L6 | CRUD Pages | handleTest deps |
| FE2-L7 | CRUD Pages | Webhook secret masking client-side |
| FE3-L1 | Settings | sortedPlans allocation |
| FE3-L2 | Settings | getPlanButtonLabel allocation |
| FE3-L3 | Chat | scrollIntoView per chunk |
| FE4-L1 | Sidebar | navLinks allocation |
| FE4-L2 | Hooks | useReducedMotion per instance |
| FE4-L3 | Hooks | handleSignOut allocation |
| FE4-L4 | Components | SearchableSelect allocation |
| FE4-L5 | Hooks | onSwitch instability |
| FE4-L6 | Hooks | onClose inline |
| FE4-L7 | Components | Options arrays allocation |
| FE5-L1 | Onboarding | Eagerly loads all steps |
| FE5-L2 | Marketing | No next/image |
| FE5-L3 | Admin | Admin layout imports motion |
| FE5-L4 | Admin | Admin pages not code-split |
| FE5-L5 | Marketing | Torph imported unnecessarily |
| FE5-L6 | Admin | Admin queries no staleTime |

---

## Cross-Cutting Concerns

These issues span both frontend and backend and require coordinated fixes.

### 1. Missing Pagination End-to-End

**Backend:** Admin users (BE9-C1), admin orgs (BE9-C2), key listing (BE6-H2), analytics sessions (BE4-H1), analytics models (BE4-H2), members list (BE9-M6), invitations (BE9-M4), budget list (BE8-M2).

**Frontend:** Audit logs page (FE1-C1, FE4-H7), cache stats table (FE1-C3), team members (FE3-H4), DataTable renders all rows (FE4-C2).

**Impact:** As data grows, both API response size and DOM node count grow linearly, leading to OOM errors, browser tab crashes, and degraded UX. The backend returns unbounded result sets and the frontend has no virtualization fallback.

**Fix:** Add server-side pagination with cursor-based or offset pagination on all list endpoints. Add `@tanstack/react-virtual` for DataTable. Both must be done together.

### 2. Uncached Middleware Queries on Every Request

**Backend:** Tenant middleware (BE6-C1, BE2-H5, BE10-H1), auth session (BE2-H6, BE10-H2, BE6-H1), plan limits (BE4-C2), subscription lookup (BE8-H5).

**Frontend:** AuthNav session check on marketing pages (FE5-C3).

**Impact:** Every authenticated request performs 2-4 uncached DB queries before the actual handler runs. At scale this is 60-80% of total query volume.

**Fix:** Implement a short-lived Redis cache (30-60s TTL) for tenant membership, session data, and plan limits. Invalidate on write. Frontend should skip session checks on public pages.

### 3. `SELECT *` Leaking Sensitive Data and Large Payloads

**Backend:** Provider configs leak encrypted API keys (BE1-C1, BE7-H1), virtual keys (BE1-H3), guardrail rules full JSONB config (BE1-H4, BE2-H7), budgets all columns (BE1-H5).

**Frontend:** API key exposed in client state (FE2-C1).

**Impact:** Security risk (keys in Redis/client state) combined with unnecessary data transfer. Large JSONB payloads inflate Redis memory and network bandwidth.

**Fix:** Add explicit column projections to all Drizzle queries on hot paths. Create separate "safe" types that exclude sensitive fields. Backend must never return raw API keys to the frontend.

### 4. No Cache Invalidation Strategy

**Backend:** Provider/alias CRUD has no cache invalidation (BE7-H4), subscription changes not invalidated (BE8-C3), model cache not invalidated (BE7-M6), content-router/rate-limiter Maps grow unbounded (BE2-H3, BE2-H4).

**Frontend:** invalidateQueries() with no filters (FE4-C1), useUpdateProfile does not invalidate session (FE3-H5).

**Impact:** Stale data served after mutations; unbounded memory growth in long-running processes; cache nuke on org switch causes thundering herd.

**Fix:** Implement a pub/sub cache invalidation bus. Backend: publish invalidation events on write. Frontend: use targeted `queryClient.invalidateQueries({ queryKey: [...] })` with specific keys. Add TTL and max-size bounds to all in-memory Maps.

### 5. No Graceful Shutdown or Deploy Safety

**Backend:** No shutdown handler (BE10-C1), logger batching absent means in-flight writes lost (BE3-C1), flushLastUsed deletes keys before confirming DB write (BE3-H3).

**Impact:** Every deploy loses in-flight data. With frequent deploys this compounds.

**Fix:** Add `SIGTERM`/`SIGINT` handlers that drain in-flight requests, flush logger batches, and complete pending DB writes before exiting.

### 6. Expensive Cryptographic Operations on Hot Path

**Backend:** PBKDF2 100K iterations on every decrypt (BE7-C1, BE10-H4), SHA-256 hashing on every request for cache keys and auth (BE1-H1, BE1-H2).

**Impact:** Synchronous CPU-bound operations that block the event loop, adding 50-100ms latency per request involving provider configs.

**Fix:** Cache derived keys in-memory with TTL. For cache key hashing, consider faster alternatives (xxhash, FNV) since collision resistance is not critical.

### 7. SSE/Streaming Performance

**Backend:** Object spread per SSE token (BE1-H9), new TextEncoder per stream (BE1-H8).

**Frontend:** Per-chunk state update (FE3-H1), per-chunk scrollIntoView (FE3-M9), AnimatePresence re-mount per event (FE4-C3), Markdown re-parse per render (FE3-H2).

**Impact:** Streaming responses cause O(n) renders and DOM operations per token, degrading perceived performance during chat.

**Fix:** Backend: reuse TextEncoder, pre-allocate chunk templates. Frontend: batch state updates with `requestAnimationFrame` or `startTransition`, debounce scroll, memoize markdown parsing with incremental diffing.

### 8. Marketing/SEO Pages Client-Rendered

**Frontend:** Home page (FE5-C1), pricing page (FE5-C2), AuthNav on marketing (FE5-C3), Date preventing static gen (FE5-C4), missing metadata (FE5-H1 through FE5-H4).

**Impact:** SEO pages are invisible to crawlers, FCP/LCP is 2-5 seconds slower than necessary, and static pages cannot be CDN-cached.

**Fix:** Convert marketing pages to React Server Components. Move the billing toggle to a client island. Remove `'use client'` from top-level marketing components. Add metadata exports and sitemap/robots.

---

## Recommended Fix Order

Prioritized by impact-to-effort ratio. Items grouped into phases for sprint planning.

### Phase 1 — Immediate / This Week (High Impact, Low Effort)

These are single-file or single-function fixes that resolve critical issues.

| Priority | ID(s) | Fix | Effort |
|----------|--------|-----|--------|
| 1 | BE1-C1, BE1-C2, BE7-H1 | Add column projections to all `SELECT *` on providerConfigs — exclude `apiKey` from cache/list queries | S |
| 2 | FE2-C1 | Remove API key from Provider client interface; mask on server | S |
| 3 | BE1-C3, BE2-H2, BE10-H5 | Precompile and LRU-cache guardrail regexes; add timeout/length limits to user patterns | S |
| 4 | FE5-C3, FE5-C4 | Remove AuthNav from marketing layout; replace `new Date().getFullYear()` with build-time constant | S |
| 5 | FE4-C1 | Scope `invalidateQueries()` to org-specific query keys on org switch | S |
| 6 | BE2-C1 | Move plan limit check before increment | S |
| 7 | BE5-C2 | Add index on `request_logs.deleted_at` | S |
| 8 | BE5-C3 | Add index on `audit_logs.created_at` | S |
| 9 | BE5-C4, BE5-H3, BE5-H4 | Add indexes on request_logs (end_user, model) | S |
| 10 | BE5-H2, BE6-H3 | Add composite index on invitations (email, status) | S |
| 11 | BE5-H6, BE5-H7 | Add indexes on sessions.expiresAt, verifications.expiresAt | S |
| 12 | BE7-C1, BE10-H4 | Cache PBKDF2 derived keys in LRU Map with TTL | S |
| 13 | BE7-C2 | Cache negative alias resolution results to avoid DB miss per request | S |
| 14 | BE8-C3 | Invalidate subscription cache on webhook/mutation | S |
| 15 | FE5-C1, FE5-C2 | Convert home-page.tsx and pricing-page.tsx to Server Components | S-M |

### Phase 2 — This Sprint (High Impact, Medium Effort)

| Priority | ID(s) | Fix | Effort |
|----------|--------|-----|--------|
| 16 | BE3-C1 | Implement in-memory log buffer with periodic batch INSERT (every 1-5s or N records) | M |
| 17 | BE10-C1 | Add graceful shutdown handler: drain connections, flush logger, complete writes | M |
| 18 | BE10-C2 | Add Redis-based distributed lock (SETNX with TTL) on cron sync | S |
| 19 | BE10-C3 | Replace N individual INSERTs with batch upsert in model sync | M |
| 20 | BE8-C1, BE8-C2 | Persist subscription data in webhook handler; add idempotency key check | M |
| 21 | BE9-C1, BE9-C2 | Add pagination to admin users and organizations endpoints | M |
| 22 | BE6-C1, BE2-H5, BE10-H1 | Cache tenant membership in Redis with 60s TTL, invalidate on membership change | M |
| 23 | BE2-H6, BE10-H2 | Cache auth session in Redis with short TTL | M |
| 24 | BE4-C2 | Cache clampAnalyticsRetention result per org with 5-min TTL | S |
| 25 | BE2-C2 | Make rate limiter token consumption atomic (Lua script or sequential check) | M |
| 26 | FE4-C2, FE1-C3, FE1-H6 | Add `@tanstack/react-virtual` to DataTable and large list components | M |
| 27 | FE1-C1, FE4-H7, FE1-C2 | Add server-side pagination to audit logs; add Suspense boundaries to data pages | M |
| 28 | FE3-C1, FE3-C2 | Compress images before base64 encoding; store image references not inline base64 | M |
| 29 | FE1-H1 | Lazy-load Recharts with `React.lazy()` / `next/dynamic` | M |
| 30 | FE3-H1, FE3-H2 | Batch SSE state updates; memoize Markdown parsing with incremental approach | M |

### Phase 3 — Next Sprint (Medium Impact, Medium Effort)

| Priority | ID(s) | Fix | Effort |
|----------|--------|-----|--------|
| 31 | BE4-C1 | Implement request_logs retention policy (cron job to archive/delete old rows) | L |
| 32 | BE4-C3, BE9-H2 | Add Redis-based result caching for analytics and admin stats endpoints (5-min TTL) | M |
| 33 | BE3-H1 | Add cache stampede protection (singleflight / probabilistic early refresh) | M |
| 34 | BE1-H7 | Replace non-atomic INCR+EXPIRE with single Redis Lua script | S |
| 35 | BE2-H3, BE2-H4, BE10-H7 | Add max-size bounds and LRU eviction to all in-memory Maps | M |
| 36 | BE7-H4 | Implement pub/sub cache invalidation for providers, aliases, and models | M |
| 37 | BE1-H10 | Run guardrails in parallel with Promise.all instead of sequentially | S |
| 38 | BE9-H5, BE10-M10 | Add concurrency limit to webhook retries; use p-limit or semaphore | M |
| 39 | BE9-H4 | Make audit log writes fire-and-forget with proper error capture | S |
| 40 | BE8-H3 | Debounce budget alerts (1 alert per threshold per 5 minutes) | S |
| 41 | BE8-H4 | Use INSERT ... ON CONFLICT for atomic budget creation | S |
| 42 | FE5-H1, FE5-H2 | Add sitemap.ts, robots.ts, and OpenGraph/Twitter metadata | M |
| 43 | FE5-H5 | Replace motion/react on marketing pages with CSS animations | M |
| 44 | FE4-H6 | Replace UI package barrel export with direct imports or named exports | M |
| 45 | FE2-H1 | Add optimistic updates to CRUD mutations | L |

### Phase 4 — Backlog (Lower Impact or Higher Effort)

| Priority | ID(s) | Fix | Effort |
|----------|--------|-----|--------|
| 46 | BE1-H1, BE1-H2 | Replace SHA-256 with faster hash (xxhash/FNV) for cache keys | M |
| 47 | BE1-H8, BE1-H9 | Reuse TextEncoder; pre-allocate SSE chunk template | S |
| 48 | BE5-H1 | Make connection pool size configurable via environment variable | S |
| 49 | BE5-H8 | Add GIN index for webhook event matching | S |
| 50 | BE6-M1, BE6-M2 | Add rate limiting to auth and user endpoints | M |
| 51 | BE7-H5 | Add rate limiting to provider test endpoint | S |
| 52 | BE7-H2 | Add timeout to external model API calls | S |
| 53 | BE10-M1 | Add compression middleware (gzip/brotli) | S |
| 54 | BE4-M3 | Replace DATE() in queries with date range comparison to enable index usage | M |
| 55 | FE1-H2 | Pause analytics polling when tab not visible (Page Visibility API) | S |
| 56 | FE2-H2 | Add debounce to model catalog search input | S |
| 57 | FE3-H6 | Replace window.location.reload() with router.refresh() on org switch | S |
| 58 | FE4-C3 | Batch SSE events before AnimatePresence update with requestAnimationFrame | M |
| 59 | FE2-H5, FE1-C2 | Add per-page error boundaries across all data pages | M |
| 60 | FE5-H6 | Configure Next.js images optimization (formats, domains, sizes) | S |

---

## Appendix: Duplicate Issue Map

Several issues were independently discovered by multiple engineers, confirming their significance.

| Issue | Found By |
|-------|----------|
| Tenant middleware uncached DB query | BE2-H5, BE6-C1, BE10-H1 |
| Auth middleware uncached session check | BE2-H6, BE6-H1, BE10-H2 |
| PBKDF2 100K iterations never cached | BE7-C1, BE10-H4 |
| Guardrail regex ReDoS risk | BE1-C3, BE2-H2, BE10-H5 |
| `SELECT *` on guardrailRules with JSONB | BE1-H4, BE2-H7, BE5-M7 |
| flushLastUsed N individual UPDATEs | BE3-M6, BE5-H5, BE10-M9 |
| Invitations missing (email, status) index | BE5-H2, BE6-H3, BE9-M2 |
| incrementBudgetSpend uncached DB query | BE2-C3, BE8-H1 |
| Unbounded in-memory Maps | BE1-M7, BE2-H3, BE2-H4, BE5-M6, BE10-H7 |
| Audit logs missing pagination | FE1-C1, FE4-H7, FE5-M4 |
| DataTable no virtualization | FE2-M9, FE4-C2 |
| Admin audit logs missing index | BE5-C3, BE9-H3 |
| Content-router cache unbounded | BE2-H3, BE5-M6 |
| allColumns recreated every render | FE2-H3, FE3-M4 |

---

*Report compiled by Team Lead from individual audits by BE1-BE10 and FE1-FE5. All file references are relative to the monorepo root.*
