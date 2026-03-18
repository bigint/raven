# Raven Competitive Gap Analysis

Synthesized from 6 specialized research agents. Deduplicated, categorized, and effort-estimated for PRD planning.

---

## Biggest Competitive Gap

**Conversation content storage and viewer.** Raven logs request metadata (tokens, cost, latency, model, tools) but does not store or display the actual prompt/response message content. Every major competitor (Helicone, Langfuse, Portkey, LiteLLM) shows the full conversation thread for each request. This is the single most impactful missing feature for debugging, compliance, and prompt engineering workflows.

---

## P0 -- Must Have

| # | Feature | Category | Effort | Notes |
|---|---------|----------|--------|-------|
| 1 | **Conversation content storage and viewer** | Logs & Sessions | HIGH | Requires new DB column(s) for prompt/response content, proxy logger changes to capture message bodies, and a new viewer component in the request detail slide-over. Biggest gap overall. |
| 2 | **Google (Gemini) provider support** | Providers & Proxy | MEDIUM | Add `google` to `SUPPORTED_PROVIDERS` and `PROVIDER_SLUG_MAP` in `model-sync.ts`, add Gemini provider in `ai-provider-factory.ts`, add icon. AI SDK already supports Google provider. |
| 3 | **Agent setup / integration guide tab** | Settings & Onboarding | LOW | New tab in settings with copy-paste config snippets for Claude Code, Codex CLI, Cursor, Windsurf, etc. Frontend-only -- no backend changes needed. |
| 4 | **Configurable page size selector** | Dashboard & Tables | LOW | Backend already accepts `limit` param (1-100) in query schemas. Just needs a frontend dropdown on request/session/logs tables to let users choose page size. |
| 5 | **Per-key analytics dashboard** | Dashboard & Analytics | MEDIUM | Backend already supports `virtualKeyId` filter on requests endpoint. Needs a new dashboard view that aggregates stats per key with charts. |
| 6 | **Session cost column** | Logs & Sessions | LOW | `totalCost` already returned by the sessions API. Just needs to be added as a column in the `LogsTable` component -- currently missing from `TABLE_HEADERS`. |
| 7 | **Chart view toggle (Tokens / Cost / Requests)** | Adoption & Charts | LOW | Frontend-only. The adoption tab already has metric selection for bars view; extend this to the chart view as well. |
| 8 | **CSV / JSON export for analytics** | Dashboard & Analytics | LOW | Frontend-only. Add export button that serializes current table/chart data to CSV. No backend changes needed. |

---

## P1 -- Should Have

| # | Feature | Category | Effort | Notes |
|---|---------|----------|--------|-------|
| 9 | **Throughput metrics (Tokens/Second)** | Dashboard & Analytics | LOW | `latencyMs`, `inputTokens`, and `outputTokens` already exist per request. Compute `outputTokens / (latencyMs / 1000)` in the request detail panel and as a column. |
| 10 | **Provider test button** | Settings & Providers | MEDIUM | POST endpoint that makes a minimal API call (e.g., list models) to verify connectivity after setup. Needs backend route + frontend button in provider list. |
| 11 | **Advanced filter system for sessions/logs** | Logs & Sessions | MEDIUM | Add filter controls for model, key, status on the sessions page. Backend `logsQuerySchema` already supports `model` and `virtualKeyId` filters but frontend does not expose them. |
| 12 | **Column visibility toggle** | Dashboard & Tables | LOW | Frontend-only. Add a column picker dropdown to `DataTable` component. Applies to requests, sessions, models, and adoption tables. |
| 13 | **User identity tracking** | Logs & Sessions | MEDIUM | Parse `x-user-id` header in proxy and store in a new `userId` column on `request_logs`. Display as filterable dimension in analytics. |
| 14 | **Model aliasing** | Models & Proxy | MEDIUM | Allow orgs to define aliases (e.g., `fast` -> `claude-3-5-haiku`). Needs DB table, CRUD API, and resolution in proxy `provider-resolver`. |
| 15 | **Models count in provider list** | Settings & Providers | LOW | Query count of models per provider and display as a column in `ProviderList`. Frontend + simple aggregate query. |
| 16 | **Flexible date range selection** | Dashboard & Analytics | LOW | Replace fixed pill tabs (7d/30d/90d) with a custom date picker component. Backend already accepts arbitrary `from`/`to` ISO strings. |
| 17 | **Request starring/favoriting** | Dashboard & Requests | MEDIUM | New `is_starred` boolean on `request_logs` or a separate `starred_requests` table. Needs CRUD endpoint + UI toggle. |
| 18 | **User Agent as grouping dimension** | Adoption & Charts | LOW | `userAgent` column exists on `request_logs` but is never populated by the proxy logger. One-line fix to populate it, then add as a `groupBy` option in adoption. |
| 19 | **Daily Active Users cohort analysis** | Adoption & Charts | HIGH | Requires computing Active/Departed/New/Returned user cohorts. Needs either userId tracking (see #13) or key-based proxy for identity, plus new backend aggregation queries and chart components. |

---

## P2 -- Nice to Have

| # | Feature | Category | Effort | Notes |
|---|---------|----------|--------|-------|
| 20 | **Column sorting and per-column filtering** | Dashboard & Tables | MEDIUM | Enhance `DataTable` with sortable headers and inline filter inputs. Frontend-only but touches shared UI component. |
| 21 | **OpenAPI specification generation** | API & Docs | MEDIUM | Generate OpenAPI 3.1 spec from Hono route definitions. Can use `@hono/zod-openapi` or manually author the spec. |
| 22 | **Interactive API documentation (Scalar)** | API & Docs | MEDIUM | Depends on OpenAPI spec (#21). Integrate Scalar or Stoplight Elements to render interactive API docs. Raven already has static Mintlify docs. |
| 23 | **Tool call detail viewer** | Logs & Sessions | MEDIUM | Show tool call arguments and responses in the request detail panel. Requires storing tool call content (related to #1). |
| 24 | **JSON config export/import** | Settings | LOW | Frontend-only. Serialize org settings (providers, keys, guardrails, routing rules) to JSON for backup/migration. |
| 25 | **Sankey/flow diagram for request routing** | Adoption & Charts | HIGH | Visual diagram showing request flow from key -> model -> provider. Needs a charting library addition (e.g., D3 Sankey). |
| 26 | **DAU/WAU/MAU ratio metrics** | Adoption & Charts | MEDIUM | Depends on user identity tracking (#13). Compute daily/weekly/monthly active user ratios. |
| 27 | **RFC 9457 error format** | API | LOW | Standardize API error responses to Problem Details format. Backend refactor of `errors.ts` response shape. |
| 28 | **ETag concurrency control** | API | LOW | Add ETag headers to GET responses and If-Match checks on updates. Backend-only middleware addition. |
| 29 | **Grant/policy-based access control** | Settings & Security | HIGH | Replace simple role-based access with fine-grained policies. Major backend + frontend effort. |
| 30 | **Request throughput dashboard** | Dashboard & Analytics | MEDIUM | Time-series chart of requests/minute or requests/second. Needs new aggregation query and chart component. |

---

## Grouped by Epic

### Epic 1: Observability & Debugging
- #1 Conversation content storage and viewer (P0, HIGH)
- #9 Throughput metrics (P1, LOW)
- #17 Request starring/favoriting (P1, MEDIUM)
- #23 Tool call detail viewer (P2, MEDIUM)

### Epic 2: Table & Dashboard UX
- #4 Configurable page size selector (P0, LOW)
- #6 Session cost column (P0, LOW)
- #7 Chart view toggle (P0, LOW)
- #8 CSV/JSON export (P0, LOW)
- #12 Column visibility toggle (P1, LOW)
- #20 Column sorting and per-column filtering (P2, MEDIUM)

### Epic 3: Provider Ecosystem
- #2 Google Gemini support (P0, MEDIUM)
- #10 Provider test button (P1, MEDIUM)
- #14 Model aliasing (P1, MEDIUM)
- #15 Models count in provider list (P1, LOW)

### Epic 4: User & Key Analytics
- #5 Per-key analytics dashboard (P0, MEDIUM)
- #13 User identity tracking (P1, MEDIUM)
- #18 User Agent population (P1, LOW)
- #19 DAU cohort analysis (P1, HIGH)
- #26 DAU/WAU/MAU ratios (P2, MEDIUM)

### Epic 5: Filtering & Date Ranges
- #11 Advanced filter system (P1, MEDIUM)
- #16 Flexible date range selection (P1, LOW)

### Epic 6: Onboarding & Documentation
- #3 Agent setup / integration guide tab (P0, LOW)
- #21 OpenAPI specification (P2, MEDIUM)
- #22 Interactive API docs (P2, MEDIUM)

### Epic 7: Platform Hardening
- #24 JSON config export/import (P2, LOW)
- #27 RFC 9457 error format (P2, LOW)
- #28 ETag concurrency control (P2, LOW)
- #29 Grant/policy-based access control (P2, HIGH)
- #25 Sankey routing diagram (P2, HIGH)
- #30 Request throughput dashboard (P2, MEDIUM)

---

## Quick Wins (LOW effort, high impact)

These can ship in a single sprint with no backend changes:

| # | Feature | Why it is fast |
|---|---------|---------------|
| 4 | Page size selector | Backend already accepts `limit` param |
| 6 | Session cost column | Data already in API response, just not rendered |
| 7 | Chart view toggle | Extend existing metric selector |
| 8 | CSV export | Serialize existing frontend data |
| 9 | Throughput metric | Arithmetic on existing fields |
| 12 | Column visibility | UI-only DataTable enhancement |
| 18 | User Agent population | Column exists, just never set in proxy logger (one-line fix in `logger.ts`) |
| 3 | Integration guide tab | Static content page, no API needed |

---

## Backend Support Already Exists (frontend-only work)

| Feature | Backend evidence |
|---------|-----------------|
| Configurable page size | `requestsQuerySchema` accepts `limit` 1-100, default 20 |
| Session cost | `getSessions()` returns `totalCost` in response |
| Virtual key filtering | `requestsQuerySchema` accepts `virtualKeyId` |
| Model filtering on logs | `logsQuerySchema` accepts `model` and `virtualKeyId` |
| Arbitrary date ranges | All query schemas accept `from`/`to` ISO strings |
| User Agent column | `request_logs.userAgent` exists in schema |
