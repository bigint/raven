# Raven AI Gateway Platform - Competitive Product Requirements Document

**Document Version:** 1.0
**Date:** 2026-03-19
**Author:** Product Management
**Status:** Draft for Review
**Confidentiality:** Internal Use Only

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Competitor Deep Dive](#2-competitor-deep-dive)
3. [Strategic Analysis](#3-strategic-analysis)
4. [Feature Gap Inventory](#4-feature-gap-inventory)
5. [Epic Breakdown](#5-epic-breakdown)
6. [Quick Wins Sprint](#6-quick-wins-sprint)
7. [Detailed Feature Specifications (P0)](#7-detailed-feature-specifications-p0)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [Success Metrics & KPIs](#9-success-metrics--kpis)
10. [Risk Assessment](#10-risk-assessment)
11. [Appendices](#11-appendices)

---

## 1. Executive Summary

### 1.1 Purpose

This Product Requirements Document defines the strategic roadmap for the Raven AI Gateway platform over the next six months. It is the result of a comprehensive competitive analysis against Tailscale Aperture LLM Gateway, conducted by a cross-functional research team, and identifies 30 feature gaps organized into 7 epics across 4 priority tiers.

### 1.2 Background

The AI gateway market is rapidly evolving as enterprises adopt multi-model AI strategies. Organizations need centralized control planes that provide observability, cost management, security guardrails, and developer experience tooling for their AI workloads. Raven occupies a strong position in this market with a feature-rich SaaS platform, but the emergence of Tailscale Aperture as a competitor has surfaced specific areas where Raven must improve to maintain and extend its lead.

### 1.3 Competitive Landscape

The AI gateway/proxy market currently includes several categories of players:

- **Infrastructure-native gateways** (Tailscale Aperture) - Leverage existing network infrastructure for zero-trust AI access
- **SaaS AI gateways** (Raven, Portkey, Helicone) - Cloud-hosted proxy platforms with rich analytics
- **Open-source proxies** (LiteLLM, AI Gateway by Cloudflare) - Self-hosted solutions with varying feature completeness
- **Enterprise platforms** (AWS Bedrock, Azure AI Studio) - Cloud-provider-specific solutions

Tailscale Aperture is our primary competitive threat because it targets the same developer-first audience with a differentiated approach: leveraging Tailscale's existing identity and networking layer to eliminate API key management entirely.

### 1.4 Strategic Positioning

Raven's competitive strategy is built on three pillars:

1. **Depth of Analytics** - More granular token breakdowns, cache performance metrics, and budget management than any competitor
2. **Operational Control** - Guardrails, routing rules, prompt management, and team-level budget controls that Aperture lacks entirely
3. **Developer Experience** - Chat playground, live SSE streaming, and a comprehensive REST API with 100+ endpoints

This PRD defines the work required to close the gaps Aperture has exposed while doubling down on Raven's existing advantages.

### 1.5 Scope

- **In scope:** 30 identified feature gaps, 7 epics, 4 implementation phases spanning approximately 6 months
- **Out of scope:** Pricing changes, infrastructure migration, mobile applications, on-premise deployment

### 1.6 Key Decisions Required

| Decision | Owner | Deadline |
|----------|-------|----------|
| Approve P0 feature list and priority order | VP Product | 2026-04-01 |
| Allocate engineering resources for Phase 1 | Engineering Lead | 2026-04-05 |
| Approve conversation content storage architecture | CTO | 2026-04-10 |
| Finalize Google provider integration timeline | Platform Lead | 2026-04-15 |

---

## 2. Competitor Deep Dive

### 2.1 Tailscale Aperture Overview

**Product:** Tailscale Aperture LLM Gateway
**Brand:** tailscale/aperture
**Deployment Model:** Self-hosted within a Tailscale tailnet (runs as a node on the tailnet)
**Target Audience:** Engineering teams already using Tailscale for network infrastructure
**Pricing:** Included with Tailscale plans (gateway functionality)

Aperture positions itself as the AI control plane for organizations using Tailscale. By running inside the tailnet, it inherits Tailscale's identity layer, meaning every request is automatically attributed to a specific user without requiring API keys or tokens.

### 2.2 Aperture Architecture

Aperture operates as a transparent proxy within the Tailscale network:

```
Developer Machine (Tailscale node)
    |
    v
Aperture Gateway (Tailscale node)
    |
    v
AI Provider APIs (OpenAI, Anthropic, Google)
```

Key architectural decisions:
- **Identity:** Tailscale identity (WireGuard-based) rather than API keys
- **Configuration:** HuJSON files with visual editor toggle in UI
- **Storage:** Conversation content stored alongside request metadata
- **API:** OpenAPI 3.1.0 specification with interactive Scalar documentation

### 2.3 Aperture Key Pages & Features

#### 2.3.1 Dashboard
- Overview metrics for token usage, cost, and request volume
- Time-series charts with configurable date ranges
- Sankey diagrams showing request flow from users to models
- DAU cohort analysis with retention curves

#### 2.3.2 Logs
- Session-based log grouping with full metadata
- Conversation content viewer for debugging prompts and completions
- Advanced filtering by model, user, date range, status
- CSV export for all log data
- Per-column sorting and filtering

#### 2.3.3 Tool Use
- Dedicated view for tool/function call analytics
- Tool call detail viewer showing input/output payloads
- Frequency and success rate metrics per tool

#### 2.3.4 Adoption
- DAU/WAU/MAU metrics with ratio tracking
- User cohort analysis over time
- Adoption curves by team and model

#### 2.3.5 Models
- Provider configuration with test connectivity button
- Model aliasing for version migration
- Model count aggregates per provider
- Support for OpenAI, Anthropic, Google (Gemini)

#### 2.3.6 Settings
- HuJSON configuration editor with visual/JSON toggle
- Grant/policy-based access control per user
- Agent setup guide with copy-paste snippets for Claude Code, Codex, Cursor, Windsurf
- JSON config export/import

#### 2.3.7 API
- Full OpenAPI 3.1.0 specification
- Interactive Scalar API client for testing endpoints
- RFC 9457-compliant error responses
- ETag-based concurrency control

### 2.4 Feature-by-Feature Comparison

| Feature Category | Raven | Aperture | Advantage |
|-----------------|-------|----------|-----------|
| **Analytics - Token Breakdown** | 6 card breakdown (input, output, cache read, cache write, reasoning, total) | Basic token metrics | Raven |
| **Analytics - Cache Performance** | Dedicated Cache Performance tab | Not available | Raven |
| **Analytics - Tools** | Dedicated Tools tab with tool-level analytics | Tool Use page with detail viewer | Tie |
| **Analytics - Cost** | Budget management at org/team/key level | Session cost display | Raven |
| **Analytics - User Adoption** | Not available | DAU cohort analysis, Sankey diagrams | Aperture |
| **Analytics - Export** | Not available | CSV export | Aperture |
| **Observability - Content Viewer** | Not available | Full conversation content viewer | Aperture |
| **Observability - Session Grouping** | Session-based grouping | Session-based grouping with metadata | Tie |
| **Observability - Live Streaming** | SSE request streaming | Not available | Raven |
| **Security - Guardrails** | block_topics, pii_detection, content_filter, custom_regex | Not available | Raven |
| **Security - Access Control** | Team roles (admin, member) | Grant/policy-based fine-grained ACL | Aperture |
| **Security - Auth** | API keys + team invitations | Tailscale identity (zero-trust) | Aperture |
| **Routing** | random, round-robin, least-latency, least-cost strategies | Not available | Raven |
| **Caching** | Semantic response caching with Redis | Not available | Raven |
| **Prompt Management** | Versioned prompt management | Not available | Raven |
| **Provider Support** | OpenAI, Anthropic | OpenAI, Anthropic, Google | Aperture |
| **API Documentation** | 100+ REST endpoints, no interactive docs | OpenAPI 3.1.0 + Scalar interactive client | Aperture |
| **Configuration** | Web UI forms | HuJSON with visual/JSON toggle | Tie |
| **Developer Onboarding** | No integration guides | Agent setup guide with config snippets | Aperture |
| **Billing** | Lemonsqueezy integration, plan-gated features | Included with Tailscale | Tie (different models) |
| **Playground** | Chat playground | Not available | Raven |
| **Audit Logging** | Full audit logging | Not available | Raven |
| **Team Management** | Full team management with invitations and roles | Tailscale team integration | Tie |

### 2.5 Aperture Strengths Summary

1. **Zero-friction identity** - No API key management; users are identified by Tailscale identity automatically
2. **Conversation debugging** - Full prompt/completion content viewer is a significant observability advantage
3. **User analytics** - DAU cohort analysis and Sankey diagrams provide insights Raven cannot match today
4. **Developer onboarding** - Agent setup guides with copy-paste snippets reduce time-to-value
5. **API maturity** - OpenAPI spec with interactive documentation signals enterprise readiness
6. **Google provider support** - Three major providers vs. Raven's two

### 2.6 Aperture Weaknesses

1. **Tailscale dependency** - Requires Tailscale infrastructure; not useful for teams not on Tailscale
2. **No guardrails** - No content filtering, PII detection, or topic blocking
3. **No routing** - No multi-provider routing strategies
4. **No caching** - No semantic response caching
5. **No budget management** - No cost controls at team or key level
6. **No prompt management** - No versioned prompt templates
7. **No playground** - No interactive chat testing environment
8. **No billing system** - Cannot be sold as standalone SaaS
9. **Limited analytics depth** - No cache performance metrics, no 6-card token breakdown

---

## 3. Strategic Analysis

### 3.1 SWOT Analysis

#### Strengths
- **Comprehensive analytics engine** with 6 token breakdown cards, cache performance, and tools tabs
- **Operational control plane** with guardrails, routing rules, and budget management
- **SaaS-native architecture** accessible from any network without infrastructure prerequisites
- **Prompt management** with versioning enables workflow standardization
- **100+ REST API endpoints** provide deep programmatic control
- **Plan-gated feature model** enables clear upgrade paths (Free/Pro/Team/Enterprise)
- **Live SSE streaming** for real-time request monitoring
- **Semantic caching** reduces costs and latency for repeated queries
- **Chat playground** enables in-platform experimentation
- **Audit logging** satisfies compliance requirements

#### Weaknesses
- **No conversation content storage** prevents prompt-level debugging (BIGGEST GAP)
- **Only two providers** (OpenAI, Anthropic) vs. Aperture's three
- **No integration guides** for popular AI coding tools
- **No data export** (CSV/JSON) from analytics
- **No interactive API documentation** despite having 100+ endpoints
- **Several backend capabilities not exposed in frontend** (page size, date ranges, virtual key filtering)
- **No user identity tracking** across requests
- **User Agent column exists but is never populated** (one-line fix)

#### Opportunities
- **Quick wins sprint** can close 8 gaps in 1-2 weeks with minimal engineering effort
- **Backend-ready features** already have API support and just need frontend work
- **Google provider support** is straightforward given AI SDK compatibility
- **Enterprise market expansion** with conversation debugging and advanced access control
- **Developer tool integrations** (Claude Code, Cursor, Windsurf) expand addressable market
- **Open API spec generation** would enable SDK auto-generation and partner integrations

#### Threats
- **Tailscale's distribution advantage** - Aperture reaches every Tailscale customer automatically
- **Zero-trust positioning** - Aperture's identity model is inherently more secure than API keys
- **Feature velocity** - Aperture is rapidly adding observability features
- **Market consolidation** - Cloud providers may bundle AI gateway features
- **Open-source alternatives** (LiteLLM) may commoditize basic proxy functionality

### 3.2 Market Positioning

Raven should position itself as the **most comprehensive AI gateway for teams that need operational control**, emphasizing:

1. **Control** - Guardrails, routing, budgets, and prompt management that no competitor matches
2. **Insight** - Deepest analytics with token breakdowns, cache performance, and cost tracking
3. **Flexibility** - Works with any network infrastructure, no vendor lock-in
4. **Scale** - Plan-gated features that grow with the organization

### 3.3 Competitive Moat Assessment

| Moat Component | Current Strength | After PRD Execution |
|---------------|-----------------|-------------------|
| Analytics depth | Strong | Very Strong |
| Operational controls (guardrails, routing) | Very Strong | Very Strong |
| Observability | Weak | Strong |
| Developer experience | Medium | Strong |
| API maturity | Medium | Strong |
| Provider breadth | Weak | Medium |
| Enterprise readiness | Medium | Strong |

### 3.4 Competitive Response Strategy

**Short-term (1-2 weeks):** Execute quick wins sprint to close low-effort gaps immediately. This eliminates 8 of 30 gaps and improves the product visibly for existing users.

**Medium-term (4-6 weeks):** Ship P0 features, especially conversation content storage and Google provider support. These are the two features most likely to cause customer churn to Aperture.

**Long-term (3-6 months):** Build out P1 and P2 features that create sustainable differentiation. Focus on features that leverage Raven's SaaS architecture advantages (user analytics, advanced filtering, interactive docs).

---

## 4. Feature Gap Inventory

### 4.1 Priority Framework

| Priority | Definition | Count | Target Timeline |
|----------|-----------|-------|----------------|
| **P0 - Must Have** | Critical gaps that directly impact competitive positioning or cause customer churn | 8 | Phase 1-2 (1-6 weeks) |
| **P1 - Should Have** | Important gaps that improve product quality and user satisfaction | 11 | Phase 3 (6-8 weeks) |
| **P2 - Nice to Have** | Enhancements that add polish and enterprise features | 11 | Phase 4 (ongoing) |

### 4.2 Complete Feature Gap Registry

#### P0 - Must Have

| ID | Feature | Effort | Epic | Backend Ready? |
|----|---------|--------|------|---------------|
| GAP-001 | Conversation content storage and viewer | HIGH | Observability & Debugging | No |
| GAP-002 | Google (Gemini) provider support | MEDIUM | Provider Ecosystem | Partial (AI SDK supports it) |
| GAP-003 | Agent setup / integration guide tab | LOW | Onboarding & Documentation | N/A (frontend-only) |
| GAP-004 | Configurable page size selector | LOW | Table & Dashboard UX | Yes |
| GAP-005 | Per-key analytics dashboard | MEDIUM | User & Key Analytics | Yes (virtualKeyId filter) |
| GAP-006 | Session cost column | LOW | Table & Dashboard UX | Yes (totalCost in API) |
| GAP-007 | Chart view toggle (Tokens/Cost/Requests) | LOW | Table & Dashboard UX | Yes |
| GAP-008 | CSV/JSON export for analytics | LOW | Table & Dashboard UX | N/A (frontend-only) |

#### P1 - Should Have

| ID | Feature | Effort | Epic | Backend Ready? |
|----|---------|--------|------|---------------|
| GAP-009 | Throughput metrics (Tokens/Second) | LOW | Observability & Debugging | Yes (computed) |
| GAP-010 | Provider test button | MEDIUM | Provider Ecosystem | No |
| GAP-011 | Advanced filter system for sessions | MEDIUM | Filtering & Date Ranges | Yes (filters exist, not in UI) |
| GAP-012 | Column visibility toggle | LOW | Table & Dashboard UX | N/A (frontend-only) |
| GAP-013 | User identity tracking | MEDIUM | User & Key Analytics | No |
| GAP-014 | Model aliasing | MEDIUM | Provider Ecosystem | No |
| GAP-015 | Models count in provider list | LOW | Provider Ecosystem | Yes (aggregate query) |
| GAP-016 | Flexible date range selection | LOW | Filtering & Date Ranges | Yes (from/to ISO) |
| GAP-017 | Request starring/favoriting | MEDIUM | Observability & Debugging | No |
| GAP-018 | User Agent population | LOW | User & Key Analytics | Yes (column exists) |
| GAP-019 | Daily Active Users cohort analysis | HIGH | User & Key Analytics | No |

#### P2 - Nice to Have

| ID | Feature | Effort | Epic | Backend Ready? |
|----|---------|--------|------|---------------|
| GAP-020 | Column sorting and per-column filtering | MEDIUM | Table & Dashboard UX | Partial |
| GAP-021 | OpenAPI specification generation | MEDIUM | Onboarding & Documentation | No |
| GAP-022 | Interactive API documentation (Scalar) | MEDIUM | Onboarding & Documentation | No |
| GAP-023 | Tool call detail viewer | MEDIUM | Observability & Debugging | No |
| GAP-024 | JSON config export/import | LOW | Platform Hardening | No |
| GAP-025 | Sankey/flow diagram | HIGH | Platform Hardening | No |
| GAP-026 | DAU/WAU/MAU ratio metrics | MEDIUM | User & Key Analytics | No |
| GAP-027 | RFC 9457 error format | LOW | Platform Hardening | No |
| GAP-028 | ETag concurrency control | LOW | Platform Hardening | No |
| GAP-029 | Grant/policy-based access control | HIGH | Platform Hardening | No |
| GAP-030 | Request throughput dashboard | MEDIUM | Platform Hardening | No |

### 4.3 Effort Distribution

| Effort Level | Count | Percentage |
|-------------|-------|-----------|
| LOW | 13 | 43% |
| MEDIUM | 12 | 40% |
| HIGH | 5 | 17% |

### 4.4 Backend Readiness Analysis

A significant finding from this analysis is that many features already have backend support but lack frontend implementation. This represents the fastest path to closing gaps:

| Category | Features | IDs |
|----------|----------|-----|
| Backend fully ready (frontend-only work) | 6 | GAP-004, GAP-006, GAP-007, GAP-008, GAP-012, GAP-016 |
| Backend partially ready | 3 | GAP-005, GAP-009, GAP-018 |
| Frontend-only (no backend needed) | 2 | GAP-003, GAP-008 |
| Full-stack work required | 19 | All others |

---

## 5. Epic Breakdown

### 5.1 Epic 1: Observability & Debugging

**Features:** GAP-001, GAP-009, GAP-017, GAP-023

**Epic Owner:** Platform Engineering Lead
**Target Phase:** Phase 2-3

#### 5.1.1 Scope
This epic transforms Raven from a metrics-focused gateway into a full observability platform. The centerpiece is conversation content storage (GAP-001), which is the single largest competitive gap with Aperture. Supporting features include throughput metrics, request favoriting for triage workflows, and tool call detail viewing.

#### 5.1.2 Goals
- Enable developers to debug AI interactions without leaving Raven
- Provide full visibility into prompt/completion content for troubleshooting
- Support triage workflows where users can star important requests for review
- Display throughput metrics (tokens/second) for performance monitoring

#### 5.1.3 Success Metrics
| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Time to debug a bad AI response | External tools required | < 30 seconds in Raven | User research |
| Content viewer adoption | 0% | 60% of active users within 30 days | Feature analytics |
| Starred requests per user/week | N/A | > 5 average | Database query |
| Throughput metric visibility | 0% of pages | 100% of request detail views | UI audit |

#### 5.1.4 Acceptance Criteria
- Users can view full prompt and completion content for any request within the last 30 days
- Content is stored with configurable retention policies (7/14/30/90 days)
- Sensitive content can be redacted based on guardrail rules before storage
- Throughput (tokens/second) is displayed on request detail views and aggregate dashboards
- Users can star/unstar requests and filter by starred status
- Tool call inputs and outputs are viewable in a structured format

#### 5.1.5 Dependencies
- Database migration for content storage columns
- Storage capacity planning (content storage significantly increases data volume)
- Guardrails integration for content redaction before storage
- Privacy review for stored content handling

#### 5.1.6 Risks
- **Data volume:** Storing full conversation content will significantly increase database size. Mitigation: Implement retention policies and consider tiered storage.
- **Privacy compliance:** Content may contain PII or sensitive data. Mitigation: Integrate with existing guardrails for redaction; provide org-level opt-out.
- **Performance:** Large content payloads may slow down log queries. Mitigation: Store content in a separate table/column with lazy loading.

---

### 5.2 Epic 2: Table & Dashboard UX

**Features:** GAP-004, GAP-006, GAP-007, GAP-008, GAP-012, GAP-020

**Epic Owner:** Frontend Engineering Lead
**Target Phase:** Phase 1-2

#### 5.2.1 Scope
This epic focuses on bringing Raven's data tables and dashboards to feature parity with modern analytics platforms. Most of these features are frontend-only changes that leverage existing backend capabilities.

#### 5.2.2 Goals
- Give users control over how data is displayed (page size, columns, sorting)
- Surface existing data that is returned by APIs but not rendered (session cost)
- Enable data export for external analysis workflows
- Provide flexible chart views that let users switch between metrics

#### 5.2.3 Success Metrics
| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| CSV exports per week | 0 | > 50 | Feature analytics |
| Users customizing page size | 0% | 30% | Feature analytics |
| Chart toggle usage | 0 | > 100 toggles/week | Feature analytics |
| Average session duration on logs page | Baseline | +20% increase | Analytics |

#### 5.2.4 Acceptance Criteria
- Page size selector offers 10, 25, 50, 100 options and persists user preference
- Session cost column is visible by default in the LogsTable with currency formatting
- Chart view can toggle between Tokens, Cost, and Requests views
- CSV export downloads current filtered/sorted data with proper headers
- JSON export is available as alternative format
- Column visibility toggle allows hiding/showing any column with preference persistence
- Column sorting works on all sortable columns with clear visual indicators

#### 5.2.5 Dependencies
- None for most features (backend already supports required parameters)
- GAP-020 (column sorting/filtering) may require backend orderBy parameter additions

#### 5.2.6 Risks
- **User preference storage:** Need to decide between localStorage, cookies, or server-side storage for preferences. Recommendation: localStorage with server-side sync for authenticated users.
- **Export performance:** Large datasets may cause browser memory issues during CSV generation. Mitigation: Stream generation or server-side export for large datasets.

---

### 5.3 Epic 3: Provider Ecosystem

**Features:** GAP-002, GAP-010, GAP-014, GAP-015

**Epic Owner:** Platform Engineering Lead
**Target Phase:** Phase 1-2

#### 5.3.1 Scope
This epic expands Raven's provider support and improves provider management. The headline feature is Google (Gemini) support, which closes a direct competitive gap. Supporting features improve the provider configuration experience.

#### 5.3.2 Goals
- Support all three major AI providers (OpenAI, Anthropic, Google)
- Reduce friction in provider setup with test connectivity
- Enable model version migration with aliasing
- Improve provider list UX with model counts

#### 5.3.3 Success Metrics
| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Providers supported | 2 | 3 | Platform capability |
| Google provider adoption | 0% | 25% of orgs within 60 days | Database query |
| Provider test button usage | N/A | 80% of new provider setups | Feature analytics |
| Model alias usage | N/A | 15% of orgs within 90 days | Database query |

#### 5.3.4 Acceptance Criteria
- Google (Gemini) models are available through the standard proxy endpoint
- Provider configuration includes a "Test Connection" button that validates API key and returns latency
- Model aliases can be created, updated, and deleted via UI and API
- Proxy resolves model aliases transparently before forwarding to providers
- Provider list shows count of available models per provider

#### 5.3.5 Dependencies
- AI SDK Google provider integration
- Google API key management
- Routing rules compatibility with Google models

#### 5.3.6 Risks
- **Google API differences:** Google's API has different streaming behavior and tool calling formats. Mitigation: Thorough testing with AI SDK's Google adapter.
- **Model alias conflicts:** Aliases could conflict with real model names. Mitigation: Validate alias names against known model names.

---

### 5.4 Epic 4: User & Key Analytics

**Features:** GAP-005, GAP-013, GAP-018, GAP-019, GAP-026

**Epic Owner:** Data Engineering Lead
**Target Phase:** Phase 2-3

#### 5.4.1 Scope
This epic adds user-level and key-level analytics capabilities that enable organizations to understand who is using AI, how much, and at what cost. This is an area where Aperture has a natural advantage due to Tailscale identity integration.

#### 5.4.2 Goals
- Enable per-key analytics to understand usage patterns per API key
- Track user identity across requests for attribution
- Provide DAU/WAU/MAU cohort analysis for adoption tracking
- Populate the existing User Agent column for client identification

#### 5.4.3 Success Metrics
| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Per-key dashboard views | 0 | > 200/week | Feature analytics |
| Requests with user identity | 0% | > 40% within 90 days | Database query |
| User Agent population rate | 0% | > 95% | Database query |
| DAU metric accuracy | N/A | < 5% variance from actual | Validation |

#### 5.4.4 Acceptance Criteria
- Per-key analytics dashboard shows token usage, cost, request volume, and error rate for each virtual key
- User identity is captured from x-user-id header and displayed in request logs
- User Agent is populated from the request User-Agent header on every proxied request
- DAU/WAU/MAU metrics are computed and displayed with trend charts
- DAU cohort analysis shows retention over configurable time periods

#### 5.4.5 Dependencies
- GAP-013 requires client-side adoption of x-user-id header
- GAP-019 requires significant aggregation query development
- GAP-018 is a one-line fix in logger.ts

#### 5.4.6 Risks
- **User identity adoption:** x-user-id header requires client-side changes. Mitigation: Document header in integration guides (GAP-003); consider User-Agent parsing as fallback.
- **DAU computation cost:** Daily aggregation queries on large datasets may be expensive. Mitigation: Pre-compute daily aggregates in a materialized view or summary table.

---

### 5.5 Epic 5: Filtering & Date Ranges

**Features:** GAP-011, GAP-016

**Epic Owner:** Frontend Engineering Lead
**Target Phase:** Phase 2

#### 5.5.1 Scope
This epic exposes existing backend filtering capabilities in the frontend. Both features are primarily frontend work since the backend already supports the required query parameters.

#### 5.5.2 Goals
- Enable power users to filter sessions by any available dimension
- Allow arbitrary date range selection instead of preset ranges only

#### 5.5.3 Success Metrics
| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Filter usage rate | Preset only | 40% use custom filters | Feature analytics |
| Custom date range usage | 0% | 25% of sessions | Feature analytics |
| Support tickets about filtering | Baseline | -50% reduction | Support metrics |

#### 5.5.4 Acceptance Criteria
- Filter panel supports: model, provider, status code, virtual key, user identity, date range
- Filters can be combined with AND logic
- Active filters are displayed as dismissible chips/pills
- Date range picker supports custom from/to selection with ISO string output
- Preset date ranges (1h, 24h, 7d, 30d) remain available as quick selections
- Selected filters persist across page navigation within a session

#### 5.5.5 Dependencies
- Backend query schemas already support these filters (logsQuerySchema, requestsQuerySchema)
- No backend work required

#### 5.5.6 Risks
- Minimal risk. Backend support is confirmed. Primary risk is UI/UX complexity of exposing many filter options without overwhelming users.

---

### 5.6 Epic 6: Onboarding & Documentation

**Features:** GAP-003, GAP-021, GAP-022

**Epic Owner:** Developer Experience Lead
**Target Phase:** Phase 1 (GAP-003), Phase 3 (GAP-021, GAP-022)

#### 5.6.1 Scope
This epic improves the developer experience for both new and existing users. The integration guide tab is a quick win that can ship in Phase 1. OpenAPI spec generation and interactive documentation are more involved but significantly improve API discoverability.

#### 5.6.2 Goals
- Reduce time-to-first-request for new users with copy-paste integration snippets
- Provide machine-readable API documentation for SDK generation
- Enable interactive API exploration without external tools

#### 5.6.3 Success Metrics
| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Time to first proxied request | > 15 minutes | < 5 minutes | Onboarding funnel |
| Integration guide page views | 0 | > 500/week | Feature analytics |
| API doc page views | 0 | > 300/week | Feature analytics |
| Support tickets about setup | Baseline | -40% reduction | Support metrics |

#### 5.6.4 Acceptance Criteria
- Integration guide tab shows config snippets for Claude Code, Codex CLI, Cursor, Windsurf, and generic OpenAI-compatible clients
- Snippets include copy-to-clipboard functionality
- Snippets are dynamically populated with the user's actual API key and gateway URL
- OpenAPI 3.1.0 specification is auto-generated from route definitions
- Interactive API documentation (Scalar) allows testing endpoints with authentication

#### 5.6.5 Dependencies
- GAP-003 is frontend-only with no dependencies
- GAP-021 requires route schema introspection
- GAP-022 requires GAP-021 to be completed first

#### 5.6.6 Risks
- **API key exposure:** Integration snippets will display API keys. Mitigation: Show masked keys with explicit "reveal" action; include security warnings.
- **OpenAPI accuracy:** Auto-generated specs may not capture all edge cases. Mitigation: Manual review and testing of generated spec.

---

### 5.7 Epic 7: Platform Hardening

**Features:** GAP-024, GAP-025, GAP-027, GAP-028, GAP-029, GAP-030

**Epic Owner:** Platform Engineering Lead
**Target Phase:** Phase 3-4

#### 5.7.1 Scope
This epic covers enterprise-grade platform improvements that enhance reliability, standards compliance, and advanced access control. These are primarily P2 features that add polish and address edge cases.

#### 5.7.2 Goals
- Improve API standards compliance (RFC 9457, ETags)
- Enable advanced access control patterns (grant/policy-based)
- Provide configuration portability (JSON export/import)
- Add advanced visualization (Sankey diagrams, throughput dashboards)

#### 5.7.3 Success Metrics
| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| API standards compliance | Partial | Full RFC 9457 + ETag | Audit |
| Config export/import usage | N/A | 10% of orgs | Feature analytics |
| Policy-based ACL adoption | N/A | 20% of Team/Enterprise orgs | Database query |
| Sankey diagram engagement | N/A | > 100 views/week | Feature analytics |

#### 5.7.4 Acceptance Criteria
- JSON config export produces a portable configuration file for all org settings
- JSON config import validates and applies configuration with conflict resolution
- RFC 9457 error responses are used for all API errors with type, title, status, detail fields
- ETag headers are returned on GET requests; conditional updates with If-Match are supported
- Grant/policy-based ACL allows defining per-user and per-group permissions for models and features
- Sankey diagram visualizes request flow from users through keys to models
- Request throughput dashboard shows requests/second with percentile latency

#### 5.7.5 Dependencies
- GAP-029 (grant/policy-based ACL) is a significant architectural change that may affect existing team role system
- GAP-025 (Sankey diagram) requires a visualization library (e.g., D3.js or similar)

#### 5.7.6 Risks
- **ACL migration:** Transitioning from role-based to policy-based access control may break existing permissions. Mitigation: Implement as additive layer on top of existing roles.
- **Sankey complexity:** Flow diagrams require accurate request attribution across multiple dimensions. Mitigation: Start with simplified two-level diagram (user to model).

---

## 6. Quick Wins Sprint

### 6.1 Overview

Eight features have been identified as quick wins based on the following criteria:
- LOW effort estimation
- Backend support already exists (or feature is frontend-only)
- No database migrations required
- No new API endpoints required (or trivial additions)
- High impact on competitive positioning relative to effort

**Sprint Duration:** 1-2 weeks
**Team Size:** 2 frontend engineers, 1 backend engineer (part-time)

### 6.2 Quick Win Details

#### QW-1: Configurable Page Size Selector (GAP-004)

**Current State:** Backend requestsQuerySchema accepts limit parameter (1-100). Frontend hardcodes page size.
**Work Required:** Add a dropdown selector to DataTable components. Values: 10, 25, 50, 100. Persist selection in localStorage.
**Estimated Effort:** 2-4 hours
**Files Likely Affected:** DataTable component, logs page, sessions page
**Acceptance Criteria:**
- Dropdown appears in table header/footer area
- Options: 10, 25, 50, 100 rows per page
- Selection persists across page refreshes (localStorage)
- Pagination adjusts correctly when page size changes

#### QW-2: Session Cost Column (GAP-006)

**Current State:** getSessions() API already returns totalCost field. LogsTable does not render it.
**Work Required:** Add a "Cost" column to the sessions table. Format as currency ($0.0000).
**Estimated Effort:** 1-2 hours
**Files Likely Affected:** LogsTable component, sessions table column definitions
**Acceptance Criteria:**
- Cost column displays totalCost with 4 decimal places and $ prefix
- Column is sortable
- Column is visible by default
- Null/zero costs display as "$0.0000"

#### QW-3: Chart View Toggle (GAP-007)

**Current State:** Adoption/analytics charts show a single metric. Backend returns tokens, cost, and request count data.
**Work Required:** Add a segmented control/pill toggle above charts to switch between Tokens, Cost, and Requests views.
**Estimated Effort:** 3-5 hours
**Files Likely Affected:** Adoption chart component, analytics dashboard
**Acceptance Criteria:**
- Toggle appears above time-series charts
- Three options: Tokens, Cost, Requests
- Chart updates immediately on toggle without re-fetching data
- Y-axis label and formatting update to match selected metric
- Default selection is "Tokens"

#### QW-4: CSV/JSON Export (GAP-008)

**Current State:** No export functionality exists. All data is available in frontend state.
**Work Required:** Add export buttons that serialize current table/chart data to CSV or JSON and trigger download.
**Estimated Effort:** 4-6 hours
**Files Likely Affected:** DataTable component (export button), utility functions for CSV/JSON serialization
**Acceptance Criteria:**
- Export button appears in table header area
- Dropdown offers "Export CSV" and "Export JSON" options
- Export includes all rows matching current filters (not just current page)
- CSV uses proper escaping for values containing commas or quotes
- File names include date and filter context (e.g., "raven-logs-2026-03-19.csv")
- For large datasets (>10,000 rows), show a progress indicator

#### QW-5: Throughput Metric (GAP-009)

**Current State:** Request logs contain token counts and duration/latency data. Tokens/second can be computed from existing fields.
**Work Required:** Compute and display tokens/second on request detail views and as an optional column.
**Estimated Effort:** 2-3 hours
**Files Likely Affected:** Request detail component, computed field utility
**Acceptance Criteria:**
- Tokens/second calculated as totalTokens / durationSeconds
- Displayed on request detail view alongside other metrics
- Available as an optional column in the request logs table
- Formatted to 1 decimal place (e.g., "125.3 tok/s")

#### QW-6: Column Visibility Toggle (GAP-012)

**Current State:** All columns are always visible. No customization option.
**Work Required:** Add a column visibility dropdown to DataTable that lets users toggle columns on/off. Persist preferences.
**Estimated Effort:** 3-5 hours
**Files Likely Affected:** DataTable component, column configuration
**Acceptance Criteria:**
- Column visibility button appears in table header
- Dropdown lists all columns with checkboxes
- Users can show/hide any column except the primary identifier
- Preferences persist in localStorage
- At least 3 columns must remain visible (validation)

#### QW-7: User Agent Population (GAP-018)

**Current State:** request_logs table has a userAgent column in the schema, but it is never populated in logger.ts.
**Work Required:** One-line fix in logger.ts to capture req.headers['user-agent'] and store it.
**Estimated Effort:** 15-30 minutes
**Files Likely Affected:** logger.ts (proxy logger)
**Acceptance Criteria:**
- User Agent is populated for all new proxied requests
- Value matches the User-Agent header from the incoming request
- Existing rows with null userAgent are unaffected
- User Agent is visible in request detail views

#### QW-8: Integration Guide Tab (GAP-003)

**Current State:** No onboarding guidance for connecting AI tools to Raven.
**Work Required:** New settings tab with static content showing config snippets for Claude Code, Codex CLI, Cursor, Windsurf, and generic OpenAI clients.
**Estimated Effort:** 4-6 hours
**Files Likely Affected:** Settings page, new IntegrationGuide component
**Acceptance Criteria:**
- New "Integrations" tab in Settings
- Config snippets for: Claude Code, Codex CLI, Cursor, Windsurf, generic OpenAI SDK
- Each snippet includes gateway URL and API key placeholder
- Copy-to-clipboard button for each snippet
- API key is auto-populated from user's active key (masked by default with reveal toggle)
- Brief description of each tool and link to its documentation

### 6.3 Quick Wins Sprint Plan

| Day | Tasks | Engineer |
|-----|-------|----------|
| Day 1 | QW-7 (User Agent fix), QW-2 (Session cost column) | Backend + Frontend 1 |
| Day 1 | QW-1 (Page size selector) | Frontend 2 |
| Day 2 | QW-3 (Chart toggle) | Frontend 1 |
| Day 2 | QW-6 (Column visibility) | Frontend 2 |
| Day 3 | QW-5 (Throughput metric) | Frontend 1 |
| Day 3 | QW-4 (CSV/JSON export) | Frontend 2 |
| Day 4 | QW-8 (Integration guide) | Frontend 1 |
| Day 4 | QA and polish for QW-1 through QW-7 | Frontend 2 |
| Day 5 | QA for QW-8, final review, deploy | Both |

### 6.4 Quick Wins Impact Assessment

Completing all 8 quick wins will:
- Close 8 of 30 feature gaps (27%)
- Address 3 of 8 P0 features (GAP-003, GAP-004, GAP-006, GAP-007, GAP-008)
- Populate a previously empty database column (User Agent)
- Add export functionality that users have likely been requesting
- Improve data table UX significantly (page size, column visibility, cost column)
- Provide integration guides that reduce onboarding friction

---

## 7. Detailed Feature Specifications (P0)

### 7.1 GAP-001: Conversation Content Storage and Viewer

#### 7.1.1 Problem Statement

Raven currently captures request metadata (model, tokens, latency, cost, status) but discards the actual prompt and completion content. This means users cannot debug AI responses, review conversation quality, or audit what their AI systems are generating without maintaining a separate logging system. Tailscale Aperture provides a full conversation content viewer, making it significantly easier for developers to debug and iterate on their AI integrations. This is the single largest competitive gap between Raven and Aperture.

#### 7.1.2 User Stories

- **As a developer**, I want to view the exact prompts sent to an AI model and the responses received, so that I can debug unexpected AI behavior without reproducing the request.
- **As a team lead**, I want to review conversation content for quality assurance, so that I can ensure AI interactions meet our standards.
- **As a security engineer**, I want to audit stored conversation content for policy violations, so that I can identify and address misuse.
- **As a developer**, I want to search conversation content by keywords, so that I can find specific interactions quickly.
- **As an org admin**, I want to configure content retention policies, so that I can manage storage costs and comply with data retention requirements.
- **As a compliance officer**, I want conversation content to respect PII redaction rules, so that sensitive data is not stored in plain text.

#### 7.1.3 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001-1 | System shall store the full request messages array (prompts) for each proxied request | Must |
| FR-001-2 | System shall store the full response content (completions) for each proxied request | Must |
| FR-001-3 | System shall store tool call inputs and outputs when present | Must |
| FR-001-4 | Content storage shall be opt-in at the organization level | Must |
| FR-001-5 | System shall support configurable retention periods (7, 14, 30, 90 days, unlimited) | Must |
| FR-001-6 | System shall apply configured guardrails (PII detection, content filter) to stored content | Should |
| FR-001-7 | System shall provide a conversation viewer UI that displays messages in chat format | Must |
| FR-001-8 | Viewer shall support syntax highlighting for code blocks in messages | Should |
| FR-001-9 | Viewer shall render markdown formatting in messages | Should |
| FR-001-10 | System shall support content search by keyword across stored conversations | Should |
| FR-001-11 | Content storage shall not degrade proxy latency by more than 5ms p99 | Must |
| FR-001-12 | System shall support bulk deletion of stored content by date range | Must |
| FR-001-13 | Stored content shall be accessible via API with proper authorization | Must |
| FR-001-14 | System shall track storage usage per organization and display in settings | Should |

#### 7.1.4 Technical Approach

**Storage Architecture:**
- Create a new `request_content` table (or add JSONB columns to `request_logs`) to store conversation content
- Use a separate table to avoid bloating the frequently-queried `request_logs` table
- Content is stored as JSONB to preserve the full message structure
- Consider compression (gzip) for large conversations to reduce storage costs

**Schema Design:**
```
request_content:
  id: uuid (PK)
  request_log_id: uuid (FK to request_logs)
  org_id: uuid (FK, for retention policies)
  request_messages: jsonb (the messages array sent to the provider)
  response_content: jsonb (the completion response from the provider)
  tool_calls: jsonb (tool call details if present)
  content_hash: text (for deduplication, optional)
  stored_at: timestamp
  expires_at: timestamp (computed from retention policy)
  redacted: boolean (whether guardrails were applied)
```

**Proxy Logger Changes:**
- After successfully proxying a request, asynchronously write content to the `request_content` table
- Use a background job queue (or async insert) to avoid adding latency to the proxy path
- Check org-level setting before storing content
- Apply guardrail transformations before storage if configured

**Retention Implementation:**
- Add a scheduled job (cron) that deletes expired content based on `expires_at`
- Run daily during low-traffic hours
- Track deletion metrics for monitoring

**API Endpoints:**
- `GET /api/requests/:id/content` - Retrieve stored content for a specific request
- `DELETE /api/requests/:id/content` - Delete stored content for a specific request
- `DELETE /api/requests/content?before=<date>` - Bulk delete content before a date
- `GET /api/org/settings/content-storage` - Get content storage settings
- `PUT /api/org/settings/content-storage` - Update content storage settings

#### 7.1.5 UI/UX Requirements

**Conversation Viewer Component:**
- Split panel or expandable row in the request detail view
- Left/right or top/bottom layout showing request messages and response
- Messages displayed in chat bubble format with role labels (system, user, assistant)
- Code blocks rendered with syntax highlighting (Shiki or Prism)
- Markdown rendered with proper formatting
- Tool calls displayed in collapsible sections with input/output
- Copy button for individual messages and entire conversation
- "Raw JSON" toggle to view the underlying data structure

**Settings:**
- New "Content Storage" section in organization settings
- Toggle to enable/disable content storage
- Retention period dropdown (7, 14, 30, 90 days, unlimited)
- Storage usage display (current size, trend)
- "Delete All Content" button with confirmation dialog
- Guardrail integration toggle (apply PII redaction before storage)

**Log Table Integration:**
- Visual indicator (icon) on rows that have stored content
- Quick preview tooltip showing first 100 characters of the prompt
- Click-through to full conversation viewer

#### 7.1.6 Data Model Changes

New table: `request_content` (see schema above)

New columns on `organizations`:
- `content_storage_enabled: boolean DEFAULT false`
- `content_retention_days: integer DEFAULT 30`
- `content_redaction_enabled: boolean DEFAULT true`

New index: `idx_request_content_expires_at` on `request_content.expires_at` for efficient cleanup

New index: `idx_request_content_request_log_id` on `request_content.request_log_id` for lookups

#### 7.1.7 API Changes

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/requests/:id/content | Get stored content for a request |
| DELETE | /api/requests/:id/content | Delete stored content for a request |
| DELETE | /api/requests/content | Bulk delete content (query params: before, orgId) |
| GET | /api/org/settings/content-storage | Get content storage configuration |
| PUT | /api/org/settings/content-storage | Update content storage configuration |
| GET | /api/org/content-storage/usage | Get storage usage metrics |

#### 7.1.8 Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Content storage adoption (% of orgs enabling) | > 50% | 60 days post-launch |
| Content viewer usage (% of active users) | > 40% | 30 days post-launch |
| Average content views per user per week | > 10 | 30 days post-launch |
| Proxy latency impact (p99) | < 5ms | At launch |
| Support tickets about debugging AI responses | -30% reduction | 90 days post-launch |

#### 7.1.9 Dependencies
- Database migration tooling
- Background job infrastructure (for async content writes)
- Storage capacity planning
- Guardrails system integration
- Privacy/compliance review

#### 7.1.10 Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Storage costs exceed projections | Medium | High | Implement compression, tiered storage, aggressive retention defaults |
| Content storage adds unacceptable proxy latency | Low | High | Async writes via job queue; content storage is non-blocking |
| PII stored in conversation content | High | High | Default-on guardrail redaction; org-level compliance controls |
| Large conversations cause UI performance issues | Medium | Medium | Virtualized scrolling in viewer; truncation with "load more" |
| Data breach exposes conversation content | Low | Critical | Encryption at rest; access audit logging; org-level access controls |

---

### 7.2 GAP-002: Google (Gemini) Provider Support

#### 7.2.1 Problem Statement

Raven currently supports two AI providers: OpenAI and Anthropic. Tailscale Aperture supports three providers including Google (Gemini). Google's Gemini models are increasingly adopted, especially Gemini 2.5 Pro and Flash variants, and customers choosing between Raven and Aperture may choose Aperture solely for Google support. The AI SDK that Raven uses already supports Google's provider, making this integration straightforward.

#### 7.2.2 User Stories

- **As a developer**, I want to proxy requests to Google Gemini models through Raven, so that I can use Gemini alongside OpenAI and Anthropic with unified analytics.
- **As a team lead**, I want to set budget limits on Gemini usage, so that I can control costs across all providers.
- **As an ops engineer**, I want routing rules to include Gemini models, so that I can implement multi-provider fallback strategies.
- **As a developer**, I want to use Gemini models in the chat playground, so that I can test prompts across providers.

#### 7.2.3 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-002-1 | System shall accept and proxy requests to Google Gemini models | Must |
| FR-002-2 | Google shall be added to the SUPPORTED_PROVIDERS enum | Must |
| FR-002-3 | ai-provider-factory shall create Google provider instances | Must |
| FR-002-4 | Google API keys shall be configurable in provider settings | Must |
| FR-002-5 | Token counting shall work correctly for Gemini models | Must |
| FR-002-6 | Cost calculation shall use Gemini pricing | Must |
| FR-002-7 | Routing rules shall support Google models | Must |
| FR-002-8 | Chat playground shall support Gemini models | Should |
| FR-002-9 | Guardrails shall work with Gemini requests/responses | Should |
| FR-002-10 | Semantic caching shall work with Gemini models | Should |
| FR-002-11 | SSE streaming shall work with Gemini models | Must |
| FR-002-12 | All existing analytics shall capture Gemini usage | Must |

#### 7.2.4 Technical Approach

**Provider Integration:**
- Add `google` to `SUPPORTED_PROVIDERS` constant/enum
- Extend `ai-provider-factory` to handle `google` provider creation using AI SDK's `@ai-sdk/google` package
- Map Google model names to AI SDK model identifiers
- Handle Google-specific request/response format differences through AI SDK abstraction

**Model Registry:**
- Add Gemini model entries: gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash, and other current models
- Include token limits, pricing per million tokens, and capability flags
- Ensure model registry is easily updatable as Google releases new models

**Cost Calculation:**
- Add Google pricing to the cost calculation module
- Handle Google's pricing tiers (standard vs. context caching pricing)
- Ensure cache token metrics are captured for Gemini's context caching feature

**Streaming:**
- Verify SSE streaming works correctly through AI SDK's Google adapter
- Handle any Google-specific streaming event formats

#### 7.2.5 UI/UX Requirements

- Google appears as a provider option in provider settings with the Google logo/icon
- API key configuration field for Google with validation
- Gemini models appear in model selectors throughout the application
- Chat playground model dropdown includes Gemini models
- Analytics dashboards correctly categorize and display Google/Gemini data
- Provider color coding in charts (suggested: Google blue #4285F4)

#### 7.2.6 Data Model Changes

- Add `google` to provider enum values in database schema
- Add Gemini models to model registry/seed data
- Add Google pricing data to cost calculation tables

#### 7.2.7 API Changes

No new endpoints required. Existing provider CRUD endpoints will accept `google` as a provider type. Existing proxy endpoint will route to Google based on model name prefix.

#### 7.2.8 Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Google provider configured (% of orgs) | > 20% | 60 days post-launch |
| Gemini requests as % of total | > 10% | 90 days post-launch |
| Streaming reliability for Gemini | > 99.5% | At launch |
| Cost calculation accuracy | < 1% variance | At launch |

#### 7.2.9 Dependencies
- `@ai-sdk/google` npm package
- Google AI API access and pricing documentation
- Model registry update process

#### 7.2.10 Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Google API behavior differs from OpenAI/Anthropic | Medium | Medium | AI SDK abstracts most differences; thorough testing |
| Google changes pricing frequently | Medium | Low | Automated pricing update mechanism |
| Gemini tool calling format incompatible with existing tool analytics | Low | Medium | Test tool calling through AI SDK; adapt analytics if needed |
| Google rate limits differ from other providers | Medium | Low | Implement provider-specific rate limit handling |

---

### 7.3 GAP-003: Agent Setup / Integration Guide Tab

#### 7.3.1 Problem Statement

New users who sign up for Raven must figure out how to configure their AI tools to route through the Raven gateway. There is no in-product guidance for this. Tailscale Aperture provides a dedicated agent setup guide with copy-paste configuration snippets for popular tools like Claude Code, Codex, Cursor, and Windsurf. This reduces Aperture's time-to-value significantly compared to Raven.

#### 7.3.2 User Stories

- **As a new user**, I want step-by-step instructions for connecting Claude Code to Raven, so that I can start using the gateway within minutes of signing up.
- **As a developer**, I want copy-paste configuration snippets, so that I don't have to manually construct configuration files.
- **As a team admin**, I want to share integration instructions with my team, so that everyone can onboard quickly.

#### 7.3.3 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-003-1 | New "Integrations" or "Setup" tab in Settings page | Must |
| FR-003-2 | Configuration snippets for Claude Code | Must |
| FR-003-3 | Configuration snippets for Codex CLI | Must |
| FR-003-4 | Configuration snippets for Cursor | Must |
| FR-003-5 | Configuration snippets for Windsurf | Must |
| FR-003-6 | Configuration snippet for generic OpenAI SDK (Python and Node.js) | Must |
| FR-003-7 | Copy-to-clipboard button for each snippet | Must |
| FR-003-8 | Auto-populate gateway URL in snippets | Must |
| FR-003-9 | Auto-populate API key in snippets (masked by default) | Should |
| FR-003-10 | Link to external documentation for each tool | Should |
| FR-003-11 | Snippet for cURL example | Should |

#### 7.3.4 Technical Approach

This is a frontend-only feature. No backend changes required.

**Component Structure:**
- New `IntegrationGuide` component added as a tab in Settings
- Each integration is a card/section with: tool logo, tool name, brief description, config snippet, copy button
- Snippets are template strings with variable substitution for gateway URL and API key
- Use the existing clipboard utility for copy functionality

**Snippet Examples:**

Claude Code:
```json
{
  "apiBase": "https://gateway.raven.app/v1",
  "apiKey": "rv_xxxxxxxxxxxx"
}
```

Cursor (settings.json):
```json
{
  "openai.baseUrl": "https://gateway.raven.app/v1",
  "openai.apiKey": "rv_xxxxxxxxxxxx"
}
```

Generic OpenAI Python SDK:
```python
from openai import OpenAI

client = OpenAI(
    base_url="https://gateway.raven.app/v1",
    api_key="rv_xxxxxxxxxxxx"
)
```

#### 7.3.5 UI/UX Requirements

- Tab appears in Settings navigation as "Integrations" or "Setup Guide"
- Clean, scannable layout with each tool in its own section
- Tool logos/icons for visual recognition
- Code snippets in monospace font with syntax highlighting
- Copy button with visual feedback (checkmark animation on success)
- API key shown as masked by default (`rv_xxxx...xxxx`) with a "Show" toggle
- If user has no API keys, show a CTA to create one
- Responsive layout that works on smaller screens

#### 7.3.6 Data Model Changes
None required.

#### 7.3.7 API Changes
None required. Uses existing API key retrieval endpoint.

#### 7.3.8 Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Integration guide page views | > 500/week | 30 days post-launch |
| Copy-to-clipboard clicks | > 200/week | 30 days post-launch |
| Time to first proxied request (new users) | < 5 minutes (from > 15) | 30 days post-launch |
| Onboarding completion rate | +15% improvement | 60 days post-launch |

#### 7.3.9 Dependencies
- List of current virtual keys (existing API)
- Gateway base URL configuration

#### 7.3.10 Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Tool configuration formats change | Medium | Low | Version snippets; monitor tool changelogs |
| API key exposure in snippets | Low | Medium | Mask by default; add security notice |
| Snippets become outdated | Medium | Low | Review quarterly; link to official tool docs |

---

### 7.4 GAP-004: Configurable Page Size Selector

#### 7.4.1 Problem Statement

Raven's data tables use a fixed page size, forcing users to paginate through many pages when looking for specific entries. The backend already accepts a `limit` parameter (1-100) in the requestsQuerySchema, but the frontend does not expose this control. Aperture provides a configurable page size selector, which is a standard UX pattern for data-heavy applications.

#### 7.4.2 User Stories

- **As a developer reviewing logs**, I want to see more rows per page, so that I can scan through data faster without excessive pagination.
- **As a user on a slow connection**, I want to reduce the page size, so that pages load faster.

#### 7.4.3 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-004-1 | Page size dropdown appears in table header or footer | Must |
| FR-004-2 | Options: 10, 25, 50, 100 | Must |
| FR-004-3 | Changing page size resets to page 1 | Must |
| FR-004-4 | Page size preference persists across sessions | Should |
| FR-004-5 | Works on all data tables (logs, sessions, keys, etc.) | Must |

#### 7.4.4 Technical Approach

- Add a select/dropdown component next to pagination controls
- Pass selected value as the `limit` query parameter to API calls
- Store preference in localStorage with key `raven:pageSize`
- Update all table components to read from shared page size state

#### 7.4.5 UI/UX Requirements

- Compact dropdown labeled "Rows per page" or "Show X entries"
- Positioned near pagination controls for discoverability
- Visually consistent with existing select components
- Default value: 25 (or current default)

#### 7.4.6 Data Model Changes
None.

#### 7.4.7 API Changes
None (backend already supports `limit` parameter).

#### 7.4.8 Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Users changing page size | > 30% | 30 days |
| Most popular page size | Track distribution | 30 days |

#### 7.4.9 Dependencies
None.

#### 7.4.10 Risks
Minimal. Standard UI pattern with existing backend support.

---

### 7.5 GAP-005: Per-Key Analytics Dashboard

#### 7.5.1 Problem Statement

Organizations using multiple virtual keys (e.g., one per team, project, or environment) cannot view analytics scoped to a specific key. They can only see aggregate analytics across all keys. The backend already supports filtering by `virtualKeyId`, but no UI exists to leverage this. Understanding per-key usage patterns is essential for cost attribution, budget management, and identifying underperforming integrations.

#### 7.5.2 User Stories

- **As a team admin**, I want to view analytics for a specific team's API key, so that I can understand their usage patterns and costs.
- **As a finance lead**, I want per-key cost breakdowns, so that I can attribute AI costs to specific projects or departments.
- **As a developer**, I want to see my key's usage over time, so that I can optimize my integration.
- **As an org admin**, I want to compare usage across keys, so that I can identify the highest-cost integrations.

#### 7.5.3 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-005-1 | Key selector/filter on the analytics dashboard | Must |
| FR-005-2 | All analytics widgets update when a key is selected | Must |
| FR-005-3 | Token breakdown cards scoped to selected key | Must |
| FR-005-4 | Time-series charts scoped to selected key | Must |
| FR-005-5 | Cost summary scoped to selected key | Must |
| FR-005-6 | Per-key view accessible from virtual keys list (link/button) | Should |
| FR-005-7 | Comparison mode to overlay two keys on the same chart | Nice to have |
| FR-005-8 | "All Keys" option to return to aggregate view | Must |

#### 7.5.4 Technical Approach

- Add a virtual key selector dropdown to the analytics dashboard
- Pass `virtualKeyId` parameter to all analytics API calls when a key is selected
- The backend `requestsQuerySchema` already accepts `virtualKeyId` filter
- Reuse existing analytics components with the added filter parameter
- Add navigation link from virtual keys list to filtered analytics view

#### 7.5.5 UI/UX Requirements

- Key selector appears at the top of the analytics dashboard
- Dropdown lists all virtual keys with their names and truncated key values
- Selecting a key immediately updates all dashboard widgets
- Visual indicator (badge/chip) showing the active key filter
- "View Analytics" action button in the virtual keys table for each key
- Clear way to return to aggregate view ("All Keys" option or clear filter button)

#### 7.5.6 Data Model Changes
None (backend filtering already supported).

#### 7.5.7 API Changes
None (existing endpoints accept virtualKeyId parameter).

#### 7.5.8 Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Per-key dashboard views per week | > 200 | 30 days |
| % of orgs using per-key analytics | > 40% | 60 days |
| Average keys analyzed per session | > 2 | 30 days |

#### 7.5.9 Dependencies
- Virtual keys API (existing)
- Analytics API with virtualKeyId filter support (existing)

#### 7.5.10 Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance impact of filtered queries | Low | Medium | Backend already supports indexed filtering |
| Confusion between key-level and org-level analytics | Medium | Low | Clear visual indication of active filter |

---

### 7.6 GAP-006: Session Cost Column

#### 7.6.1 Problem Statement

The sessions API already returns a `totalCost` field for each session, but the LogsTable component does not render it. Users cannot see the cost of individual sessions without clicking into each one. Displaying cost directly in the table enables quick scanning and identification of expensive sessions.

#### 7.6.2 User Stories

- **As a team lead**, I want to see session costs at a glance in the logs table, so that I can quickly identify expensive sessions.
- **As a developer**, I want to sort sessions by cost, so that I can find and optimize the most expensive interactions.

#### 7.6.3 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-006-1 | Cost column displays totalCost in the sessions table | Must |
| FR-006-2 | Cost formatted as currency with 4 decimal places | Must |
| FR-006-3 | Column is sortable | Should |
| FR-006-4 | Column is visible by default | Must |
| FR-006-5 | Null costs display as "$0.0000" | Must |

#### 7.6.4 Technical Approach

Add a new column definition to the LogsTable/sessions table component that maps to the `totalCost` field already returned by the sessions API. Apply currency formatting utility.

#### 7.6.5 UI/UX Requirements

- Column header: "Cost" or "Total Cost"
- Right-aligned numeric values (standard for currency columns)
- Dollar sign prefix with 4 decimal places ($0.0123)
- Color coding optional: red for high-cost sessions, based on configurable threshold

#### 7.6.6 Data Model Changes
None.

#### 7.6.7 API Changes
None.

#### 7.6.8 Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Sort-by-cost usage | > 15% of sessions page views | 30 days |
| Feature satisfaction (survey) | > 4/5 | 60 days |

#### 7.6.9 Dependencies
None.

#### 7.6.10 Risks
None. Data is already available in the API response.

---

### 7.7 GAP-007: Chart View Toggle (Tokens/Cost/Requests)

#### 7.7.1 Problem Statement

Raven's analytics charts currently display a single metric (typically tokens). Users who want to see cost trends or request volume trends must mentally translate token charts or look elsewhere. Aperture allows toggling between different chart views. Adding a metric toggle to Raven's charts provides users with flexible visualization of the data they care about most.

#### 7.7.2 User Stories

- **As a finance lead**, I want to view cost trends over time, so that I can forecast AI spending.
- **As an ops engineer**, I want to view request volume trends, so that I can plan for capacity.
- **As a developer**, I want to toggle between token and cost views, so that I can understand the relationship between usage and cost.

#### 7.7.3 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-007-1 | Segmented control above time-series charts with Tokens, Cost, Requests options | Must |
| FR-007-2 | Chart updates immediately on toggle (no re-fetch) | Must |
| FR-007-3 | Y-axis label updates to match selected metric | Must |
| FR-007-4 | Y-axis formatting matches metric type (numbers for tokens, $ for cost, count for requests) | Must |
| FR-007-5 | Default selection is "Tokens" | Must |
| FR-007-6 | Toggle preference persists within session | Should |

#### 7.7.4 Technical Approach

- The backend already returns tokens, cost, and request count data in analytics responses
- Add a state variable for the selected metric
- Re-render charts with the selected data series
- Update axis labels and formatters based on selection
- Use existing pill/tab component for the toggle UI

#### 7.7.5 UI/UX Requirements

- Pill/segmented control positioned above or in the chart header
- Three options: "Tokens", "Cost", "Requests"
- Active option visually highlighted
- Smooth transition when switching (fade or cross-dissolve)
- Consistent positioning across all chart views

#### 7.7.6 Data Model Changes
None.

#### 7.7.7 API Changes
None.

#### 7.7.8 Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Toggle interactions per week | > 100 | 30 days |
| Most used metric view | Track distribution | 30 days |

#### 7.7.9 Dependencies
None.

#### 7.7.10 Risks
None. Frontend-only change with data already available.

---

### 7.8 GAP-008: CSV/JSON Export for Analytics

#### 7.8.1 Problem Statement

Users cannot export data from Raven for external analysis, reporting, or integration with business intelligence tools. Tailscale Aperture provides CSV export functionality. Data export is a standard feature in analytics platforms and its absence may be a blocker for enterprise customers who need to incorporate AI usage data into broader reporting workflows.

#### 7.8.2 User Stories

- **As a finance lead**, I want to export cost data as CSV, so that I can import it into our financial reporting system.
- **As a data analyst**, I want to export request logs as JSON, so that I can perform custom analysis in Python/R.
- **As a team admin**, I want to export usage reports, so that I can share them with stakeholders who don't have Raven access.

#### 7.8.3 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-008-1 | Export button on all data tables | Must |
| FR-008-2 | CSV export option | Must |
| FR-008-3 | JSON export option | Must |
| FR-008-4 | Export respects current filters and sorting | Must |
| FR-008-5 | Export includes all matching rows, not just current page | Should |
| FR-008-6 | File name includes context (table name, date, filters) | Should |
| FR-008-7 | Progress indicator for large exports | Should |
| FR-008-8 | CSV uses proper escaping (RFC 4180) | Must |
| FR-008-9 | Export button available on chart views (exports underlying data) | Nice to have |

#### 7.8.4 Technical Approach

**Frontend CSV Generation:**
- Serialize table data to CSV string using a utility function
- Handle proper escaping: double quotes for fields containing commas, quotes, or newlines
- Generate column headers from table column definitions
- For "all rows" export, fetch all pages from the API sequentially and aggregate
- Trigger download using Blob + URL.createObjectURL

**Frontend JSON Generation:**
- JSON.stringify the data array with 2-space indentation
- Include metadata header with export timestamp, filters applied, and row count

**Large Dataset Handling:**
- For datasets > 1,000 rows, show a progress bar during fetching
- Consider streaming CSV generation for very large datasets
- Set a maximum export limit (e.g., 10,000 rows) with a warning

#### 7.8.5 UI/UX Requirements

- Export button with download icon in table header area
- Dropdown on click: "Export as CSV", "Export as JSON"
- Loading state during export generation
- Success toast with file name after download starts
- Error toast if export fails

#### 7.8.6 Data Model Changes
None.

#### 7.8.7 API Changes
None for basic implementation. Optional: server-side export endpoint for large datasets.

#### 7.8.8 Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Exports per week | > 50 | 30 days |
| CSV vs. JSON preference | Track ratio | 30 days |
| Average export size (rows) | Track distribution | 30 days |

#### 7.8.9 Dependencies
None.

#### 7.8.10 Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Large exports cause browser memory issues | Medium | Medium | Row limit with warning; streaming generation |
| Exported data contains sensitive information | Low | High | Respect existing access controls; add export audit log entry |

---

## 8. Implementation Roadmap

### 8.1 Phase Overview

| Phase | Timeline | Focus | Features | Effort |
|-------|----------|-------|----------|--------|
| Phase 1 | Weeks 1-2 | Quick Wins | 8 features (GAP-003, 004, 006, 007, 008, 009, 012, 018) | LOW |
| Phase 2 | Weeks 3-8 | P0 Features | 4 features (GAP-001, 002, 005, 017*) | HIGH |
| Phase 3 | Weeks 9-16 | P1 Features | 11 features (GAP-010 through 019, exc. quick wins) | MEDIUM |
| Phase 4 | Weeks 17+ | P2 Features | 11 features (GAP-020 through 030) | Variable |

*GAP-017 (Request starring) is P1 but included in Phase 2 as it enhances the observability story alongside GAP-001.

### 8.2 Phase 1: Quick Wins Sprint (Weeks 1-2)

**Goal:** Close 8 feature gaps with minimal engineering effort. Demonstrate velocity and improve product immediately.

**Team:** 2 frontend engineers, 1 backend engineer (25% allocation)

**Week 1:**
| Day | Task | Owner | Status |
|-----|------|-------|--------|
| Mon | GAP-018: User Agent population (one-line fix) | Backend | - |
| Mon | GAP-006: Session cost column | Frontend 1 | - |
| Mon | GAP-004: Page size selector | Frontend 2 | - |
| Tue | GAP-007: Chart view toggle | Frontend 1 | - |
| Tue | GAP-012: Column visibility toggle | Frontend 2 | - |
| Wed | GAP-009: Throughput metric | Frontend 1 | - |
| Wed | GAP-008: CSV/JSON export | Frontend 2 | - |
| Thu | GAP-003: Integration guide tab (start) | Frontend 1 | - |
| Thu | QA for GAP-004, 006, 007, 009, 012, 018 | Frontend 2 | - |
| Fri | GAP-003: Integration guide tab (complete) | Frontend 1 | - |
| Fri | QA for GAP-003, 008 | Frontend 2 | - |

**Week 2:**
| Day | Task | Owner | Status |
|-----|------|-------|--------|
| Mon | Bug fixes and polish from QA | Both | - |
| Tue | Final QA pass, accessibility review | Both | - |
| Wed | Deploy to staging | Backend | - |
| Thu | Stakeholder review on staging | Product | - |
| Fri | Production deploy | Backend | - |

**Exit Criteria:**
- All 8 features pass QA on staging
- No P0/P1 bugs from QA
- Performance benchmarks unchanged
- Stakeholder sign-off

### 8.3 Phase 2: P0 Features (Weeks 3-8)

**Goal:** Ship the highest-impact features that directly address competitive gaps with Aperture.

**Team:** 3 frontend engineers, 2 backend engineers, 1 designer (50% allocation)

**Week 3-4: Conversation Content Storage (GAP-001 - Backend)**
- Database schema design and migration
- Content storage service implementation
- Async write pipeline (background job)
- Retention policy engine
- API endpoints for content CRUD
- Guardrail integration for redaction
- Unit and integration testing

**Week 5-6: Conversation Content Viewer (GAP-001 - Frontend) + Google Provider (GAP-002)**
- Conversation viewer component design and implementation
- Message rendering (markdown, code blocks, tool calls)
- Content storage settings UI
- Google provider integration (backend)
- Google provider UI (model selector, provider settings)
- Streaming verification for Gemini
- Cost calculation for Gemini models

**Week 7: Per-Key Analytics (GAP-005) + Request Starring (GAP-017)**
- Per-key analytics dashboard with key selector
- Virtual key list integration (link to analytics)
- Request starring backend (DB column, CRUD endpoints)
- Request starring frontend (star button, filter by starred)

**Week 8: Integration Testing & Polish**
- End-to-end testing of all Phase 2 features
- Performance testing (especially content storage impact on proxy latency)
- Security review of conversation content storage
- Documentation updates
- Deploy to staging, stakeholder review, production deploy

**Exit Criteria:**
- Conversation content viewer is functional with < 5ms proxy latency impact
- Google provider passes all integration tests
- Per-key analytics accurately reflects filtered data
- Security review completed for content storage
- No P0 bugs

### 8.4 Phase 3: P1 Features (Weeks 9-16)

**Goal:** Build out the should-have features that improve product quality and user satisfaction.

**Team:** 2 frontend engineers, 2 backend engineers

**Weeks 9-10: Provider & Model Enhancements**
- GAP-010: Provider test button (backend endpoint + UI)
- GAP-014: Model aliasing (DB table, CRUD, proxy resolution)
- GAP-015: Models count in provider list

**Weeks 11-12: User & Key Analytics**
- GAP-013: User identity tracking (x-user-id header parsing, DB column, UI)
- GAP-019: Daily Active Users cohort analysis (aggregation queries, chart component)

**Weeks 13-14: Filtering & UX**
- GAP-011: Advanced filter system for sessions
- GAP-016: Flexible date range selection
- GAP-020: Column sorting and per-column filtering (partial, from P2)

**Weeks 15-16: Integration & Polish**
- End-to-end testing
- Performance optimization
- Documentation updates
- Staged rollout

**Exit Criteria:**
- All 11 P1 features pass QA
- DAU cohort analysis produces accurate results validated against raw data
- User identity tracking captures > 0% of requests (dependent on client adoption)
- Model aliasing works transparently in proxy path

### 8.5 Phase 4: P2 Features (Weeks 17+, Ongoing)

**Goal:** Add polish, enterprise features, and platform hardening.

**Priority Order:**
1. GAP-021 + GAP-022: OpenAPI spec + Scalar interactive docs (high visibility)
2. GAP-023: Tool call detail viewer (complements GAP-001)
3. GAP-027 + GAP-028: RFC 9457 errors + ETag concurrency (API maturity)
4. GAP-024: JSON config export/import
5. GAP-026: DAU/WAU/MAU ratio metrics
6. GAP-030: Request throughput dashboard
7. GAP-025: Sankey/flow diagram (highest effort P2)
8. GAP-029: Grant/policy-based access control (highest effort P2)

**Approach:** P2 features will be prioritized dynamically based on customer feedback, competitive moves, and engineering capacity. They are expected to be delivered iteratively rather than as a single release.

### 8.6 Roadmap Visualization

```
Week:  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20+
       |-----|-----|-----|-----|-----|-----|-----|-----|-----|-------->
Phase: [  1  ][        2              ][        3              ][ 4 ->
       Quick   P0: Content storage,     P1: Provider test,       P2:
       Wins    Google provider,         Model aliasing,          Ongoing
               Per-key analytics        User identity, DAU,
                                        Filtering, Date ranges
```

### 8.7 Resource Requirements

| Phase | Frontend Eng | Backend Eng | Designer | PM | Total Person-Weeks |
|-------|-------------|-------------|----------|----|--------------------|
| Phase 1 | 2 | 0.25 | 0 | 0.5 | 5 |
| Phase 2 | 3 | 2 | 0.5 | 1 | 39 |
| Phase 3 | 2 | 2 | 0.25 | 0.5 | 38 |
| Phase 4 | 1-2 | 1-2 | 0.25 | 0.5 | Ongoing |
| **Total** | - | - | - | - | **~82 + ongoing** |

### 8.8 Milestones

| Milestone | Target Date | Criteria |
|-----------|------------|----------|
| M1: Quick Wins Complete | Week 2 | 8 quick wins deployed to production |
| M2: Content Storage Alpha | Week 4 | Backend content storage functional on staging |
| M3: Google Provider Live | Week 6 | Google/Gemini models available in production |
| M4: Phase 2 Complete | Week 8 | All P0 features in production |
| M5: Phase 3 Midpoint | Week 12 | Provider and analytics P1 features complete |
| M6: Phase 3 Complete | Week 16 | All P1 features in production |
| M7: Competitive Parity | Week 20 | All P0 and P1 gaps closed; key P2 features shipped |

---

## 9. Success Metrics & KPIs

### 9.1 North Star Metrics

| Metric | Definition | Current Baseline | 6-Month Target |
|--------|-----------|-----------------|---------------|
| **Feature Gap Score** | Number of competitive gaps vs. Aperture | 30 | < 10 |
| **Weekly Active Organizations** | Orgs with > 1 proxied request per week | Baseline | +40% |
| **Net Promoter Score** | User satisfaction survey | Baseline | +15 points |
| **Time to First Value** | Minutes from signup to first proxied request | > 15 min | < 5 min |

### 9.2 Phase-Level KPIs

#### Phase 1 KPIs (Quick Wins)
| KPI | Target | Measurement Method |
|-----|--------|-------------------|
| Features shipped on time | 8/8 | Release tracking |
| User engagement with new features | > 30% DAU interact with at least 1 new feature | Feature analytics |
| Bug count from quick wins | < 3 P1/P2 bugs | Bug tracker |
| Page load time impact | < 50ms increase | Performance monitoring |

#### Phase 2 KPIs (P0 Features)
| KPI | Target | Measurement Method |
|-----|--------|-------------------|
| Content viewer adoption | > 40% of active users within 30 days | Feature analytics |
| Google provider adoption | > 20% of orgs within 60 days | Database query |
| Per-key analytics usage | > 200 views/week | Feature analytics |
| Proxy latency impact | < 5ms p99 increase | APM monitoring |
| Customer churn rate | No increase (ideally decrease) | Billing system |

#### Phase 3 KPIs (P1 Features)
| KPI | Target | Measurement Method |
|-----|--------|-------------------|
| Advanced filter usage | > 25% of log page views | Feature analytics |
| Model alias adoption | > 15% of orgs | Database query |
| User identity population | > 40% of requests (for orgs using the feature) | Database query |
| DAU metrics accuracy | < 5% variance from manual count | Validation query |

#### Phase 4 KPIs (P2 Features)
| KPI | Target | Measurement Method |
|-----|--------|-------------------|
| API documentation page views | > 300/week | Analytics |
| Config export/import usage | > 10% of orgs | Feature analytics |
| Enterprise feature adoption (ACL, ETags) | > 30% of Enterprise plan orgs | Database query |

### 9.3 Competitive Positioning Metrics

| Metric | Current | After Phase 2 | After Phase 4 |
|--------|---------|---------------|---------------|
| Features where Raven leads | ~12 | ~14 | ~18 |
| Features where Aperture leads | ~10 | ~4 | ~2 |
| Feature parity | ~8 | ~12 | ~10 |
| Raven-only features (competitive moat) | ~8 | ~8 | ~10 |

### 9.4 Business Impact Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Trial-to-paid conversion rate | +10% improvement | 6 months |
| Average revenue per organization | +15% increase | 6 months |
| Plan upgrade rate (Free to Pro, Pro to Team) | +20% improvement | 6 months |
| Customer acquisition cost (CAC) | -10% reduction (from better onboarding) | 6 months |
| Customer lifetime value (CLV) | +20% increase | 12 months |

### 9.5 Technical Health Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Proxy p99 latency | < 100ms (excluding provider latency) | APM |
| API error rate | < 0.1% | Monitoring |
| Database storage growth rate | Predictable and within budget | Infrastructure monitoring |
| Content storage size per org | < 1GB/month average | Database query |
| Uptime | > 99.9% | Status page |

---

## 10. Risk Assessment

### 10.1 Technical Risks

| ID | Risk | Probability | Impact | Phase | Mitigation Strategy |
|----|------|-------------|--------|-------|---------------------|
| TR-001 | Conversation content storage causes database growth beyond capacity planning | Medium | High | Phase 2 | Implement compression; tiered storage (hot/cold); aggressive default retention (30 days); storage usage alerts |
| TR-002 | Content storage async writes increase proxy latency beyond 5ms target | Low | High | Phase 2 | Use fire-and-forget async writes; separate connection pool for content writes; circuit breaker on storage failures |
| TR-003 | Google provider API has incompatibilities not covered by AI SDK | Medium | Medium | Phase 2 | Thorough testing with all Gemini models; fallback error handling; provider-specific adapter layer |
| TR-004 | Large CSV exports cause browser crashes for power users | Medium | Medium | Phase 1 | Row limit (10,000) with warning; consider server-side export for larger datasets |
| TR-005 | DAU cohort analysis queries are too expensive on large datasets | Medium | Medium | Phase 3 | Pre-computed daily aggregates; materialized views; query timeout limits |
| TR-006 | Model aliasing introduces proxy resolution latency | Low | Medium | Phase 3 | Cache alias mappings in memory; invalidate on update; sub-millisecond resolution target |
| TR-007 | OpenAPI spec generation misses edge cases in route definitions | Medium | Low | Phase 4 | Manual review process; automated spec validation; integration tests against generated spec |
| TR-008 | Grant/policy-based ACL conflicts with existing team role system | High | High | Phase 4 | Implement as additive layer; extensive migration testing; feature flag for gradual rollout |

### 10.2 Business Risks

| ID | Risk | Probability | Impact | Mitigation Strategy |
|----|------|-------------|--------|---------------------|
| BR-001 | Tailscale Aperture ships features that widen the gap before we close it | Medium | High | Prioritize P0 features aggressively; monitor Aperture changelog; adjust roadmap if needed |
| BR-002 | Engineering resources are pulled to other priorities | Medium | High | Secure exec sponsorship; protect sprint capacity; identify minimum viable team |
| BR-003 | Customers churn to Aperture before Phase 2 completes | Low | High | Communicate roadmap to at-risk customers; offer preview access to Phase 2 features |
| BR-004 | Content storage feature increases hosting costs significantly | Medium | Medium | Factor storage costs into pricing; implement plan-based storage limits |
| BR-005 | Quick wins don't move user engagement metrics | Low | Medium | Ensure quick wins are announced in-app; track adoption and iterate on discoverability |
| BR-006 | Google provider support cannibalizes OpenAI/Anthropic revenue | Low | Low | Multi-provider usage typically increases total platform usage, not shifts it |

### 10.3 Competitive Risks

| ID | Risk | Probability | Impact | Mitigation Strategy |
|----|------|-------------|--------|---------------------|
| CR-001 | Aperture adds guardrails/routing features, closing their gaps | Medium | High | Accelerate our roadmap; leverage depth of existing features; focus on UX superiority |
| CR-002 | New competitor enters market with combined Raven+Aperture feature set | Low | High | Speed of execution; customer relationships; switching costs from existing integrations |
| CR-003 | Cloud providers (AWS/Azure/GCP) bundle AI gateway features | Medium | Medium | Focus on multi-cloud/multi-provider value proposition; deeper feature set than bundled offerings |
| CR-004 | Open-source alternatives (LiteLLM) add commercial features | Medium | Medium | Differentiate on managed experience, support, and enterprise features |
| CR-005 | Tailscale acquires or partners with another AI gateway | Low | High | Build strong customer lock-in through data history, team workflows, and integrations |

### 10.4 Risk Heat Map

```
Impact
  ^
  |  CR-005      TR-001    TR-008
H |  BR-003      BR-001    CR-001
  |              BR-002
  |
M |  TR-002      TR-003    CR-003
  |  BR-006      TR-004    CR-004
  |              TR-005
  |
L |              TR-007    BR-005
  |              TR-006
  +------------------------------->
     Low         Medium    High
                 Probability
```

### 10.5 Risk Response Plan

**Highest Priority Risks (High Impact + Medium/High Probability):**

1. **TR-001 (Storage growth):** Assign infrastructure engineer to capacity planning before Phase 2 starts. Define storage budget per plan tier. Implement monitoring alerts at 50%, 75%, 90% capacity.

2. **TR-008 (ACL conflicts):** Begin architecture review in Phase 2 even though implementation is Phase 4. Ensure team role system is designed to be extensible. Document migration path.

3. **BR-001 (Aperture feature velocity):** Establish bi-weekly competitive intelligence review. Maintain a responsive backlog that can reprioritize based on competitive moves. Identify features where we can leapfrog rather than match.

4. **CR-001 (Aperture closing their gaps):** Our guardrails, routing, caching, and prompt management represent significant engineering effort for Aperture to replicate. Focus marketing on these differentiators while closing our gaps.

---

## 11. Appendices

### Appendix A: Competitor Feature Mapping Reference

| Aperture Feature | Aperture Page | Raven Equivalent | Gap ID | Status |
|-----------------|---------------|-------------------|--------|--------|
| Conversation content viewer | Logs | None | GAP-001 | P0 |
| Google provider | Models | None | GAP-002 | P0 |
| Agent setup guide | Settings | None | GAP-003 | P0 (Quick Win) |
| Page size selector | Logs | None (backend ready) | GAP-004 | P0 (Quick Win) |
| Per-key analytics | Dashboard | None (backend ready) | GAP-005 | P0 |
| Session cost display | Logs | None (data in API) | GAP-006 | P0 (Quick Win) |
| Metric toggle charts | Adoption | None | GAP-007 | P0 (Quick Win) |
| CSV export | Logs/Adoption | None | GAP-008 | P0 (Quick Win) |
| Throughput metrics | Dashboard | None (computable) | GAP-009 | P1 (Quick Win) |
| Provider test button | Models | None | GAP-010 | P1 |
| Advanced session filters | Logs | None (backend ready) | GAP-011 | P1 |
| Column visibility | Logs | None | GAP-012 | P1 (Quick Win) |
| User identity tracking | Logs/Adoption | None | GAP-013 | P1 |
| Model aliasing | Models | None | GAP-014 | P1 |
| Models count | Models | None | GAP-015 | P1 |
| Date range picker | All pages | None (backend ready) | GAP-016 | P1 |
| Request starring | Logs | None | GAP-017 | P1 |
| User Agent capture | Logs | Column exists, not populated | GAP-018 | P1 (Quick Win) |
| DAU cohort analysis | Adoption | None | GAP-019 | P1 |
| Column sorting/filtering | Logs | Partial | GAP-020 | P2 |
| OpenAPI specification | API | None | GAP-021 | P2 |
| Interactive API docs (Scalar) | API | None | GAP-022 | P2 |
| Tool call detail viewer | Tool Use | None | GAP-023 | P2 |
| JSON config export/import | Settings | None | GAP-024 | P2 |
| Sankey flow diagram | Dashboard | None | GAP-025 | P2 |
| DAU/WAU/MAU ratios | Adoption | None | GAP-026 | P2 |
| RFC 9457 errors | API | Non-standard | GAP-027 | P2 |
| ETag concurrency | API | None | GAP-028 | P2 |
| Grant/policy-based ACL | Settings | Team roles only | GAP-029 | P2 |
| Throughput dashboard | Dashboard | None | GAP-030 | P2 |

### Appendix B: Backend Readiness Audit

The following backend capabilities exist but are not exposed in the frontend. These represent the fastest path to closing feature gaps:

**requestsQuerySchema parameters (not in UI):**
- `limit`: Accepts 1-100, used for page size (GAP-004)
- `virtualKeyId`: Filters by specific virtual key (GAP-005)

**logsQuerySchema parameters (not in UI):**
- `model`: Filters by model name (supports GAP-011)
- `virtualKeyId`: Filters by virtual key (supports GAP-011)

**All query schemas:**
- `from`: ISO 8601 date string for range start (GAP-016)
- `to`: ISO 8601 date string for range end (GAP-016)

**getSessions() API response:**
- `totalCost`: Already computed and returned, not rendered (GAP-006)

**request_logs schema:**
- `userAgent`: Column exists in database, never populated in logger.ts (GAP-018)

### Appendix C: Effort Estimation Framework

Effort levels used in this document:

| Level | Definition | Typical Duration | Example |
|-------|-----------|-----------------|---------|
| LOW | Single-file change or small component. No new APIs, no DB changes. | 1-4 hours | Adding a column to a table |
| MEDIUM | Multiple files, possibly new API endpoint or DB column. Limited architectural impact. | 1-3 days | New settings page with backend integration |
| HIGH | Significant architectural work. New tables, new services, multiple API endpoints, complex UI. | 1-3 weeks | Conversation content storage system |

### Appendix D: Technology References

| Technology | Use Case | Relevance |
|-----------|----------|-----------|
| AI SDK (`@ai-sdk/google`) | Google provider integration | GAP-002 |
| Scalar | Interactive API documentation | GAP-022 |
| D3.js or Recharts | Sankey flow diagrams | GAP-025 |
| RFC 9457 (Problem Details for HTTP APIs) | Standard error format | GAP-027 |
| RFC 7232 (Conditional Requests / ETags) | Concurrency control | GAP-028 |
| RFC 4180 (CSV format) | Export formatting | GAP-008 |
| HuJSON | Config format (Aperture uses this) | Reference only |

### Appendix E: Glossary

| Term | Definition |
|------|-----------|
| **AI Gateway** | A proxy layer between AI consumers and AI providers that adds observability, control, and management capabilities |
| **Aperture** | Tailscale's AI gateway product (tailscale/aperture), our primary competitor |
| **DAU/WAU/MAU** | Daily/Weekly/Monthly Active Users - standard engagement metrics |
| **Guardrails** | Rules that filter or block AI requests/responses based on content policies |
| **HuJSON** | Human JSON - a JSON superset that allows comments and trailing commas |
| **Model Aliasing** | Mapping a custom model name to an actual provider model for transparent version migration |
| **Proxy Latency** | Time added by Raven between receiving a request and forwarding it to the provider |
| **Retention Policy** | Configuration that determines how long stored data is kept before automatic deletion |
| **Routing Rules** | Configuration that determines which provider/model handles a request based on strategies |
| **Sankey Diagram** | A flow visualization that shows the magnitude of flow between nodes (e.g., users to models) |
| **Scalar** | An open-source interactive API documentation tool that renders OpenAPI specifications |
| **Semantic Caching** | Caching AI responses based on the semantic similarity of prompts rather than exact match |
| **SSE** | Server-Sent Events - a protocol for streaming updates from server to client |
| **Tailnet** | A Tailscale network - a secure, private network of devices running Tailscale |
| **Virtual Key** | A Raven-managed API key that maps to one or more provider API keys |

### Appendix F: Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-19 | Product Management | Initial document based on competitive analysis by 6 specialized research agents |

### Appendix G: Stakeholder Sign-Off

| Role | Name | Sign-Off Date | Status |
|------|------|--------------|--------|
| VP Product | | | Pending |
| CTO | | | Pending |
| Engineering Lead | | | Pending |
| Design Lead | | | Pending |
| Security Lead | | | Pending |

---

*This document is confidential and intended for internal use only. It represents the strategic product direction for the Raven AI Gateway platform and should be treated as commercially sensitive information.*
