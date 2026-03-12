# Raven Product Roadmap

> **Team Lead + Product Manager alignment document**
> Date: 2026-03-12

---

## Current State Assessment

### What's production-ready
- Proxy pipeline (auth → rate limit → resolve → forward → log)
- Virtual key management with per-key rate limits (RPM/RPD)
- Provider config management (multiple keys per provider, `~configId` routing, random load balancing)
- Token extraction (buffered + streaming, OpenAI + Anthropic formats)
- Cost estimation (hardcoded per-model pricing)
- Real-time analytics (SSE via Redis pub/sub)
- Team/org management with role-based access
- Onboarding flow (org → provider → key)
- Audit log schema + API

### What's schema-only (built but not enforced)
- **Guardrails** — Full CRUD, 4 rule types, 3 actions. Never evaluated in proxy pipeline.
- **Budgets** — Full CRUD, daily/monthly periods, alert thresholds. No spending tracked against them.
- **Billing** — Plan matrix (free/pro/team/enterprise), pricing, Paddle webhook stub. No limits enforced.
- **SSO** — DB schema for SAML/OIDC. No implementation.
- **Audit logs** — `logAudit` function exists but not called from any handler.

### What doesn't exist at all
- Retries & automatic failover
- Response caching / semantic caching
- Advanced routing (round-robin, weighted, cost-based, conditional)
- Guardrail evaluation engine
- Multi-modal awareness
- Agentic workflow support
- MCP Gateway

---

## Roadmap

### Phase 1: Make What We Have Actually Work (Weeks 1–3)

**PM rationale:** We have 5 features that users can configure through the UI but that do absolutely nothing behind the scenes. This is a trust problem. Before adding anything new, wire up what we already ship.

#### 1.1 Guardrail Enforcement
- Build a rule evaluation engine that runs before forwarding requests
- `block_topics`: keyword/phrase matching against request messages
- `pii_detection`: regex-based PII patterns (email, phone, SSN, credit card)
- `content_filter`: configurable blocked content categories
- `custom_regex`: user-defined regex patterns
- Evaluate rules in priority order, short-circuit on `block` action
- `warn` action: add warning header to response, log event
- `log` action: log match event, allow request through
- Wire into proxy handler between rate limit and provider resolution

#### 1.2 Budget Enforcement
- Track cumulative spend per budget entity (org/team/key) per period
- On each logged request, increment running total in Redis (fast path) with periodic DB sync
- Check budget before forwarding: if over limit, return 429 with budget exceeded error
- Alert threshold: publish `budget.alert` event when crossing threshold percentage
- Auto-reset on period boundary (daily/monthly)

#### 1.3 Billing Plan Limits
- Enforce request quotas per plan tier (free: 10K/mo, pro: 500K/mo, etc.)
- Enforce feature gates: guardrails (pro+), teams (team+), SSO (enterprise), audit logs (enterprise)
- Track monthly request count in Redis, reset on billing cycle
- Return 403 with upgrade prompt when limit hit

#### 1.4 Audit Log Integration
- Call `logAudit` from every mutating handler: provider CRUD, key CRUD, guardrail CRUD, budget CRUD, team/member changes, org settings, billing events
- Add audit log viewer to dashboard (filterable table)

#### 1.5 Streaming Token Counting
- Currently streaming responses log 0 tokens/cost — the `StreamTokenAccumulator` exists but isn't wired into the handler for streaming responses
- Wire accumulator into streaming path so costs are tracked accurately

---

### Phase 2: Reliability & Intelligence (Weeks 4–6)

**PM rationale:** Production AI apps need reliability guarantees. Retries, fallbacks, and caching are table stakes for teams evaluating an AI gateway. This is what gets us from "dev tool" to "production infrastructure."

#### 2.1 Automatic Retries with Exponential Backoff
- Configurable retry policy per provider config: max retries (default 2), backoff multiplier
- Retry on: 429 (rate limited), 500/502/503/504 (server errors)
- Do NOT retry on: 400/401/403/404 (client errors)
- Exponential backoff: 500ms → 1s → 2s (with jitter)
- Log each retry attempt

#### 2.2 Provider Fallbacks
- Allow defining fallback chains: e.g., OpenAI → Anthropic → Google
- If primary provider fails after retries, try next in fallback chain
- Model mapping config: map `gpt-4o` → `claude-sonnet-4-20250514` → `gemini-2.0-flash` for fallback
- Log which provider ultimately served the request

#### 2.3 Response Caching
- Cache identical requests (same model + messages hash) for configurable TTL
- Cache key: SHA256 of (provider + model + messages + temperature + key params)
- Store in Redis with TTL (default 1 hour, configurable per org)
- Set `cacheHit: true` on cached responses (field already exists in schema)
- Skip cache for streaming requests
- Cache invalidation API endpoint

#### 2.4 Smart Routing
- **Round-robin**: Distribute requests evenly across provider configs (using Redis counter)
- **Weighted**: Assign weights to configs (e.g., 70% production key, 30% backup key)
- **Latency-based**: Track p50 latency per config, prefer faster ones
- **Cost-based**: Route to cheapest provider that supports the requested model
- Routing strategy configurable per organization

---

### Phase 3: Platform Features (Weeks 7–10)

**PM rationale:** These features move Raven from "proxy with extras" to "AI platform." They're the features that enterprise buyers put on RFP checklists and that differentiate us from open-source alternatives.

#### 3.1 SSO Implementation
- SAML 2.0 support (schema already exists)
- OIDC support (schema already exists)
- Configuration UI in org settings (enterprise plan)
- Auto-provisioning: create user accounts on first SSO login
- Role mapping from SSO provider attributes

#### 3.2 Prompt Management
- Prompt template storage with versioning
- Variable interpolation (`{{user_input}}`, `{{context}}`)
- A/B testing: split traffic between prompt versions
- Performance tracking per prompt version (cost, latency, token usage)
- API: reference prompts by name+version in proxy requests

#### 3.3 Model Routing by Content
- Route requests to different models based on content analysis
- Simple classifier: short/simple queries → cheaper model, complex → expensive model
- Token count estimation before routing
- Configurable rules: "if estimated tokens < 500, use gpt-4o-mini"

#### 3.4 Webhook Notifications
- Configurable webhooks for events: budget alerts, guardrail triggers, error spikes, cost thresholds
- Webhook management UI
- Retry failed webhook deliveries (3 attempts with backoff)
- Webhook signing for verification

---

### Phase 4: Advanced Capabilities (Weeks 11–14)

**PM rationale:** Forward-looking features that position Raven for the AI agent era. These are differentiators, not table stakes — build them after the foundation is solid.

#### 4.1 Multi-modal Support
- Image/vision request awareness: detect and log image inputs
- Cost estimation for image tokens (OpenAI vision pricing)
- Image URL validation and size limits
- Audio request support (Whisper, TTS)
- Multi-modal usage analytics (images processed, audio minutes)

#### 4.2 Agentic Workflow Support
- Tool use / function calling tracking and analytics
- Multi-turn conversation session tracking
- Agent execution traces: link related requests into a single trace
- Cost attribution per agent session
- Rate limiting per session (prevent runaway agents)

#### 4.3 MCP Gateway
- MCP server implementation with auth layer
- Tool registry: expose approved tools to AI agents
- Resource management: control what data agents can access
- Enterprise auth: SSO-gated MCP access
- Observability: log all MCP tool calls and resource accesses
- Rate limiting and budget enforcement for MCP operations

#### 4.4 Semantic Caching
- Vector embedding of request messages
- Similarity search for cache hits (configurable threshold)
- Reduces costs for semantically equivalent queries
- Requires vector store (pgvector or dedicated service)

---

## Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Guardrail enforcement | High | Medium | P0 |
| Budget enforcement | High | Medium | P0 |
| Billing plan limits | High | Low | P0 |
| Audit log integration | Medium | Low | P0 |
| Streaming token counting | Medium | Low | P0 |
| Retries + backoff | High | Low | P1 |
| Provider fallbacks | High | Medium | P1 |
| Response caching | High | Medium | P1 |
| Smart routing | Medium | Medium | P1 |
| SSO | Medium | High | P2 |
| Prompt management | Medium | High | P2 |
| Content-based routing | Medium | Medium | P2 |
| Webhooks | Medium | Medium | P2 |
| Multi-modal | Low | Medium | P3 |
| Agentic workflows | Low | High | P3 |
| MCP Gateway | Low | Very High | P3 |
| Semantic caching | Low | High | P3 |

---

## Success Metrics

| Phase | Metric | Target |
|-------|--------|--------|
| Phase 1 | Guardrails block rate | >0 (actually functioning) |
| Phase 1 | Budget alerts firing | Verified in staging |
| Phase 1 | Plan limit enforcement | 100% of free tier users metered |
| Phase 2 | Request success rate | 99.5%+ (with retries/fallbacks) |
| Phase 2 | Cache hit rate | >15% for repeat queries |
| Phase 2 | P95 latency reduction | 20% improvement via caching |
| Phase 3 | Enterprise SSO adoption | Onboard 1st enterprise customer |
| Phase 4 | Agent trace coverage | Track 90%+ of multi-turn sessions |

---

## Technical Dependencies

```
Phase 1 (no new deps):
  Guardrails → proxy handler integration
  Budgets → Redis counters + proxy handler check
  Billing → Redis counters + middleware
  Audit logs → add calls to existing handlers
  Streaming tokens → wire existing StreamTokenAccumulator

Phase 2 (Redis only):
  Retries → upstream.ts wrapper
  Fallbacks → provider-resolver.ts + new fallback config schema
  Caching → Redis + hash function
  Routing → Redis counters + new routing config schema

Phase 3 (new services possible):
  SSO → SAML/OIDC library (e.g., samlify, openid-client)
  Prompts → new DB table + versioning logic
  Webhooks → queue system (Redis-based or external)

Phase 4 (new infrastructure):
  Semantic caching → pgvector or vector DB
  MCP → new server process
```

---

## Key Decisions

1. **Phase 1 is non-negotiable.** We ship features that don't work. Fix them before building anything new.
2. **Retries before fancy routing.** A simple retry that saves a failed request is worth more than round-robin load balancing.
3. **Cache before multi-modal.** Response caching has direct cost savings. Multi-modal pass-through already works.
4. **MCP is last.** It's a new protocol, the ecosystem is immature, and it requires a separate server process. Build it when customers ask for it, not before.
5. **No new DB tables in Phase 1.** Everything we need is already in the schema. Just wire it up.
