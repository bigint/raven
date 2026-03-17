# Raven UI Improvements & Missing Features

> Deep research document — March 17, 2026

## Priority Matrix

| # | Feature | Effort | Impact | Priority |
|---|---------|--------|--------|----------|
| 1 | Dark Mode Toggle | 1-2 days | High | Quick Win |
| 2 | Command Palette (Cmd+K) | 2-3 days | High | Quick Win |
| 3 | Keyboard Shortcuts | 2-3 days | Medium | Quick Win |
| 4 | Onboarding & Empty States | 2-3 days | High | Quick Win |
| 5 | Export & Downloads | 1-2 days | Medium | Quick Win |
| 6 | Settings Architecture | 3-5 days | High | Medium |
| 7 | Analytics Charts | 1 week | High | Medium |
| 8 | Webhook Delivery Logs | 3-5 days | Medium | Medium |
| 9 | Notification System | 1 week | Medium | Medium |
| 10 | Request/Log Inspector | 1 week | High | Medium |
| 11 | Model Comparison | 1-2 weeks | High | Medium |
| 12 | AI Playground Sessions | 1-2 weeks | High | Major |
| 13 | Prompt Versioning & Testing | 2-3 weeks | High | Major |
| 14 | Guardrails Builder | 2-3 weeks | Medium | Major |

**Recommended order:** 1 → 2 → 4 → 5 → 3 → 6 → 7 → 10 → 8 → 9 → 11 → 12 → 13 → 14

---

## 1. Dark Mode Toggle

**Current state:** CSS variables for dark mode exist in `globals.css` but there is no theme switcher in the UI.

**What to build:**
- Three-state toggle: System / Light / Dark (default to System)
- Place in sidebar footer or header bar
- Persist choice in localStorage, respect `prefers-color-scheme` for System mode
- Prevent flash of incorrect theme on SSR

**Implementation:**
- Use `next-themes` (~1kb, zero deps) — handles system detection, localStorage, SSR flicker prevention via injected script tag
- Tailwind CSS v4: define `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` in `globals.css`
- Use `data-theme` attribute instead of class-based toggling to avoid hydration errors
- Audit all components for hardcoded colors that bypass CSS variables

**References:** Vercel, Linear, Notion all use this exact pattern. shadcn/ui has built-in `next-themes` support.

---

## 2. Command Palette (Cmd+K)

**Current state:** No global search or command palette exists.

**What to build:**
- Fuzzy search across pages, actions, and resources
- Groups: Navigation, Actions, Recent, Search Results
- Nested pages for complex flows (e.g., "Create..." → sub-options)
- Keyboard shortcut hints next to each action

**Searchable items:**
- **Navigation:** All 16+ dashboard pages
- **Actions:** Create Key, Add Provider, Create Webhook, New Chat, Create Prompt
- **Resources:** Search keys by name, models by name, prompts by name
- **Settings:** Switch org, toggle theme, open docs
- **Recent:** Last visited pages, recent searches

**Implementation:**
- Use `cmdk` (powers Linear and Raycast) — Raven can use Base-UI or build a thin wrapper
- Organize commands into groups with icons
- Show keyboard shortcut hints (e.g., `G then D` for Dashboard)
- Rank by frequency + recency, not just fuzzy score (Superhuman's approach)

---

## 3. Keyboard Shortcuts

**Current state:** No keyboard shortcuts exist.

**Essential shortcuts:**
| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Command palette |
| `?` or `Cmd+/` | Show shortcuts help |
| `G then D` | Go to Dashboard |
| `G then L` | Go to Logs |
| `G then A` | Go to Analytics |
| `G then P` | Go to Playground |
| `G then S` | Go to Settings |
| `Esc` | Close modal/drawer |
| `Cmd+Shift+T` | Toggle dark mode |
| `/` | Focus search (outside inputs) |
| `J / K` | Navigate up/down in lists |
| `Enter` | Open selected item |

**Implementation:**
- Use `tinykeys` (<700B, key sequence support) or `react-hotkeys-hook`
- Build a shortcuts help modal (triggered by `?`) grouped by category
- Show shortcut hints in tooltips and command palette
- Disable shortcuts when focus is inside input/textarea/contentEditable

---

## 4. Onboarding & Empty States

**Current state:** Basic empty states exist but are minimal. No post-setup onboarding flow.

**Setup checklist (persistent sidebar widget or dismissible banner):**
1. ✅ Create your account
2. Add your first provider → "Connect your OpenAI API key"
3. Create a virtual key
4. Make your first API call → code snippet + "Try in Playground" button
5. Explore your logs
6. Invite a team member (optional)

**Empty state improvements per page:**
- **Dashboard:** Illustration + "Make your first API call" + inline curl example
- **Logs:** "No requests recorded" + curl example with copy button
- **Keys:** "No API keys" + "Create your first key" button
- **Playground:** Pre-loaded sample conversation
- **Prompts:** "No saved prompts" + link to templates
- **Webhooks:** Brief explanation of what webhooks enable + CTA

**Key stat:** 84% of users abandon products when encountering blank screens without contextual help.

---

## 5. Export & Downloads

**Current state:** No export functionality anywhere.

**What should be exportable:**
| Data | Formats | Notes |
|------|---------|-------|
| Request logs | CSV, JSON | Respect current filters/date range |
| Analytics | CSV | Time-series data for custom analysis |
| Prompt library | JSON | All prompts with version history |
| API key inventory | CSV | Names, created dates, status |
| Usage/billing reports | CSV, PDF | Monthly cost breakdown |
| Audit log | CSV | All administrative actions |

**UX pattern:**
- "Export" button (dropdown: CSV / JSON) on relevant pages
- Small datasets (<1000 rows): immediate download
- Large datasets: async job → notification when ready → download link (expires in 48h)

**Future:** Scheduled reports — weekly email with PDF/CSV usage summary.

---

## 6. Settings Architecture

**Current state:** `/settings` and `/profile` render identical content. No org-level settings.

**Restructure into:**

**User Settings (`/settings/profile`):**
- Profile (name, email, avatar)
- Password change + 2FA setup
- Appearance (theme toggle)
- Notification preferences

**Organization Settings (`/[slug]/settings/*`):**
- General (org name, slug, logo)
- Team (members, invitations, roles)
- Billing (subscription, invoices, usage)
- Providers (API keys for upstream providers)
- Virtual Keys (gateway key management)
- Defaults (default model, rate limits, budgets)
- Guardrails (org-wide content policies)
- Webhooks
- Security (SSO/SAML, IP allowlisting, session policies)
- Audit Log
- Data Retention

**Layout:** Left sidebar listing categories + main content area. Breadcrumbs for navigation context.

---

## 7. Analytics Charts

**Current state:** Analytics page has stat cards and tables but limited chart visualizations.

**Charts to add:**

**Must-have:**
1. **Request Volume** — time series line chart (1h / 24h / 7d / 30d)
2. **Cost Over Time** — stacked area chart by model/provider
3. **Latency Distribution** — histogram with p50 / p95 / p99 lines
4. **Token Usage** — stacked bar chart (input vs output vs cached)
5. **Error Rate** — percentage line over time with status code breakdown
6. **Top Models** — horizontal bar chart by request count and cost
7. **TTFT** — time to first token for streaming requests

**Nice-to-have:**
8. Cost per API Key — table with sparklines
9. Provider Health — uptime/error per upstream provider
10. Budget Burn Rate — projected monthly cost based on trajectory

**Library:** Recharts (already in the project). Consider Tremor for pre-styled dashboard components.

---

## 8. Webhook Delivery Logs

**Current state:** Webhook management exists but has no delivery history, payload inspection, or retry UI.

**What to add:**
- **Delivery history table:** Timestamp, event type, HTTP status, response time, attempt number
- **Payload inspector:** Expandable JSON view of request sent and response received
- **Manual retry:** Button to resend any failed delivery
- **Test endpoint:** Send a synthetic test event to verify connectivity
- **Signing secret:** Auto-generated HMAC secret with copy + verification docs

**Event types to support:**
- `request.completed` / `request.failed` / `request.rate_limited`
- `budget.warning` / `budget.exceeded`
- `key.created` / `key.rotated` / `key.revoked`
- `guardrail.triggered`
- `provider.degraded` / `provider.recovered`

**Reference:** Stripe's webhook dashboard is the gold standard — delivery attempts, response codes, retry history, and manual resend.

---

## 9. Notification System

**Current state:** Toast notifications (Sonner) exist for transient feedback. No persistent notification center.

**What to build:**
- Bell icon in header with unread badge count
- Popover dropdown showing last 10 notifications + "Mark all read" + "View all"
- Full notification history page

**Events that trigger notifications:**

| Event | Severity | Channel |
|-------|----------|---------|
| Budget threshold (50/80/100%) | Critical | In-app + Email |
| API key rate-limited | Critical | In-app + Email |
| Provider outage detected | Critical | In-app + Email |
| Guardrail violation spike | Warning | In-app |
| Key approaching expiration | Warning | In-app |
| Weekly usage summary | Info | Email |
| Team member joined/left | Info | In-app |
| Export ready | Transient | In-app toast |

**Notification preferences page:** Matrix of event types × channels (in-app, email).

**Libraries:** Novu (open-source notification infra) or build custom for low volume.

---

## 10. Request/Log Inspector

**Current state:** Request logs show in a table but clicking a row doesn't show full request/response details.

**What to build:**

**Detail drawer (slide-in panel):**
- **Header:** Request ID, timestamp, model, provider, status badge, latency, cost
- **Request tab:** System prompt, user messages, parameters (temp, max_tokens), headers
- **Response tab:** Full assistant response with syntax highlighting, usage stats (tokens in/out/cached)
- **Metadata tab:** API key used, IP address, user agent, custom headers, guardrail verdicts
- **Timeline:** Visual breakdown — queue time → provider latency → streaming time → total
- **Copy actions:** Copy as cURL, copy response, copy request ID

**JSON viewer features:**
- Collapsible/expandable tree nodes
- Syntax highlighting
- Search within JSON
- Raw vs Pretty toggle
- Copy individual values

**Libraries:** `react-json-view-lite` (lightweight, zero deps) or `@uiw/react-json-view` (feature-rich). Shiki for syntax highlighting.

---

## 11. Model Comparison

**Current state:** Model catalog page shows cards with capabilities and pricing. No comparison or cost calculator.

**What to add:**

1. **Comparison table:** Select 2-4 models, compare side-by-side (pricing, context window, capabilities, latency)
2. **Cost calculator:** Input expected monthly tokens → projected cost per model
3. **Usage-based recommendations:** "Based on your usage, switching from GPT-4o to Claude Sonnet could save $X/month"
4. **Live latency benchmarks:** Show actual measured p50/p95 from Raven's own gateway data (differentiator vs static benchmarks)
5. **Model status:** Live availability indicator per provider (green/yellow/red)

**Playground integration:** "Compare" mode sending same prompt to 2+ models with side-by-side results showing latency, tokens, cost.

**Reference:** Artificial Analysis for comparison UX. Helicone for cost calculator.

---

## 12. AI Playground Sessions

**Current state:** Chat works but conversations are ephemeral — no save, history, or session management.

**What to add:**

1. **Session persistence:** Server-side storage (not just localStorage)
2. **Session sidebar:** Searchable list with model, token count, cost, timestamp
3. **Session actions:** Save, Name/Rename, Fork (branch from any message), Delete
4. **Parameter sidebar:** Temperature, Max Tokens, Top-P, System Prompt with presets ("Creative", "Precise", "Balanced")
5. **Model comparison mode:** Side-by-side, same prompt to 2+ models
6. **Share via link:** Generate read-only shareable URLs
7. **Export:** Download as JSON, cURL, or SDK snippet

**Reference:** OpenAI Playground (compare mode, parameter controls), Google AI Studio (auto-save, branching, export), Anthropic Console (split-screen, test cases).

---

## 13. Prompt Versioning & Testing

**Current state:** Prompt library exists with create/edit/delete but no versioning, testing, or diff views.

**What to add:**

1. **Version history:** Every save creates a new version with timestamp and author
2. **Diff view:** Side-by-side comparison of any two versions
3. **Variable highlighting:** Template variables (`{{user_name}}`) highlighted distinctly in editor
4. **Test panel:** Run prompt against test input, see response + metrics inline
5. **Labels/environments:** Tag versions as "draft", "staging", "production"
6. **Prompt API:** Fetch current production version by name at runtime
7. **A/B deployment:** Assign traffic percentages to different versions (future)

**Editor:** CodeMirror 6 for the prompt editor with custom syntax highlighting for template variables. `jsdiff` for version diffing.

**Reference:** PromptLayer (git-like versioning), Portkey (labeled deployments, rollbacks), Braintrust (CI/CD for prompts).

---

## 14. Guardrails Builder

**Current state:** Guardrails page has basic rule list with create/edit/delete. Very minimal rule builder.

**What to add:**

1. **Visual rule builder:** Form-based with:
   - Trigger point: Input / Output / Both
   - Rule type: Keyword/regex, PII detection, toxicity threshold, custom webhook
   - Action: Block (return error), Warn (flag + allow), Log (silent), Mutate (redact/replace)
2. **Rule testing:** Paste sample text → see which rules fire
3. **Impact dashboard:** How many requests each rule affected (blocked/warned/passed) over time
4. **Rule templates:** Pre-built for common policies (no PII, no prompt injection, no harmful content)
5. **Dry-run mode:** Log what would be blocked without actually blocking
6. **Per-key/per-model assignment:** Apply different guardrails to different keys or models
7. **Rule ordering:** Drag-and-drop priority

**Reference:** Portkey (40+ pre-built guardrails, verdicts dashboard), AWS Bedrock (confidence thresholds, multimodal filtering).

---

## Structural Issues to Fix

### Settings/Profile Duplication
`/settings` and `/profile` currently render identical content. Consolidate into the settings architecture described in section 6.

### Missing Breadcrumbs
Nested pages lack navigation context. Add breadcrumbs below the page header for routes with depth > 1.

### No Global Search
Users cannot search across request logs, keys, or models. The command palette (section 2) addresses navigation but full-text search across resources needs a separate implementation.

### Chat API Route
`/app/api/chat` directory exists but appears empty. Ensure the playground's streaming endpoint is properly implemented.
