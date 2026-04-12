# UI Redesign · Monochromatic, Vercel-Inspired

**Status:** Draft for implementation
**Date:** 2026-04-12
**Owner:** Yoginth

## Goal

Replace Raven's current shadcn-style UI with a monochromatic, Vercel-inspired design that feels distinctive, dense, and professional. The redesign keeps light + dark parity, drops all hues in favor of a pure neutral scale, and uses two strongest references: **Vercel's dashboard** (for shell, sidebar, density, typography) and **OpenAI's playground** (for the chat/playground split-pane).

## Non-goals

- Auth page redesign (stays as-is)
- Email templates
- Docs site (separate project)
- Backend or API changes
- Mobile-native app patterns beyond the existing responsive drawer
- Animation system overhaul beyond the existing reduced-motion handling
- Automated tests — per project convention, no test files are added for UI work; verification is manual (browser check, both modes, all flagship pages)

## Design decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Theme modes | Dark + light, equal parity | User confirmed option B |
| Color interpretation | Strict neutral scale, zero hues | User confirmed palette B |
| Scope | Design system + 4 flagship pages; rest migrate via tokens | User confirmed scope B |
| Typography | Geist Sans + Geist Mono | User confirmed flavor A (Vercel-dense) |
| Approach | Vercel shell + OpenAI playground + ⌘K | User confirmed approach 2 |
| Sidebar nav grouping | Overview ungrouped, then Build / Monitor / Configure | Section 6 confirmed |
| Status convention | Icon + label + weight, never color | Follows from strict mono |

## Architecture & scope

### System-level redesigns (full rewrite)

| Layer | Files | Change |
|---|---|---|
| Design tokens | `apps/web/src/app/globals.css` | Replace theme block with new neutral scale + radius/shadow/motion tokens |
| Typography | `apps/web/src/app/layout.tsx`, `package.json` | Swap Outfit → `geist` package (Geist Sans + Geist Mono) |
| Primitives | `packages/ui/src/components/*` | Retune all; add 10 new primitives |
| Shell | `apps/web/src/app/(dashboard)/layout.tsx`, `components/sidebar.tsx` | New grouped sidebar + usage meter + account + top bar |
| Command palette | new: `apps/web/src/app/(dashboard)/components/command-palette.tsx` | ⌘K everywhere |

### Flagship pages (full redesign)

- `/overview` — Vercel-style metric grid + request volume + provider status
- `/chat` — OpenAI-style split pane (config left, conversation right)
- `/knowledge/[id]` — collection detail with tabs + chunk explorer + file drawer
- `/analytics` — 8-tile dense metric grid with sparklines + full-width chart

### Pages migrating passively (tokens apply, no layout changes)

`/providers`, `/keys`, `/models`, `/routing`, `/requests`, `/budgets`, `/guardrails`, `/audit-logs`, `/webhooks`, `/profile`, `/admin/*`. These inherit the new look through CSS variables. Individual polish passes are out of scope for this spec.

## Color system

Strict neutral scale. 10 tokens per mode (9 steps + 1 inverse anchor). No greens, reds, ambers, or blues anywhere in the UI.

### Dark mode

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#0a0a0a` | Page background |
| `--color-bg-subtle` | `#0f0f0f` | Sidebar, alt-row backgrounds |
| `--color-surface` | `#141414` | Cards, panels, popovers |
| `--color-surface-hover` | `#1a1a1a` | Hover / active surface |
| `--color-border` | `#1f1f1f` | Hairline separators |
| `--color-border-strong` | `#2a2a2a` | Input borders, emphasis |
| `--color-text-muted` | `#737373` | Tertiary labels |
| `--color-text-secondary` | `#a3a3a3` | Body text (less emphasis) |
| `--color-text` | `#ededed` | Primary text |
| `--color-text-strong` | `#fafafa` | Headings + inverse-bg (primary CTA fill) |

### Light mode

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#ffffff` | Page background |
| `--color-bg-subtle` | `#fafafa` | Sidebar, alt-row backgrounds |
| `--color-surface` | `#f5f5f5` | Cards, panels, popovers |
| `--color-surface-hover` | `#ededed` | Hover / active surface |
| `--color-border` | `#e5e5e5` | Hairline separators |
| `--color-border-strong` | `#d4d4d4` | Input borders, emphasis |
| `--color-text-muted` | `#737373` | Tertiary labels |
| `--color-text-secondary` | `#525252` | Body text (less emphasis) |
| `--color-text` | `#171717` | Primary text |
| `--color-text-strong` | `#0a0a0a` | Headings + inverse-bg (primary CTA fill) |

Values snap to Vercel's Geist color scale (`gray-100` through `gray-1000`) where close to avoid drift.

### Primary CTA rule

`bg: text-strong`, `fg: bg`. White button on dark, black button on light. Matches Vercel.

### Status without color

Status is conveyed by shape + icon + weight, never color:

| State | Treatment |
|---|---|
| Operational / success | Filled dot `bg: text-strong`, optional bold label |
| Pending / idle | Ring only (`border: text-muted`, transparent fill) |
| Degraded / warning | Striped dot (45° diagonal stripes, `text-muted`) |
| Error / failure | `!` SVG icon + `font-weight: 600` on label |

Legacy `--color-success`, `--color-warning`, `--color-info`, `--color-destructive` tokens are removed from `globals.css`. Any component or page referencing them is updated during primitive retuning.

### Radius scale

```
--radius-sm: 4px   /* kbd, small pills */
--radius-md: 6px   /* buttons, inputs, nav items, small cards */
--radius-lg: 8px   /* cards, panels */
--radius-xl: 12px  /* modals, dialogs */
```

### Shadow scale (minimal)

```
--shadow-sm: 0 1px 2px rgba(0,0,0,0.06)
--shadow-md: 0 4px 12px rgba(0,0,0,0.10)   /* dropdowns */
--shadow-lg: 0 12px 32px rgba(0,0,0,0.16)  /* modals, command palette */
```

Hairline borders are preferred over shadows. Cards get a border, not a shadow. Shadows only appear on floating elements (dropdowns, popovers, modals, command palette).

### Motion tokens

Kept from current system:

```
--duration-fast: 150ms   /* hover, focus */
--duration-normal: 200ms /* open/close */
--duration-slow: 300ms   /* drawers, palette */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1)
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
```

## Typography

### Font

- **Geist Sans** via `geist/font/sans` (Vercel's `geist` npm package, zero-config in Next.js)
- **Geist Mono** via `geist/font/mono`
- Outfit removed from `app/layout.tsx` and from any direct references

### Feature settings

- `font-feature-settings: "rlig" 1, "calt" 1` (body)
- `font-variant-numeric: tabular-nums` on all numeric contexts: metrics, table numbers, IDs, timestamps, token counts, latency

### Scale

| Token | Size / line-height | Weight | Tracking | Use |
|---|---|---|---|---|
| `text-xs` | 11px / 1.4 | 400 | `-0.005em` | Labels, meta, table cells |
| `text-sm` | 13px / 1.5 | 400 | `-0.01em` | Body, nav, buttons (default UI size) |
| `text-base` | 14px / 1.55 | 400 | `-0.01em` | Main content paragraphs |
| `text-lg` | 16px / 1.45 | 500 | `-0.02em` | Section headings |
| `text-xl` | 20px / 1.3 | 600 | `-0.02em` | Card titles, subsection |
| `text-2xl` | 24px / 1.25 | 600 | `-0.03em` | Page titles |
| `text-3xl` | 32px / 1.2 | 600 | `-0.03em` | Hero metrics (big numbers) |

Weights used: 400, 500, 600 only.

### Uppercase label micro-style

For nav group headers, card section labels, metric labels:
`text-xs` · `text-transform: uppercase` · `letter-spacing: 0.08em` · `font-weight: 500` · `color: text-muted`

## Shell layout

### Sidebar (240px fixed desktop; bottom drawer on mobile)

**Top** (order):
1. **Brand row** — RavenLogo + "Raven" + dropdown chevron (reserved for future org-switcher; currently opens account menu)
2. **Search pill** — `bg: bg`, border, 32px, left icon + "Search..." placeholder + right `⌘K` kbd. Click opens command palette.

**Middle (nav, scrollable):**
1. **Overview** (ungrouped)
2. **Build** — Playground, Knowledge, Models, Routing, Guardrails
3. **Monitor** — Analytics, Requests, Audit Logs
4. **Configure** — Providers, API Keys, Budgets, Webhooks
5. **Admin** (only if `user.role === "admin"`) — Users, Instance Settings

Group labels: uppercase micro-style (see typography). Items: 13px, 32px row height, 10px radius, left icon 14px @ stroke-width 1.5, active state = `surface-hover` bg + `text-strong` fg + `font-weight: 500`.

**Bottom** (order):
1. **Usage meter** — section label + percent + thin progress bar + min/max labels. Pulls "primary metric" per plan (requests for free tier, spend for pro). Separate component.
2. **Account row** — avatar (initials, `surface-hover` bg) + name + email (truncated) + chevron. Clicking opens account menu popover.

**Collapse behavior:** `⌘B` toggles sidebar between 240px and 56px (icons only). Group labels hidden; account row collapses to avatar only.

### Top bar (48px fixed)

Content area header, below the sidebar's top alignment:

- **Left:** Breadcrumb — `Raven / <PageTitle>` or `Raven / <Section> / <Subpage>`. Last segment bold. Separator = `text-muted` slash.
- **Right cluster:**
  - `Feedback` button (secondary)
  - `?` Help icon button
  - Theme toggle (sun/moon icon, toggles between light/dark)

No search bar in the top bar (it's in the sidebar).

### Mobile

Sidebar becomes a bottom sheet drawer (existing pattern, retuned to new tokens). Top bar shrinks to logo + menu button. Command palette still accessible via a "search" icon in the top bar.

## Primitives (`packages/ui/src/components/`)

### Retune (keep API, update styles against new tokens)

`button.tsx`, `badge.tsx`, `spinner.tsx`, `tooltip.tsx`, `table.tsx`, `header.tsx`, `empty.tsx`, `logo.tsx`, `dialog/*`, `form/*` (Input, Textarea, Checkbox, Switch, Select, Field), `tab/*` (Line, Pill)

### Updated variants & sizing

- **`Button`** variants: `primary` (inverse fill), `secondary` (border only), `ghost`, `destructive` (solid inverse + `!` icon; no red). Sizes: `sm` (26px), `md` (32px default), `lg` (36px).
- **`Badge`** — drop color variants. New variants: `outline` (border, `text-secondary`), `solid` (inverse fill), `subtle` (`surface` bg, `text` fg). Add `mono` prop for tabular code-style badges.
- **`Input`/`Textarea`** — 32px height for input, 6px radius, `border` default, `border-strong` on hover, `text-strong` ring (1px) on focus.
- **`Select`** — chevron icon, 32px, same border/focus rules as Input.
- **`Switch`** — monochrome: track = `border-strong`, thumb = `text-strong`. Off state: both `border`.
- **`Checkbox`** — 14px, 4px radius, `border-strong`. Checked: `text-strong` fill with `bg` checkmark.
- **`Tabs`** — Line variant: 1.5px bottom border on active; Pill variant becomes segmented control (group with inner dividers, active = `surface-hover`).
- **`Dialog`/`Modal`** — `surface` bg, `border` 1px, `shadow-lg`, 12px radius, max-width 520 by default.
- **`Tooltip`** — `text-strong` bg, `bg` fg (inverted), 4px radius, 11px, 150ms fade.
- **`DataTable`** — zebra off; 1px `border` dividers; header row = `bg-subtle`, 11px uppercase labels; tabular-nums on number columns.
- **`EmptyState`** — add `compact` variant for in-card empties.
- **`PageHeader`** — add `breadcrumb` prop (receives the segment chain), add `actions` right slot.

### New primitives (10)

| Component | Purpose |
|---|---|
| `Kbd` | Keyboard shortcut pill (`⌘K`, `⌘B`, `Esc`). 10px mono, `bg-subtle` + 1px border. |
| `StatusDot` | Shape-based status: `filled` / `ring` / `striped` / `error`. 6px default. |
| `SectionLabel` | Uppercase 10px grey label. |
| `NavGroup` | Sidebar nav group: label + items. Owns active-state styling. |
| `UsageMeter` | Labeled progress bar for sidebar bottom. |
| `CommandPalette` | ⌘K palette (see next section). |
| `Breadcrumb` | Top-bar breadcrumb with `/` separator. |
| `MetricCard` | Big-number + label + optional sparkline + delta. |
| `Sparkline` | Tiny inline chart (built on recharts). |
| `LogStream` | Virtualized scroll area for logs/audit rows. |

### Icons

Lucide React stays. Default stroke-width 1.5. Icon size 14px in nav, 16px in buttons, 12px in inline tags.

## Flagship pages

### Overview (`/overview`)

Single-column layout with:

1. **Page header** — title "Overview" + date-range segmented control (7d / 30d / 90d) + subtitle with date range
2. **4-column metric card row** — Requests, Tokens, p95 latency, Spend. Each: uppercase label + big number (24px) + sparkline + delta. Tabular-nums.
3. **Split row** — 60/40:
   - Left: **Request volume chart** (stacked bar by provider, 7 bars, legend top-right, max height 160px)
   - Right: **Provider status list** (row per provider, status dot + name + p95 latency)

(Below is out of scope for this spec but tokens apply automatically: recent activity list, alerts feed.)

### Playground (`/chat`) — showpiece

**Top bar of the page** (below shell top bar):
- Breadcrumb extension: "Playground / New prompt" + `Draft` badge
- Right: `Compare`, `History`, `Save` (primary)

**Body** — 2-column grid:

**Left pane (340px):** config, scroll container
- Model selector (card-style, with model icon + name + provider + context)
- Temperature slider (custom, monochrome)
- Max tokens slider
- System prompt (textarea, 90px min)
- Tools list (add/remove rows, "enabled" mono label instead of toggle)
- Variables (empty-state + "Add variable" dashed-border button)

**Right pane (flex 1):** conversation
- Messages scroll area — each message has avatar (user = `surface-hover`, assistant = `text-strong`), role label, content. Assistant messages show latency + token count on right side in mono.
- Composer at bottom — rounded container with textarea + attach button + "Run" primary button. `⌘⏎` runs, `⇧⏎` newline.

**Keyboard shortcuts:**
- `⌘⏎` Run
- `⌘K` Command palette
- `⌘/` Focus composer
- `⌘B` Toggle main sidebar
- `⌘.` Toggle playground config pane (focus mode)

**Compare mode:** Clicking "Compare" splits the right pane into 2 subcolumns, each a full conversation with its own model/prompt config selector. Same ⌘⏎ runs both.

### Knowledge collection detail (`/knowledge/[id]`)

**Collection header:**
- 36px icon + collection name + ID badge (mono)
- Stats row: chunks / files / tokens / size (tabular-nums, each bold number + grey label inline)
- Actions: `Settings` secondary, `Upload` primary

**Tabs:** Chunks · Files · Playground · Analytics · Jobs (Line variant).

**Chunks tab body** — 2-column:
- Left: chunk list with filter input + pagination control. Each chunk row: mono ID + filename + token count top-right, chunk text preview (first 2 lines). Click to select (`bg-subtle` row background).
- Right (380px): source-file drawer for the selected chunk. File name (mono), stat pair cards (size, chunk count), markdown preview pane with fade-out at bottom.

### Analytics (`/analytics`)

**Page header** — title + filter buttons (All providers, date range)

**Metric grid** — 4×2 tiles (8 metrics), separated by 1px dividers (grid-gap with `border` color). Each tile: label (11px grey), big number (22px, tabular-nums), sparkline (100% width, 28px tall).

Metrics: Requests/min · p50 latency · p95 latency · Error rate · Input tokens · Output tokens · Cache hit rate · Spend/hr.

**Large chart below** — 24h request volume. Subtle grid background, single line with filled area beneath, peak annotation top-right in mono.

## Command palette (`⌘K`)

Monochromatic Linear-style palette:

- Trigger: `⌘K` anywhere, or click search pill in sidebar
- Visuals: 520px width, centered vertically at 25% from top, `surface` bg, `border` + `shadow-lg`, 12px radius
- Input: 44px, `Search`-icon + placeholder "Type a command or search..."
- Results: sectioned (`Navigation`, `Actions`, `Recent`), row = icon + title + right-aligned `Kbd` group
- Empty state: "No results for 'xyz'" centered in results area
- Keyboard: `↑`/`↓` nav, `⏎` select, `Esc` close

**Actions registered:**
- Navigation — one entry per sidebar item
- Theme — Toggle theme, Light, Dark, System
- Sidebar — Toggle sidebar (`⌘B`), Focus mode
- Playground — New prompt, Compare, Save
- Account — Profile, Sign out
- Admin (if admin) — Users, Instance Settings

Actions are registered via a central `CommandRegistry` object in `apps/web/src/app/(dashboard)/components/command-registry.ts`. New pages can register their own commands via a hook `useCommandActions(actions)`.

## Migration strategy

### Why passive migration works

All tokens are redeclared in `globals.css`. Every existing page already consumes these tokens via Tailwind utility classes (`bg-background`, `text-foreground`, `border-border`, etc.). Changing the token values changes the look everywhere.

### Tailwind class compatibility

The `@theme` block in `globals.css` keeps the **old Tailwind-friendly token names** (`--color-background`, `--color-foreground`, `--color-muted`, `--color-border`, etc.) as primary tokens — with new monochromatic values. This preserves every existing Tailwind utility class (`bg-background`, `text-foreground`, `bg-muted`, etc.) on non-flagship pages without any edits.

In addition, the `@theme` block declares the **new semantic tokens** (`--color-bg-subtle`, `--color-surface-hover`, `--color-text-strong`, `--color-text-secondary`, `--color-border-strong`, `--color-text-muted`). These generate new utility classes (`bg-bg-subtle`, `text-text-strong`, etc.) used by retuned primitives and flagship pages.

Primitives and flagship pages switch to the new semantic utilities. Non-flagship pages keep using the old utilities and pick up the new color values transparently.

### Token rename map

Old tokens → new tokens (kept as CSS var aliases for one release so non-flagship pages don't break):

```
--color-background          → alias → --color-bg
--color-foreground          → alias → --color-text
--color-card                → alias → --color-surface
--color-card-foreground     → alias → --color-text
--color-popover             → alias → --color-surface
--color-popover-foreground  → alias → --color-text
--color-primary             → alias → --color-text-strong
--color-primary-foreground  → alias → --color-bg
--color-muted               → alias → --color-surface
--color-muted-foreground    → alias → --color-text-muted
--color-surface             → alias → --color-bg-subtle
--color-border              → alias → --color-border
--color-input               → alias → --color-border-strong
--color-ring                → alias → --color-text-strong
--color-accent              → alias → --color-surface-hover
--color-accent-foreground   → alias → --color-text
--color-destructive         → alias → --color-text-strong   /* destructive uses weight + ! icon */
--color-destructive-foreground → alias → --color-bg
--color-success             → alias → --color-text-strong
--color-warning             → alias → --color-text-strong
--color-info                → alias → --color-text-strong
```

Semantic color tokens (`success`, `warning`, `info`, `destructive`) all alias to the same mono values. Pages that still reference them get the monochromatic treatment automatically; they may look a little less expressive until polished individually, but they won't break.

### Order of implementation

1. **Tokens + typography** (globals.css, layout.tsx, install `geist` package, remove Outfit)
2. **Primitive retuning** — update `packages/ui/src/components/*` against new tokens
3. **New primitives** — Kbd, StatusDot, SectionLabel, NavGroup, UsageMeter, Breadcrumb, MetricCard, Sparkline, LogStream, CommandPalette
4. **Shell** — new sidebar + top bar + command palette wired into `(dashboard)/layout.tsx`
5. **Flagship pages** — in order: Overview → Playground → Knowledge → Analytics

Each step is independently shippable. The aliases in step 1 prevent visual regressions across non-flagship pages.

## Success criteria

The redesign is successful when:

1. **Visual cohesion** — every page in the app renders only neutral colors; any hue appearance is a bug
2. **Typography uniformity** — Outfit is gone from `package.json` and code; all text uses Geist Sans or Geist Mono
3. **Flagship pages match mockups** — Overview, Playground, Knowledge, Analytics match the mockups in this spec (screenshots in `.superpowers/brainstorm/*/content/`)
4. **Non-flagship pages work** — every non-flagship page (`/providers`, `/keys`, `/models`, `/routing`, `/requests`, `/budgets`, `/guardrails`, `/audit-logs`, `/webhooks`, `/profile`, `/admin/*`) renders without layout breakage, using new tokens
5. **Light + dark parity** — every page works in both modes with readable contrast (WCAG AA for text)
6. **Command palette** — `⌘K` opens the palette on every page; navigation and theme actions work
7. **Shell behavior** — `⌘B` collapses sidebar; sidebar drawer works on mobile; usage meter shows correct data
8. **No regressions** — all existing features continue to work; existing keyboard shortcuts + accessibility (skip-to-content, reduced-motion) preserved

## Open questions (deferred to implementation)

- Geist font file licensing — confirm `geist` npm package is permitted for commercial use in Raven (it is Vercel-licensed under OFL)
- Whether the usage meter should be gated behind a feature flag for on-prem installs where billing isn't wired up — handle by hiding the meter if no plan data is returned
- Which icons to use for sidebar groups (`Build`, `Monitor`, `Configure`) — sidebar design uses text labels only, no group icons; this stays

## Files touched (summary)

```
apps/web/
  src/app/
    globals.css                                     [rewrite]
    layout.tsx                                      [font swap + lang attr]
    (dashboard)/
      layout.tsx                                    [add top bar + command palette host]
      components/
        sidebar.tsx                                 [rewrite]
        user-menu.tsx                               [retune]
        top-bar.tsx                                 [new]
        command-palette.tsx                         [new]
        command-registry.ts                         [new]
        usage-meter.tsx                             [new]
      overview/page.tsx                             [flagship rewrite]
      chat/page.tsx + subcomponents                 [flagship rewrite]
      knowledge/[id]/page.tsx + subcomponents       [flagship rewrite]
      analytics/page.tsx                            [flagship rewrite]
  package.json                                      [+ geist, − outfit]

packages/ui/src/components/
  button.tsx, badge.tsx, spinner.tsx, tooltip.tsx,
  table.tsx, header.tsx, empty.tsx, logo.tsx,
  dialog/*, form/*, tab/*                           [retune all]

  kbd.tsx                                           [new]
  status-dot.tsx                                    [new]
  section-label.tsx                                 [new]
  nav-group.tsx                                     [new]
  breadcrumb.tsx                                    [new]
  metric-card.tsx                                   [new]
  sparkline.tsx                                     [new]
  log-stream.tsx                                    [new]
  index.ts                                          [add new exports]
```

## References

- Mockups in `.superpowers/brainstorm/68434-1775971975/content/`:
  - `palette-interpretation.html` — palette options (B chosen)
  - `typography-density.html` — type flavors (A chosen)
  - `color-system.html` — full token swatches
  - `shell-layout.html` — sidebar + top bar mockup
  - `playground.html` — playground split-pane mockup
  - `flagship-pages.html` — overview, knowledge, analytics mockups
- Inspirations (user-provided screenshots): Vercel dashboard × 3, Claude Platform, OpenAI Playground × 2
- Vercel Geist design system — https://vercel.com/geist
- Raven `STYLEGUIDE.md` — tech stack, file naming, styling rules
