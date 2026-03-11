# Raven Dashboard Redesign — Ultra Minimal

## Overview

Complete visual redesign of the Raven AI Gateway dashboard. The current teal-accented dark theme is replaced with an ultra minimal monochrome aesthetic inspired by Linear and Vercel. No accent colors. Typography-driven hierarchy. Border-defined surfaces with no background fills.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Direction | Ultra Minimal — monochrome, white-on-black |
| Layout | Clean sidebar (220px) with text labels |
| Stat cards | Numbers + subtle sparkline + trend text |
| Surfaces | Border-only, no background fills |

## Design System

### Color Palette

All decorative color is removed. The palette is strictly monochrome with semantic status colors reserved for health/error indicators only. Background changes from `#09090b` (current) to `#0a0a0a` (pure dark, no blue tint).

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#0a0a0a` | Page background, sidebar, modal |
| `--border` | `rgba(255,255,255,0.08)` | Card borders, sidebar border, header border |
| `--border-subtle` | `rgba(255,255,255,0.04)` | Row dividers, internal separators |
| `--text-primary` | `#fafafa` | Headings, stat values, primary data |
| `--text-secondary` | `#a3a3a3` | Body text, secondary data, trend text |
| `--text-tertiary` | `#525252` | Labels, table headers, inactive nav |
| `--surface-hover` | `rgba(255,255,255,0.04)` | Row hover, nav hover |
| `--surface-active` | `rgba(255,255,255,0.06)` | Active nav item, active pill |
| `--btn-primary-bg` | `#fafafa` | Primary button background |
| `--btn-primary-text` | `#0a0a0a` | Primary button text |
| `--status-success` | `#22c55e` | Health: connected/healthy |
| `--status-warning` | `#f59e0b` | Health: degraded |
| `--status-error` | `#ef4444` | Health: error/disconnected |

### Typography

Font: Inter (unchanged). Page title increases from current 14px (`text-sm`) to 16px.

| Element | Size | Weight | Color | Extra |
|---------|------|--------|-------|-------|
| Page title | 16px | 600 | `--text-primary` | — |
| Stat value | 24px | 600 | `--text-primary` | `letter-spacing: -0.02em` |
| Card/section title | 11px | 400 | `--text-tertiary` | uppercase, `letter-spacing: 0.02em` |
| Body text | 13px | 400 | `--text-secondary` | — |
| Table header | 11px | 500 | `--text-tertiary` | uppercase, `letter-spacing: 0.05em` |
| Small/meta | 11px | 400 | `--text-tertiary` | — |

### Border Radius

| Element | Radius |
|---------|--------|
| Cards | 10px |
| Buttons | 8px |
| Nav items | 6px |
| Badges | 6px |
| Modals | 12px |

### Focus States

All interactive elements use `rgba(255,255,255,0.15)` as focus ring color instead of teal. Applied as `ring-2` on `focus-visible`.

### Selection Color

`::selection` changes from `rgba(20, 184, 166, 0.3)` (teal) to `rgba(255,255,255,0.2)` (monochrome).

## Layout

### Shell

- `dashboard/src/components/layout/shell.tsx`
- Background: `--bg` (`#0a0a0a`)
- Content area left margin: `220px` on `lg+` (unchanged)
- Content padding: `px-6 py-6 lg:px-8` (unchanged)

### Sidebar (220px)

- Background: `--bg` (same as page, separated by right border)
- Right border: `--border`
- Height: full viewport, fixed position
- Width: 220px (unchanged)

**Header area:**
- Logo: White `#fafafa` rounded square (radius 7px) with black "R" inside
- Brand text: "Raven" in `--text-primary` (13px, semibold), "AI Gateway" in `--text-tertiary` (10px)

**Navigation:**
- Groups separated by 20px spacing — no group labels (remove "Core", "Management", "System" headers)
- Items: 13px, medium weight
- Active: `--surface-active` background, `--text-primary` text, icon same color as text
- Inactive: `--text-tertiary` text, icon same color as text
- Hover: `--surface-hover` background
- Item padding: `7px 10px`
- Icon size: 15px, same color as adjacent text (no separate icon color)

**Footer:**
- Version badge: 10px mono text in `--text-tertiary`

**Mobile:**
- Hamburger button: `--bg` background, `--border` border
- Overlay: `rgba(0,0,0,0.6)` with `backdrop-blur-sm` (unchanged behavior)

### Header Bar

- Sticky, `--bg` with `backdrop-blur`
- Height: 56px (h-14)
- Left: Page title (16px semibold, `--text-primary`)
- Right: Gateway status indicator (dot + text) + settings icon
- Bottom border: `--border`
- Settings icon: `--text-tertiary`, hover `--text-secondary`
- No page subtitle/description in header

## Components

### Stat Card

Border-only container. No background fill. Uses flex layout with sparkline positioned top-right.

```
┌─────────────────────────────────┐
│ Total Requests          ╱╲╱╲╱  │  ← sparkline (faint, top-right via flex)
│ 12,847                          │  ← big number
│ +12.3%                          │  ← trend (neutral color)
└─────────────────────────────────┘
```

- Border: `--border`, radius 10px
- Padding: 16px
- Layout: flex row with `justify-between`. Left side has label/value/trend stacked. Right side has sparkline aligned top.
- Label: 11px, `--text-tertiary`
- Value: 24px, semibold, `--text-primary`
- Trend: 11px, `--text-secondary` (no green/red coloring)
- Sparkline: `rgba(255,255,255,0.15)` stroke, 1.5px width, 64x28px
- No icons in stat cards (remove `icon` prop usage)
- Remove the internal `border-top` divider from current design

### Card (Generic Container)

- Border: `--border`, radius 10px
- Background: transparent
- Padding: 20px
- Title: 11px, `--text-tertiary`, uppercase tracking

### Button

**Primary:** `--btn-primary-bg` background, `--btn-primary-text` text, no border. Hover: `#e5e5e5`. Focus: `ring-2 rgba(255,255,255,0.15)`.

**Secondary:** transparent bg, `--border` border, `--text-secondary` text. Hover: `--surface-hover` bg. Focus: same ring.

**Ghost:** transparent bg, no border, `--text-secondary` text. Hover: `--surface-hover` bg. Focus: same ring.

**Danger:** transparent bg, `rgba(239,68,68,0.1)` border, `#ef4444` text. Hover: `rgba(239,68,68,0.06)` bg. Focus: same ring. Note: intentionally lower visual weight than current solid red button — the monochrome design de-emphasizes destructive actions visually while keeping them identifiable.

**Outline:** Remove this variant. Current usages should map to `secondary` (which now has the same border treatment).

All buttons: radius 8px, 13px text, medium weight, padding `7px 14px`.

### Table

- No card wrapper — sits directly in the content area
- Header: 11px uppercase `--text-tertiary`, bottom border `--border`
- Rows: divider `--border-subtle`, hover `--surface-hover`
- Primary column data: `--text-primary`
- Secondary column data: `--text-secondary`
- Sortable headers: subtle icon, active sort column text is `--text-secondary`

### DataTable (Shared)

- Search input: follows Input spec
- Pagination: active page uses `--surface-active` bg, `--text-primary` text. Inactive pages: `--text-tertiary`. Prev/Next buttons: `secondary` button style.
- "Showing X to Y" text: `--text-tertiary`

### Badge

**Variants:**
- `default`: transparent bg, `--border` border, `--text-secondary` text
- `success`: transparent bg, `--border` border, `--text-secondary` text, green dot
- `warning`: transparent bg, `--border` border, `--text-secondary` text, amber dot
- `error`: transparent bg, `--border` border, `--text-secondary` text, red dot
- `info`: Remove. Replace usages with `default`.
- `outline`: Keep as alias for `default` (same styling).

No colored badge backgrounds. Status meaning conveyed only through the dot color.

### Charts (Bar/Area)

- Bars: `rgba(255,255,255,0.15)` fill, `rgba(255,255,255,0.25)` on hover
- Area stroke: `rgba(255,255,255,0.3)`, fill gradient from `rgba(255,255,255,0.06)` to transparent
- Grid: `rgba(255,255,255,0.04)`
- Axis labels: 11px, `--text-tertiary`
- Tooltip: `#141414` bg, `--border` border, `--text-primary` values, `--text-tertiary` labels, radius 8px

### Sparkline

- Stroke: `rgba(255,255,255,0.15)`, width 1.5px
- Default dimensions: width 64, height 28 (reduced from current 120x40 to fit top-right card position)
- Gradient fill: `rgba(255,255,255,0.03)` to transparent
- No color prop — always monochrome

### Dialog/Modal

- Backdrop: `rgba(0,0,0,0.7)` with `backdrop-blur-sm`
- Container: `--bg` background, `--border` border, radius 12px
- Header text: 16px semibold `--text-primary`
- Description: 13px `--text-secondary`
- Close button: `--text-tertiary`, hover `--text-secondary`

### Input

- Background: transparent
- Border: `--border`, radius 8px
- Text: `--text-primary`
- Placeholder: `--text-tertiary`
- Focus: border brightens to `rgba(255,255,255,0.15)`, `ring-2 rgba(255,255,255,0.15)`
- Error: border `rgba(239,68,68,0.5)`, ring `rgba(239,68,68,0.15)`
- Label: 11px `--text-tertiary`

### Select

- Same treatment as Input
- Chevron icon: `--text-tertiary`

### Tabs

- Pill-style tabs in a row
- Active: `--surface-active` bg, `--text-primary` text
- Inactive: transparent, `--text-tertiary` text
- Hover: `--surface-hover` bg
- No border on tab container

### Date Range Picker

- Pill buttons matching tab style
- Active: `--surface-active` bg, `--text-primary` text
- Inactive: transparent, `--text-tertiary` text
- Custom date inputs: follow Input spec
- "Apply" button: `primary` button style (white bg, not teal)

### Tooltip

- Background: `#141414`
- Border: `--border`, radius 8px
- Text: `--text-secondary`
- Shadow: `0 4px 12px rgba(0,0,0,0.4)`

### Dropdown Menu

- Container: `--bg` background, `--border` border, radius 10px
- Shadow: `0 8px 24px rgba(0,0,0,0.5)`
- Items: 13px, `--text-secondary`, padding `8px 12px`
- Item hover: `--surface-hover` bg, `--text-primary` text
- Separator: `--border-subtle`

### Separator

- Color: `--border-subtle`
- Default orientation: horizontal, 1px height

### Skeleton/Loading

- Base background: `rgba(255,255,255,0.04)`
- Shimmer highlight: `rgba(255,255,255,0.02)` sweep
- `SkeletonCard`: border-only container matching Card spec (`--border`, radius 10px, transparent bg) with skeleton lines inside

### Empty State

- Icon: `--text-tertiary`, no background box, no floating animation
- Title: 14px `--text-secondary`
- Description: 13px `--text-tertiary`

## Key Changes From Current Design

| Current | New |
|---------|-----|
| Background `#09090b` | `#0a0a0a` (no blue tint) |
| Teal accent (`#14b8a6`) everywhere | No accent colors — monochrome only |
| `bg-zinc-900/80` card fills | Transparent cards with border only |
| Teal gradient logo | White square with black "R" |
| Colored trend indicators (green up, red down) | Neutral `--text-secondary` for all trends |
| Icon badges on stat cards | No icons on stat cards |
| Colored sparklines per metric | Monochrome sparklines (`rgba(255,255,255,0.15)`) |
| Nav group labels ("Core", "Management") | Removed — spacing only |
| Teal active nav state | Subtle white/gray active state |
| `bg-zinc-800` icon boxes | Removed — no icon containers |
| Focus ring `teal-500/50` | Focus ring `rgba(255,255,255,0.15)` |
| `::selection` teal | `::selection` white/gray |
| Page subtitle in overview | Removed — title only |
| Button `outline` variant | Removed (merged into `secondary`) |
| Badge `info` variant (teal) | Removed (use `default`) |
| Solid red danger button | Subtle bordered danger button |

## Files to Modify

### Design tokens & globals
- `dashboard/src/app.css` — New color tokens, selection color, updated animations, scrollbar

### Layout
- `dashboard/src/components/layout/shell.tsx` — Background color update
- `dashboard/src/components/layout/sidebar.tsx` — Monochrome styling, remove group labels, new logo, mobile button
- `dashboard/src/components/layout/header.tsx` — Simplified, monochrome status indicator

### UI Components
- `dashboard/src/components/ui/button.tsx` — Monochrome variants, remove `outline`, focus ring
- `dashboard/src/components/ui/card.tsx` — Transparent bg, border only
- `dashboard/src/components/ui/input.tsx` — Monochrome border/focus
- `dashboard/src/components/ui/badge.tsx` — Remove `info`, monochrome with status dots
- `dashboard/src/components/ui/select.tsx` — Monochrome border/focus
- `dashboard/src/components/ui/dialog.tsx` — Monochrome styling
- `dashboard/src/components/ui/tabs.tsx` — Monochrome pill style
- `dashboard/src/components/ui/table.tsx` — Monochrome, updated sort styling
- `dashboard/src/components/ui/skeleton.tsx` — Monochrome shimmer, SkeletonCard border-only
- `dashboard/src/components/ui/separator.tsx` — Use `--border-subtle`
- `dashboard/src/components/ui/tooltip.tsx` — Monochrome dark styling
- `dashboard/src/components/ui/dropdown-menu.tsx` — Monochrome dark styling

### Shared Components
- `dashboard/src/components/shared/stat-card.tsx` — Remove icon, monochrome sparkline, new layout
- `dashboard/src/components/shared/date-range-picker.tsx` — Pill style, custom inputs, Apply button
- `dashboard/src/components/shared/data-table.tsx` — Monochrome pagination
- `dashboard/src/components/shared/empty-state.tsx` — Simplify, remove float animation

### Charts
- `dashboard/src/components/charts/bar-chart.tsx` — Monochrome bars and tooltip
- `dashboard/src/components/charts/area-chart.tsx` — Monochrome stroke/fill
- `dashboard/src/components/charts/sparkline.tsx` — Monochrome, reduced dimensions

### Pages (update inline teal/accent references)
- `dashboard/src/pages/overview.tsx`
- `dashboard/src/pages/analytics.tsx`
- `dashboard/src/pages/requests.tsx`
- `dashboard/src/pages/providers.tsx`
- `dashboard/src/pages/models.tsx`
- `dashboard/src/pages/keys.tsx`
- `dashboard/src/pages/teams.tsx`
- `dashboard/src/pages/budgets.tsx`
- `dashboard/src/pages/cache.tsx`
- `dashboard/src/pages/guardrails.tsx`
- `dashboard/src/pages/plugins.tsx`
- `dashboard/src/pages/settings.tsx`

## Scope

This is a visual-only redesign. No changes to:
- Routing structure
- API client / data fetching
- Business logic
- Component props/interfaces (where possible)
- Hook behavior
