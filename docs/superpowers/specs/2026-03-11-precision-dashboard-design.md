# Raven Dashboard — Precision Engineering Redesign

**Date:** 2026-03-11
**Status:** Approved
**Philosophy:** A monochrome, information-dense dashboard built by and for engineers. Every pixel justified. Zero decoration. The data is the interface.

---

## 1. Design Principles

1. **Zero decoration** — If it doesn't convey information, it doesn't exist. No gradients for aesthetics, no rounded corners for softness, no animations for delight.
2. **Monochrome only** — White, gray, black. The only colors are semantic status indicators (green/amber/red) and they're used sparingly: provider health status, budget usage thresholds, and HTTP status codes in the request log.
3. **Density over comfort** — Tight spacing, small type, more data per viewport. Engineers want to see everything at once.
4. **Instant** — No transitions, no animations, no loading shimmers. State changes are immediate. The UI never makes you wait for cosmetic reasons.
5. **Keyboard-first** — Command palette (⌘K), nav shortcuts (⌘1-9), escape to close. Mouse is supported but not required.

---

## 2. Color System

```
Background:        #09090b
Surface:           rgba(255,255,255,0.02)
Surface hover:     rgba(255,255,255,0.05)
Surface active:    rgba(255,255,255,0.08)

Border:            rgba(255,255,255,0.06)
Border hover:      rgba(255,255,255,0.10)

Text primary:      #fafafa
Text secondary:    #a3a3a3
Text tertiary:     #525252
Text muted:        #333333

Status green:      #22c55e
Status amber:      #f59e0b
Status red:        #ef4444

Focus ring:        rgba(255,255,255,0.20)
Selection bg:      rgba(255,255,255,0.15)

Chart stroke:      rgba(255,255,255,0.25)
Chart fill high:   rgba(255,255,255,0.08)
Chart fill low:    rgba(255,255,255,0.00)
Bar opacity range: 0.04 to 0.16 (proportional to value)
```

All existing hardcoded colors (`#0a0a0a`, `white/[0.08]`, etc.) are replaced with this system. CSS custom properties in `app.css` using `@theme` block.

---

## 3. Typography

Font: Inter (unchanged). All sizes use `rem` equivalent but specified in `px` for precision.

| Element | Size | Weight | Tracking | Color |
|---------|------|--------|----------|-------|
| Page title | 13px | 600 | -0.3px | primary |
| Section label | 9px | 500 | 1px, uppercase | muted (#333) |
| Stat value | 22px | 600 | -0.5px | primary |
| Stat label | 10px | 400 | 0.5px, uppercase | tertiary |
| Body text | 13px | 400 | normal | secondary |
| Small text | 11px | 400 | normal | tertiary |
| Table header | 10px | 500 | 0.5px, uppercase | muted |
| Table cell | 12px | 400 | normal | secondary |
| Table cell (number) | 12px mono | 500 | normal | primary |
| Code/key | 11px mono | 400 | normal | tertiary |
| Nav item | 12px | 500 | normal | tertiary (inactive) / primary (active) |
| Nav section label | 9px | 500 | 1px, uppercase | muted |
| Button text | 12px | 500 | normal | — |
| Badge text | 10px | 500 | 0.3px | tertiary |
| Tooltip text | 11px | 400 | normal | secondary |
| Command palette input | 14px | 400 | normal | primary |
| Keyboard shortcut | 9px mono | 400 | normal | muted |

Monospace font: `"Berkeley Mono", "SF Mono", "Fira Code", ui-monospace, monospace`.

---

## 4. Spacing & Grid

Base unit: **4px**. All spacing is a multiple.

| Token | Value | Usage |
|-------|-------|-------|
| gap-xs | 4px | Between icon and text in nav |
| gap-sm | 8px | Between related elements |
| gap-md | 12px | Between cards in grid |
| gap-lg | 16px | Between sections |
| gap-xl | 20px | Content area padding |
| gap-2xl | 24px | Major section spacing |

Content area: `padding: 20px`. No responsive changes — same density on all screens.

Card grid gaps: `12px`.
Stat card grid: `4 columns, 12px gap` on ≥1024px, `2 columns` on ≥640px, `1 column` below.

---

## 5. Border Radius

| Element | Radius |
|---------|--------|
| Cards, dialogs | 8px |
| Buttons, inputs, selects | 6px |
| Badges, pills | 4px |
| Sidebar nav items | 5px |
| Dropdown menus | 6px |
| Tooltips | 4px |
| Progress bars | 2px |
| Bar chart bars | 2px top corners |

Tighter than current. No 10px+ radii anywhere. Every existing 10px radius is reduced to 8px or less.

---

## 6. Layout Architecture

### 6.1 Shell

```
┌──────────────────────────────────────────────────┐
│ Sidebar (220px / 52px)  │  Content Area          │
│                         │                        │
│ [Logo]  [Toggle ◀]     │  [Page Title]  [Actions]│
│ [⌘K Search]            │                        │
│                         │  [Page Content]        │
│ ─── Core ───           │                        │
│ ⌘1 Overview            │                        │
│ ⌘2 Requests            │                        │
│ ⌘3 Analytics           │                        │
│                         │                        │
│ ─── Manage ───         │                        │
│    Providers            │                        │
│    Models               │                        │
│    Keys                 │                        │
│    Teams                │                        │
│    Budgets              │                        │
│                         │                        │
│ ─── System ───         │                        │
│    Cache                │                        │
│    Guardrails           │                        │
│    Plugins              │                        │
│    Settings             │                        │
│                         │                        │
│ [● Gateway connected]  │                        │
│ [Raven v0.1.0]         │                        │
└──────────────────────────────────────────────────┘
```

**No top header bar.** The current sticky header is eliminated. Page title and actions move into the content area as the first row. This reclaims 56px of vertical space.

### 6.2 Sidebar — Expanded (220px)

- **Logo area:** 22px rounded-md white logo + "Raven" text (13px semibold) + collapse toggle button (right-aligned)
- **Command palette trigger:** `⌘K Search...` — styled as a subtle input-like row. Clicking opens the command palette overlay.
- **Navigation groups:** Three groups with 9px uppercase labels: "Core", "Manage", "System"
- **Nav items:** Icon (15px × 15px dimensions) + 12px label text + optional keyboard shortcut badge (right-aligned, 9px mono). Top 3 items (Overview, Requests, Analytics) get ⌘1-⌘3 shortcuts.
- **Active state:** `rgba(255,255,255,0.06)` background, primary text color, primary icon color
- **Inactive state:** tertiary text, tertiary icon
- **Hover:** `rgba(255,255,255,0.04)` background, secondary text
- **Footer:** Horizontal separator, then two rows — gateway status (green/red dot + "Connected"/"Disconnected" in 10px) and version badge ("Raven" + "v0.1.0" mono pill)
- **No transition on collapse** — instant switch

### 6.3 Sidebar — Collapsed (52px)

- **Logo:** Just the 22px icon, centered
- **Command palette:** Search icon only, centered
- **Nav items:** Icon only (15px), centered, with tooltip on hover showing label + shortcut
- **Active state:** same background treatment
- **Footer:** Just the status dot, centered
- **Collapse state persists** in localStorage

### 6.4 Content Area

- `margin-left: 220px` (expanded) or `52px` (collapsed). Instant switch, no transition.
- `padding: 20px` all sides
- First row: page title (13px semibold) left-aligned + page actions (date picker, buttons) right-aligned
- Content below: page-specific layout

### 6.5 Mobile (< 1024px)

- Sidebar hidden by default
- Hamburger button fixed top-left (28px, ghost style)
- Tap opens sidebar as overlay with `rgba(0,0,0,0.6)` backdrop — appears instantly, no slide-in transition
- Tap backdrop or press Escape to close — instant, no animation
- Content takes full width (no margin-left)

---

## 7. Command Palette (⌘K)

New component. Overlay that appears centered on screen.

- **Trigger:** ⌘K keyboard shortcut or clicking the sidebar search area
- **Appearance:** Centered overlay, 560px wide, max-height 400px. `#111111` background, `rgba(255,255,255,0.08)` border, 8px radius.
- **Backdrop:** `rgba(0,0,0,0.6)`, no blur
- **Input:** 14px, no border, transparent background. Placeholder: "Search pages, actions, settings..."
- **Results:** Grouped by category (Pages, Actions). Each result shows icon + label + optional shortcut. 10 results max visible, scrollable.
- **Navigation:** Arrow keys to move, Enter to select, Escape to close
- **Pages searchable:** All 12 nav items
- **Actions searchable:** "Create Key", "Create Org", "Create Budget" (each navigates to the relevant page and opens the create dialog)
- **Search implementation:** Simple case-insensitive `includes()` substring matching. No external library needed — the item count is small (<20 total).
- **Keyboard focus:** Active result has `rgba(255,255,255,0.05)` background. `aria-selected` on active item. Focus trap within the palette while open.
- **Event listeners:** Registered in Shell component on mount. `⌘K` / `Ctrl+K` opens palette. `⌘1-3` / `Ctrl+1-3` navigate to Overview/Requests/Analytics. All listeners use `useEffect` cleanup.
- **No transition** — appears and disappears instantly

---

## 8. Component Specifications

### 8.1 Stat Card

```
┌─────────────────────────────────┐
│ TOTAL REQUESTS          ┌────┐  │
│                         │████│  │
│ 847,291                 │█  █│  │
│                         │ ██ │  │
│                         └────┘  │
└─────────────────────────────────┘
```

- Container: `border: 1px solid rgba(255,255,255,0.06)`, `background: rgba(255,255,255,0.02)`, `border-radius: 8px`, `padding: 12px 14px`
- Label: 10px uppercase, 0.5px tracking, tertiary color
- Value: 22px semibold, -0.5px tracking, primary color. `margin-top: 8px`.
- Sparkline: right-aligned, 64x28px, monochrome (white 0.25 stroke, 0.08→0.00 gradient fill)
- **No trend percentage** — sparkline tells the story
- Hover: border becomes `rgba(255,255,255,0.10)` — instant, no transition

### 8.2 Card

- `border: 1px solid rgba(255,255,255,0.06)`, `background: rgba(255,255,255,0.02)`, `border-radius: 8px`, `padding: 16px`
- Card header: flex row, title left (9px uppercase muted label), optional action right. `margin-bottom: 12px`.
- No elevation, no shadow, no gradient.
- Hover: none (cards don't hover unless clickable)

### 8.3 Button

| Variant | Background | Text | Border | Hover bg |
|---------|-----------|------|--------|----------|
| primary | #fafafa | #09090b | none | #e5e5e5 |
| secondary | transparent | #a3a3a3 | rgba(255,255,255,0.06) | rgba(255,255,255,0.05) |
| ghost | transparent | #a3a3a3 | none | rgba(255,255,255,0.05) |
| danger | transparent | #ef4444 | rgba(239,68,68,0.2) | rgba(239,68,68,0.08) |

- Default height: **28px** (down from 36px). Padding: `4px 10px`.
- Small: 24px height, 10px font, padding: `3px 8px`.
- Font: 12px, weight 500.
- Border-radius: 6px.
- Focus: `ring-1 ring-white/20 ring-offset-1 ring-offset-[#09090b]`
- Disabled: 0.4 opacity, cursor-not-allowed.
- **No transitions** on any state change.

### 8.4 Badge

- Container: `border: 1px solid rgba(255,255,255,0.06)`, `border-radius: 4px`, `padding: 1px 6px`
- Text: 10px, weight 500, tertiary color
- **No dot variant** — just text + border. Clean and dense.
- Status variants change only the border color:
  - success: `rgba(34,197,94,0.25)` border, `#22c55e` text
  - warning: `rgba(245,158,11,0.25)` border, `#f59e0b` text
  - error: `rgba(239,68,68,0.25)` border, `#ef4444` text
- Default variant: neutral border and tertiary text.

### 8.5 Input

- Height: 32px. Padding: `6px 10px`.
- Background: transparent. Border: `rgba(255,255,255,0.06)`. Radius: 6px.
- Text: 13px, primary color. Placeholder: muted (#333).
- Focus: border becomes `rgba(255,255,255,0.15)`, ring `rgba(255,255,255,0.10)`.
- Label: 11px, tertiary, `margin-bottom: 4px`.
- Error: red border, red ring, red error text below.
- **No transitions.**

### 8.6 Select

- Same dimensions and styling as Input.
- Chevron icon: 12px, muted color, right-aligned with 8px padding-right.
- Options dropdown: `#111111` background, `rgba(255,255,255,0.08)` border, 8px radius.

### 8.7 Table

- **Header row:** 10px uppercase muted text, 0.5px tracking. Height: 32px. Bottom border: `rgba(255,255,255,0.06)`. No background.
- **Body row:** Height: 36px (down from ~44px). Border: none normally, `rgba(255,255,255,0.04)` bottom border on every row.
- **Row hover:** `rgba(255,255,255,0.02)` background — instant.
- **Cell text:** 12px regular, secondary color. Numbers in monospace, weight 500, primary color.
- **Sortable columns:** Chevron indicator, 8px muted. Active sort: primary color chevron.
- **Alternating rows:** Not used. Too decorative. Borders are enough.

### 8.8 Data Table (wrapper)

- Search input: top-left, full width minus action button area. 32px height, 13px text, placeholder "Search...".
- Pagination: bottom row. Left: "1–20 of 847 results" in 11px tertiary. Right: page buttons (24px square, 11px text, ghost button style).
- Actions slot: top-right, for page-specific buttons.
- Per page: 20 items (unchanged).

### 8.9 Dialog

- Overlay: `rgba(0,0,0,0.6)`, no blur.
- Container: `#111111` background, `rgba(255,255,255,0.08)` border, 8px radius. Max-width: 480px. Padding: 20px.
- Title: 13px semibold, primary color.
- Description: 12px, tertiary, `margin-top: 4px`.
- Close button: X icon, 14px, muted, top-right. Hover: secondary color.
- Footer: flex row, justify-end, 8px gap. `margin-top: 16px`. `border-top: 1px solid rgba(255,255,255,0.06)`, `padding-top: 12px`.
- **No enter/exit animation.** Appears and disappears instantly.
- Escape key closes.

### 8.10 Tabs

- Tab list: flex row, gap: 0. Background: `rgba(255,255,255,0.02)`, border: `rgba(255,255,255,0.06)`, radius: 6px, padding: 2px.
- Tab trigger: `padding: 4px 12px`, 11px text, weight 500.
  - Inactive: tertiary color, transparent background.
  - Active: primary color, `rgba(255,255,255,0.08)` background, 5px radius.
  - Hover (inactive): secondary color.
- Tab content: `margin-top: 12px`. **No fade transition** — instant switch.

### 8.11 Tooltip

- Background: `#1a1a1a`. Border: `rgba(255,255,255,0.08)`. Radius: 4px. Padding: `4px 8px`.
- Text: 11px, secondary color.
- **No delay** — appears instantly on hover.
- **No animation.**
- Arrow: none. Clean rectangular tooltip.
- Positioning: 6px offset from trigger.

### 8.12 Dropdown Menu

- Background: `#111111`. Border: `rgba(255,255,255,0.08)`. Radius: 6px. Padding: 4px.
- Item: `padding: 6px 10px`, 12px text, secondary color. Radius: 4px.
- Item hover: `rgba(255,255,255,0.05)` background. Instant.
- Danger item: `#ef4444` text, `rgba(239,68,68,0.08)` hover background.
- Separator: `rgba(255,255,255,0.06)`, `margin: 4px 0`.
- **No animation.**

### 8.13 Skeleton / Loading State

- **No shimmer animation.** Solid `rgba(255,255,255,0.04)` blocks.
- Card skeleton: solid rectangle matching card dimensions.
- Table skeleton: 5 rows of solid bars at table cell positions.
- Loading feels like "waiting for data to fill in" not "watching a light show."

### 8.14 Empty State

- Centered, vertically and horizontally within parent.
- Icon: 20px, muted (#333). Default: Inbox.
- Title: 13px semibold, secondary color.
- Description: 12px, tertiary, max-width 240px, centered.
- Optional action button: secondary variant.
- Compact — no more than 120px total height.

### 8.15 Separator

- Height: 1px. Color: `rgba(255,255,255,0.06)`.
- Vertical variant: Width: 1px.
- No margins built in — parent controls spacing.

### 8.16 Toggle Switch

Used in Providers page for "Enable Provider" setting.

- Track: 32px × 16px, 8px radius. Background: `rgba(255,255,255,0.06)` (off) or `#22c55e` (on).
- Thumb: 12px circle, `#fafafa`. Positioned 2px from left (off) or 2px from right (on).
- Label: 12px, secondary, to the left of the toggle. Gap: 8px.
- **No transition** — toggle snaps between states instantly.
- Disabled: 0.4 opacity.

### 8.17 Error Banner

Inline error display for failed API calls or form errors within dialogs.

- Container: `border: 1px solid rgba(239,68,68,0.2)`, `background: rgba(239,68,68,0.05)`, `border-radius: 6px`, `padding: 8px 12px`.
- Text: 12px, `#ef4444`.
- Icon: AlertCircle (14px) left of text, gap 8px.
- Placed above the action that caused the error (e.g., above dialog footer buttons, or above a table if a fetch fails).
- Dismissible: small X button right-aligned, muted, ghost style.

### 8.18 Loading Spinner

Exception to the "no animations" rule — functional loading spinners during async operations (save, delete, rotate key) are kept.

- Use `Loader2` icon from lucide-react with `animate-spin` CSS.
- Size: matches the button text size (12px for default buttons).
- Replaces button text during loading: e.g., button shows spinner + "Saving..." instead of "Save".
- This is the **only** animation in the entire app. It's functional, not decorative.

### 8.19 Date Range Picker

- Layout: flex row. Icon (Calendar, 13px, muted) + button group.
- Button group: same styling as Tabs container — `rgba(255,255,255,0.02)` bg, border, 6px radius, 2px padding.
- Preset buttons: `1h`, `24h`, `7d`, `30d`, `Custom` — same as tab triggers.
- Custom range: two datetime-local inputs (styled to match Input component) + Apply button (secondary).
- Active preset: same active state as tabs.

---

## 9. Chart Specifications

### 9.1 Common Chart Properties

- **No animation on load.** `isAnimationActive={false}` on all Recharts components.
- **No grid lines.** Remove CartesianGrid entirely. The data stands alone.
- **Axis text:** 10px, muted (#333), monospace for numbers.
- **Axis line:** `rgba(255,255,255,0.04)`.
- **Tooltip:** `#1a1a1a` background, `rgba(255,255,255,0.08)` border, 4px radius. 11px text. Set `<Tooltip cursor={false} />` in Recharts — no vertical reference line on hover.
- **Responsive:** `<ResponsiveContainer width="100%" height={height} />`

### 9.2 Area Chart

- **Stroke:** `rgba(255,255,255,0.25)`, width 1.5px.
- **Fill:** Linear gradient from `rgba(255,255,255,0.08)` at top to `rgba(255,255,255,0.00)` at bottom.
- **Dot:** None normally. On hover: 3px solid white dot.
- **X-axis:** Date labels, 10px muted. Tick line hidden.
- **Y-axis:** Value labels, 10px muted mono. Tick line hidden.
- **Default height:** 240px (down from 300px).

### 9.3 Bar Chart

- **Bar fill:** `rgba(255,255,255, opacity)` where opacity is proportional to the bar's value relative to max (range: 0.04 to 0.16). The tallest bar gets 0.16, the shortest gets 0.04. Implement using Recharts `<Cell>` component to set per-bar fill: `{data.map((entry, i) => <Cell key={i} fill={...} />)}`.
- **Bar radius:** `[2, 2, 0, 0]` (top corners only).
- **Bar gap:** 4px between bars.
- **Hover:** Bar fill opacity increases by 0.06. Instant.
- **X-axis labels:** 10px, muted, below bars.
- **Default height:** 200px.

### 9.4 Sparkline

- **Size:** 64x28px (unchanged).
- **Stroke:** `rgba(255,255,255,0.25)`, width 1px. (Uses system `Chart stroke` token.)
- **Fill:** Linear gradient from `rgba(255,255,255,0.08)` to transparent. (Uses system `Chart fill high` → `Chart fill low` tokens.)
- **No axes, no labels, no tooltip, no dots.**
- Purely visual trend indicator.

---

## 10. Page Designs

### 10.1 Overview

```
[Page title: "Overview"]                              [DateRangePicker]

┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ REQUESTS│ │ COST    │ │ CACHE   │ │ LATENCY │
│ 847,291 │ │ $2,847  │ │ 73.4%   │ │ 142ms   │
│    ▂▃▅▆ │ │  ▅▆▇█  │ │ ▇█▇▅▆▇ │ │ ▃▂▃▂▂▃ │
└─────────┘ └─────────┘ └─────────┘ └─────────┘

┌──────────────────────┐  ┌──────────────────────┐
│ TOP MODELS           │  │ PROVIDER HEALTH      │
│                      │  │                      │
│ ████████████  gpt-4o │  │ OpenAI      ● healthy│
│ ████████     claude  │  │ Anthropic   ● healthy│
│ █████        gemini  │  │ Google      ● degraded│
│ ███          llama   │  │ Meta        ● down   │
│ █            mistral │  │                      │
└──────────────────────┘  └──────────────────────┘
```

- 4 stat cards in a row (sparklines right-aligned within each)
- 2-column grid below: bar chart left, provider list right
- Provider list: rows with name left, status badge right. Row height 36px. Hover: surface hover.
- Bar chart: horizontal layout, bars extend from left, model name on left edge.

### 10.2 Requests

```
[Page title: "Requests"]           [Status filter] [Provider filter]

┌────────────────────────────────────────────────────────────────────┐
│ [Search...]                                                        │
├────────────────────────────────────────────────────────────────────┤
│ TIMESTAMP       PROVIDER  MODEL      STATUS  LATENCY TOKENS  COST │
│ 12:34:56.789    OpenAI    gpt-4o     200     142ms   1,247  $0.04 │
│ 12:34:52.103    Anthropic claude-3.5 200     89ms    892    $0.02 │
│ 12:34:48.771    Google    gemini-pro 500     -       -      -     │
│ ...                                                                │
├────────────────────────────────────────────────────────────────────┤
│ 1–20 of 847 results                           [◀] [1] [2] [3] [▶]│
└────────────────────────────────────────────────────────────────────┘
```

- Dense table layout. 36px rows.
- Timestamps in monospace (HH:MM:SS.ms format).
- Status codes: `200` in green text, `4xx` in amber, `5xx` in red. No badge — just colored text.
- Latency and cost in monospace.
- Token count in monospace with comma formatting.
- Cache hit: show as small "CACHED" badge inline if true.
- **Click row → inline expansion** (not a modal). Row expands below to show request detail panel. Click again to collapse. Maximum one expanded row at a time.
- Filters: two Select dropdowns in the page header area (status code, provider).

**Expanded row detail panel:**

```
┌────────────────────────────────────────────────────────────────────┐
│ (collapsed row above)                                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  REQUEST ID        PROVIDER        MODEL           STATUS          │
│  req_abc123...     OpenAI          gpt-4o          200             │
│                                                                    │
│  TIMESTAMP         LATENCY         TOKENS (IN)     TOKENS (OUT)    │
│  2026-03-11        142ms           847             400             │
│  12:34:56.789                                                      │
│                                                                    │
│  COST              CACHE           ERROR                           │
│  $0.04             miss            —                               │
│                                                                    │
│  ┌─ ERROR (if status >= 400) ──────────────────────────────────┐  │
│  │ {"error": "rate_limit_exceeded", "message": "..."}          │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

- Background: `rgba(255,255,255,0.01)` — barely distinguishable from normal rows.
- Top border: `rgba(255,255,255,0.06)`.
- Padding: `16px 20px`.
- 4-column grid of key-value pairs. Label: 9px uppercase muted. Value: 12px mono primary.
- Error block (only shown if `error` field exists on the RequestLog): `<pre>` with 11px monospace, tertiary text, `rgba(255,255,255,0.02)` background, `rgba(255,255,255,0.06)` border, 6px radius, padding 12px. Max-height 160px, scrollable.
- Data comes from the existing `RequestLog` type fields: `id`, `timestamp`, `provider`, `model`, `status_code`, `latency_ms`, `tokens.input`, `tokens.output`, `cost`, `cache_hit`, `error`.

### 10.3 Analytics

```
[Page title: "Analytics"]                             [DateRangePicker]

┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ TOTAL   │ │PROJECTED│ │ CACHE   │ │ TOTAL   │
│ COST    │ │ MONTHLY │ │ SAVINGS │ │REQUESTS │
│ $2,847  │ │ $8,541  │ │ $1,203  │ │ 847,291 │
└─────────┘ └─────────┘ └─────────┘ └─────────┘

[Cost Over Time] [By Team] [By Model]    ← tab bar

┌────────────────────────────────────────────────────────────────────┐
│ COST OVER TIME                                                     │
│                                                                    │
│ ▁▂▃▄▅▆▇█▇▆▅▆▇█▇▆▅▄▃▂▃▄▅▆▇                                      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

- 4 stat cards (no sparklines — save space, the big chart below tells the story)
- Tabs: "Cost Over Time" / "By Team" / "By Model"
- Cost Over Time: area chart, 240px height
- By Team: horizontal bar chart
- By Model: horizontal bar chart, top 8 models

### 10.4 Providers

```
[Page title: "Providers"]               [Auto-refreshes every 30s]

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ ● OpenAI         │  │ ● Anthropic      │  │ ○ Google         │
│   healthy        │  │   healthy        │  │   degraded       │
│                  │  │                  │  │                  │
│ Latency: 142ms   │  │ Latency: 89ms    │  │ Latency: 340ms   │
│ Errors:  0.1%    │  │ Errors:  0.0%    │  │ Errors:  2.3%    │
│                  │  │                  │  │                  │
│ gpt-4o, gpt-4   │  │ claude-3.5       │  │ gemini-pro       │
│ gpt-3.5-turbo   │  │ claude-3-haiku   │  │ gemini-flash     │
│ +2 more          │  │                  │  │                  │
│                  │  │                  │  │                  │
│ [Configure]      │  │ [Edit]           │  │ [Edit]           │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

- 3-column card grid (2 on md, 1 on mobile)
- Each card: provider name with status dot, health metrics (latency, error rate), model list (first 4 + "+N more"), action button
- Card hover: border brightens to 0.10
- Configure button: secondary variant
- Status dot: green/amber/red — the only color on the page
- Dialog for configuration: API key input (with show/hide toggle), base URL, enable toggle (Section 8.16), delete (with confirmation flow)
- **Data flow:** Uses existing `useProviders()` for base provider list and `useProviderHealth(providerId)` per-card for latency/error metrics. The `ProviderWithConfig` type combines both. No changes to hooks needed.

### 10.5 Models

```
[Page title: "Models"]

┌────────────────────────────────────────────────────────────────────┐
│ [Search...]                                                        │
├────────────────────────────────────────────────────────────────────┤
│ MODEL             PROVIDER    INPUT $/M   OUTPUT $/M  CTX    FEAT │
│ gpt-4o            OpenAI      $5.00       $15.00      128K   S V T│
│ claude-3.5-sonnet  Anthropic   $3.00       $15.00      200K   S V T│
│ gemini-pro        Google      $1.25       $5.00       128K   S   T│
│ ...                                                                │
└────────────────────────────────────────────────────────────────────┘
```

- Dense table. Provider shown as text (no badge — just the name).
- Pricing in monospace, right-aligned.
- Context window: formatted as "128K" in monospace.
- Features: single-letter abbreviations in monospace: `S` (stream), `V` (vision), `T` (tools). Muted if not supported, primary if supported.
- Sortable by all columns.

### 10.6 Virtual Keys

```
[Page title: "Keys"]                                    [+ Create Key]

┌────────────────────────────────────────────────────────────────────┐
│ [Search...]                                                        │
├────────────────────────────────────────────────────────────────────┤
│ NAME        KEY          BUDGET    RATE LIMIT  LAST USED   EXPIRES│
│ production  rv-abc1...   $5,000/mo  100/min    2m ago      never  │
│ staging     rv-def2...   $500/mo    50/min     1h ago      Dec 31 │
│ testing     rv-ghi3...   unlimited  unlimited  3d ago      never  │
│ ...                                                                │
├────────────────────────────────────────────────────────────────────┤
│ 1–20 of 12 results                                                 │
└────────────────────────────────────────────────────────────────────┘
```

- Dense table. Key prefix in monospace with "..." truncation.
- "Last used" as relative time ("2m ago", "1h ago", "3d ago").
- Actions column: three-dot dropdown → Rotate, Delete (danger).
- Create dialog: Name input, budget limit, rate limit, allowed models multiselect, expiry date.
- Key display dialog (after creation): monospace key display with copy button. "This is the only time you'll see this key."

### 10.7 Teams & Users

```
[Page title: "Teams"]                                   [+ Create Org]

[Organizations] [Users]    ← tab bar

┌────────────────────────────────────────────────────────────────────┐
│ [Search...]                                                        │
├────────────────────────────────────────────────────────────────────┤
│ NAME          SLUG         DESCRIPTION              CREATED        │
│ Acme Corp     acme-corp    Main organization        Jan 15, 2026  │
│ Research      research     ML research team         Feb 3, 2026   │
│ ...                                                                │
└────────────────────────────────────────────────────────────────────┘
```

- Tabs: "Organizations" / "Users"
- Org table: name, slug (monospace), description (truncated), created date
- User table: name, email, role (badge), teams count, joined date
- Role badges: "admin" / "member" / "viewer" — default badge variant (no color)
- Create org dialog: name, slug (auto-generated from name), description

### 10.8 Budgets

```
[Page title: "Budgets"]                              [+ Create Budget]

┌────────────────────────────────────────────────────────────────────┐
│ [Search...]                                                        │
├────────────────────────────────────────────────────────────────────┤
│ TYPE    ENTITY     LIMIT      PERIOD   USAGE               SPENT  │
│ org     acme-corp  $5,000     monthly  ████████░░  82%     $4,100 │
│ team    research   $1,000     monthly  ████░░░░░░  43%     $430   │
│ key     rv-abc1    $500       daily    █████████░  91%     $455   │
│ ...                                                                │
└────────────────────────────────────────────────────────────────────┘
```

- Dense table with inline progress bars.
- Progress bar: 80px wide, 4px height, 2px radius. Fill: `rgba(255,255,255,0.20)` normally.
  - >70%: fill becomes `rgba(245,158,11,0.35)` (amber tint)
  - >90%: fill becomes `rgba(239,68,68,0.35)` (red tint)
- Percentage in monospace next to the bar.
- Entity shown in monospace.
- **Create Budget dialog:** Fields — Entity type (Select: org/team/key), Entity ID (Input, monospace), Limit (Input, currency formatted), Period (Select: daily/weekly/monthly), Alert threshold (Input, percentage, default 80%). Footer: Cancel (ghost) + Create (primary).

### 10.9 Cache

```
[Page title: "Cache"]                                [DateRangePicker]

┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│HIT RATE │ │ TOTAL   │ │ STORAGE │ │ COST    │
│         │ │ HITS    │ │         │ │ SAVINGS │
│ 73.4%   │ │ 621,847 │ │ 1.2 GB  │ │ $1,203  │
└─────────┘ └─────────┘ └─────────┘ └─────────┘

┌────────────────────────────────────────────────────────────────────┐
│ CACHE PERFORMANCE                                                  │
│                                                                    │
│ ▁▂▃▄▅▆▇█▇▆▅▆▇█▇▆▅▄▃▂▃▄▅▆▇                                      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

- 4 stat cards with sparklines
- Area chart below showing hit rate over time (240px)
- formatBytes utility for storage display

### 10.10 Guardrails

```
[Page title: "Guardrails"]

┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│                    Coming Soon                                     │
│        Content filtering and safety guardrails                     │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

- Empty state, centered. Shield icon, 20px, muted.
- "Coming Soon" title, description below.

### 10.11 Plugins

- Same empty state pattern as Guardrails. Puzzle icon.

### 10.12 Settings

```
[Page title: "Settings"]

┌────────────────────────────────────────────────────────────────────┐
│ GATEWAY CONFIGURATION                                              │
│                                                                    │
│ Version          0.1.0                                             │
│ ────────────────────────────────                                   │
│ Uptime           14d 3h 22m                                       │
│ ────────────────────────────────                                   │
│ Cache            enabled                                           │
│ ────────────────────────────────                                   │
│ Guardrails       disabled                                          │
│ ────────────────────────────────                                   │
│ Rate Limiting    enabled                                           │
│ ────────────────────────────────                                   │
│ Providers        OpenAI, Anthropic, Google                         │
└────────────────────────────────────────────────────────────────────┘
```

- Key-value rows. Label: 12px secondary, left-aligned. Value: 12px primary, right-aligned or after a gap.
- "enabled"/"disabled" shown as badge (success/default variant).
- Providers: comma-separated list or individual badges.
- Separator between each row.

---

## 11. Global CSS Changes

### 11.1 app.css

Replace entire file with:

```css
@import "tailwindcss";

@theme {
  --color-bg: #09090b;
  --color-surface: rgba(255,255,255,0.02);
  --color-surface-hover: rgba(255,255,255,0.05);
  --color-surface-active: rgba(255,255,255,0.08);

  --color-border: rgba(255,255,255,0.06);
  --color-border-hover: rgba(255,255,255,0.10);

  --color-text-primary: #fafafa;
  --color-text-secondary: #a3a3a3;
  --color-text-tertiary: #525252;
  --color-text-muted: #333333;

  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  --color-focus: rgba(255,255,255,0.20);

  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: "Berkeley Mono", "SF Mono", "Fira Code", ui-monospace, monospace;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text-primary);
}

::selection {
  background-color: rgba(255, 255, 255, 0.15);
  color: #fff;
}

::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.12);
}
```

**All animation keyframes and animation utility classes removed.** No shimmer, no fade-in, no slide-in, no pulse-dot.

**Exception:** Keep `@keyframes spin` and `.animate-spin` for the `Loader2` loading spinner (see Section 8.18). This is the only animation in the app.

**Firefox scrollbar support:** Add `scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.06) transparent;` to the `html` rule for Firefox compatibility alongside the WebKit-specific pseudo-elements.

---

## 12. Files Changed

Every file in the dashboard is rewritten. Full list:

### Layout (3 files — major rewrites)
- `src/components/layout/shell.tsx` — Dual-mode sidebar support, no header, keyboard shortcut registration
- `src/components/layout/sidebar.tsx` — Complete rewrite: dual-mode, command palette trigger, section labels, shortcuts, footer status, collapse toggle, localStorage persistence
- `src/components/layout/header.tsx` — **Deleted.** Header functionality absorbed by content area page titles and sidebar footer.

### New Components (1 file)
- `src/components/shared/command-palette.tsx` — New. ⌘K overlay with fuzzy search.

### UI Components (12 files — all rewritten)
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/tooltip.tsx`
- `src/components/ui/dropdown-menu.tsx`

### Chart Components (3 files — all rewritten)
- `src/components/charts/sparkline.tsx`
- `src/components/charts/bar-chart.tsx`
- `src/components/charts/area-chart.tsx`

### Shared Components (4 files — all rewritten)
- `src/components/shared/stat-card.tsx`
- `src/components/shared/date-range-picker.tsx`
- `src/components/shared/data-table.tsx`
- `src/components/shared/empty-state.tsx`

### Pages (12 files — all rewritten)
- `src/pages/overview.tsx`
- `src/pages/requests.tsx`
- `src/pages/analytics.tsx`
- `src/pages/providers.tsx`
- `src/pages/models.tsx`
- `src/pages/keys.tsx`
- `src/pages/teams.tsx`
- `src/pages/budgets.tsx`
- `src/pages/cache.tsx`
- `src/pages/guardrails.tsx`
- `src/pages/plugins.tsx`
- `src/pages/settings.tsx`

### Styles (1 file)
- `src/app.css` — Complete rewrite per section 11.

### App Entry (1 file — minor update)
- `src/main.tsx` — Remove any animation-related imports if present. No structural change.

### Hooks & Lib (unchanged)
- `src/hooks/*` — No changes needed. Data layer is clean.
- `src/lib/api.ts` — No changes.
- `src/lib/types.ts` — No changes.
- `src/lib/utils.ts` — Move the existing `formatBytes` function from `cache.tsx` into `utils.ts` as a shared utility. No other changes.

**Total: 37 files changed, 1 deleted (header.tsx), 1 new (command-palette.tsx).**

---

## 13. Non-Goals

- No dark/light theme toggle. It's dark, period.
- No responsive breakpoints for spacing. Same density everywhere.
- No notification system or toast messages.
- No data export UI (just in command palette actions).
- No onboarding or first-run experience.
- No browser-side caching or service worker.
