# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the teal-accented dark theme with an ultra minimal monochrome aesthetic across the entire dashboard.

**Architecture:** Pure visual-only changes — swap Tailwind CSS classes and design tokens. No routing, API, or logic changes. Components keep their existing interfaces. All teal/accent colors become monochrome white/gray.

**Tech Stack:** React 19, Tailwind CSS 4, Recharts, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-11-dashboard-redesign-design.md`

---

## Chunk 1: Foundation & Shell

### Task 1: Design Tokens & Global Styles

**Files:**
- Modify: `dashboard/src/app.css`

- [ ] **Step 1: Update app.css with new monochrome theme**

Replace the entire contents of `dashboard/src/app.css` with:

```css
@import "tailwindcss";

@theme {
  --color-primary: #fafafa;
  --color-primary-hover: #e5e5e5;
  --color-primary-light: #a3a3a3;

  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    Roboto, "Helvetica Neue", Arial, sans-serif;
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
  background-color: #0a0a0a;
  color: #fafafa;
}

::selection {
  background-color: rgba(255, 255, 255, 0.2);
  color: #fff;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes fade-in {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes slide-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.animate-shimmer {
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.02) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: shimmer 2s ease-in-out infinite;
}
.animate-fade-in { animation: fade-in 200ms ease-out; }
.animate-slide-in { animation: slide-in 200ms ease-out; }
.animate-pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
```

Note: Removed `@keyframes float` and `.animate-float` (no longer used in empty states).

- [ ] **Step 2: Verify the build compiles**

Run: `cd dashboard && npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/app.css
git commit -m "style: replace teal theme tokens with monochrome palette"
```

### Task 2: Shell Background

**Files:**
- Modify: `dashboard/src/components/layout/shell.tsx`

- [ ] **Step 1: Update shell background color**

Change `bg-[#09090b]` to `bg-[#0a0a0a]` on line 11.

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/layout/shell.tsx
git commit -m "style: update shell background to pure dark"
```

---

## Chunk 2: UI Components

All 12 UI components can be updated independently. Each task specifies exact class replacements.

### Task 3: Button Component

**Files:**
- Modify: `dashboard/src/components/ui/button.tsx`

Note: `variant="outline"` is not used anywhere in the codebase (verified via grep), so removing it is safe.

- [ ] **Step 1: Update button variants, sizes, and focus ring**

Replace the full type, variantStyles, sizeStyles, and base class string:

```tsx
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
```

```tsx
const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[#fafafa] text-[#0a0a0a] hover:bg-[#e5e5e5] active:bg-[#d4d4d4]',
  secondary: 'bg-transparent text-[#a3a3a3] border border-white/[0.08] hover:bg-white/[0.04]',
  ghost: 'text-[#a3a3a3] hover:text-[#fafafa] hover:bg-white/[0.04]',
  danger: 'bg-transparent text-[#ef4444] border border-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.06)]',
}
```

```tsx
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-[14px] py-[7px] text-[13px]',
  lg: 'px-5 py-2.5 text-[13px]',
  icon: 'p-2',
}
```

Replace the base class string from:
`'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer'`
to:
`'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/15 disabled:opacity-40 disabled:pointer-events-none cursor-pointer'`

- [ ] **Step 2: Verify build**

Run: `cd dashboard && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/components/ui/button.tsx
git commit -m "style: monochrome button variants"
```

### Task 4: Card Component

**Files:**
- Modify: `dashboard/src/components/ui/card.tsx`

- [ ] **Step 1: Update card styles**

Card base: change `rounded-xl border border-zinc-800 bg-zinc-900/80 p-5` to `rounded-[10px] border border-white/[0.08] bg-transparent p-5`

CardTitle: change `text-[13px] font-semibold text-zinc-400 uppercase tracking-wide` to `text-[11px] font-normal text-[#525252] uppercase tracking-[0.02em]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/card.tsx
git commit -m "style: transparent bordered cards"
```

### Task 5: Badge Component

**Files:**
- Modify: `dashboard/src/components/ui/badge.tsx`

- [ ] **Step 1: Update badge variants**

Remove `info` from the type. Replace all variant styles with monochrome:

```tsx
type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'outline'

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-transparent text-[#a3a3a3] border border-white/[0.08]',
  success: 'bg-transparent text-[#a3a3a3] border border-white/[0.08]',
  warning: 'bg-transparent text-[#a3a3a3] border border-white/[0.08]',
  error: 'bg-transparent text-[#a3a3a3] border border-white/[0.08]',
  outline: 'bg-transparent text-[#a3a3a3] border border-white/[0.08]',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-[#525252]',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error: 'bg-red-400',
  outline: 'bg-[#525252]',
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/badge.tsx
git commit -m "style: monochrome badges with semantic dots"
```

### Task 6: Input Component

**Files:**
- Modify: `dashboard/src/components/ui/input.tsx`

- [ ] **Step 1: Update input styles**

Label: change `text-sm font-medium text-zinc-400` to `text-[11px] font-normal text-[#525252]`

Input: change `h-9 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/40 transition-colors duration-150` to `h-9 rounded-lg border border-white/[0.08] bg-transparent px-3 text-sm text-[#fafafa] placeholder:text-[#525252] focus:outline-none focus:ring-2 focus:ring-white/15 focus:border-white/15 transition-colors duration-150`

Error border: change `border-red-500/50 focus:ring-red-500/40` to `border-[rgba(239,68,68,0.5)] focus:ring-[rgba(239,68,68,0.15)]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/input.tsx
git commit -m "style: monochrome input fields"
```

### Task 7: Select Component

**Files:**
- Modify: `dashboard/src/components/ui/select.tsx`

- [ ] **Step 1: Update select styles**

Label: change `text-sm font-medium text-zinc-400` to `text-[11px] font-normal text-[#525252]`

Select: change `h-9 w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 pr-8 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/40 transition-colors duration-150` to `h-9 w-full appearance-none rounded-lg border border-white/[0.08] bg-transparent px-3 pr-8 text-sm text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-white/15 focus:border-white/15 transition-colors duration-150`

ChevronDown: change `text-zinc-600` to `text-[#525252]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/select.tsx
git commit -m "style: monochrome select dropdown"
```

### Task 8: Dialog Component

**Files:**
- Modify: `dashboard/src/components/ui/dialog.tsx`

- [ ] **Step 1: Update dialog styles**

Backdrop: `bg-black/70` stays.

Modal container: change `rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl` to `rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-6 shadow-2xl`

DialogTitle: change `text-lg font-semibold text-white` to `text-base font-semibold text-[#fafafa]`

DialogDescription: change `text-sm text-zinc-400 mt-1` to `text-[13px] text-[#a3a3a3] mt-1`

DialogClose button: change `text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800` to `text-[#525252] hover:text-[#a3a3a3] hover:bg-white/[0.04]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/dialog.tsx
git commit -m "style: monochrome dialog"
```

### Task 9: Tabs Component

**Files:**
- Modify: `dashboard/src/components/ui/tabs.tsx`

- [ ] **Step 1: Update tabs styles**

TabsList: change `inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/80 p-1` to `inline-flex items-center gap-1 rounded-lg p-1`

TabsTrigger active: change `bg-teal-500/15 text-teal-300` to `bg-white/[0.06] text-[#fafafa]`

TabsTrigger inactive: change `text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60` to `text-[#525252] hover:text-[#a3a3a3] hover:bg-white/[0.04]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/tabs.tsx
git commit -m "style: monochrome tabs"
```

### Task 10: Table Component

**Files:**
- Modify: `dashboard/src/components/ui/table.tsx`

- [ ] **Step 1: Update table styles**

TableHeader: change `border-b border-zinc-800` to `border-b border-white/[0.08]`

TableBody: change `divide-y divide-zinc-800/60` to `divide-y divide-white/[0.04]`

TableRow hover: change `hover:bg-zinc-800/40` to `hover:bg-white/[0.04]`

TableHead: change `text-[11px] font-semibold text-zinc-500 uppercase tracking-wider` to `text-[11px] font-medium text-[#525252] uppercase tracking-[0.05em]`

TableHead hover: change `hover:text-zinc-300` to `hover:text-[#a3a3a3]`

Sort icons — ChevronUp active: change `text-teal-400` to `text-[#a3a3a3]`, inactive: change `text-zinc-800` to `text-[#525252]/30`

ChevronDown active: change `text-teal-400` to `text-[#a3a3a3]`, inactive: change `text-zinc-800` to `text-[#525252]/30`

TableCell: change `text-sm text-zinc-300` to `text-sm text-[#a3a3a3]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/table.tsx
git commit -m "style: monochrome table"
```

### Task 11: Skeleton Component

**Files:**
- Modify: `dashboard/src/components/ui/skeleton.tsx`

- [ ] **Step 1: Update skeleton styles**

Skeleton base: change `bg-zinc-800/60` to `bg-white/[0.04]`

SkeletonCard: change `rounded-xl border border-zinc-800 bg-zinc-900/80 p-5` to `rounded-[10px] border border-white/[0.08] bg-transparent p-5`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/skeleton.tsx
git commit -m "style: monochrome skeleton loading"
```

### Task 12: Separator Component

**Files:**
- Modify: `dashboard/src/components/ui/separator.tsx`

- [ ] **Step 1: Update separator color**

Change `bg-zinc-800` to `bg-white/[0.04]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/separator.tsx
git commit -m "style: subtle separator"
```

### Task 13: Tooltip Component

**Files:**
- Modify: `dashboard/src/components/ui/tooltip.tsx`

- [ ] **Step 1: Update tooltip styles**

Change `rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200 shadow-xl` to `rounded-lg bg-[#141414] border border-white/[0.08] px-2.5 py-1.5 text-xs text-[#a3a3a3] shadow-[0_4px_12px_rgba(0,0,0,0.4)]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/tooltip.tsx
git commit -m "style: monochrome tooltip"
```

### Task 14: Dropdown Menu Component

**Files:**
- Modify: `dashboard/src/components/ui/dropdown-menu.tsx`

- [ ] **Step 1: Update dropdown menu styles**

Container: change `rounded-xl border border-zinc-800 bg-zinc-900 py-1 shadow-2xl shadow-black/40` to `rounded-[10px] border border-white/[0.08] bg-[#0a0a0a] py-1 shadow-[0_8px_24px_rgba(0,0,0,0.5)]`

DropdownItem normal: change `text-zinc-300 hover:bg-zinc-800 hover:text-white` to `text-[#a3a3a3] hover:bg-white/[0.04] hover:text-[#fafafa]`

DropdownItem danger: change `text-red-400 hover:bg-red-500/10` stays the same (semantic color).

DropdownSeparator: change `border-t border-zinc-800` to `border-t border-white/[0.04]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/dropdown-menu.tsx
git commit -m "style: monochrome dropdown menu"
```

---

## Chunk 3: Charts

### Task 15: Sparkline Component

**Files:**
- Modify: `dashboard/src/components/charts/sparkline.tsx`

- [ ] **Step 1: Update sparkline to monochrome with smaller defaults**

Replace the entire component:

```tsx
import type { TimeseriesPoint } from '@/lib/types'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'

interface SparklineProps {
  data: TimeseriesPoint[]
  height?: number
  width?: number
}

export function Sparkline({ data, height = 28, width = 64 }: SparklineProps) {
  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id="sparkGradMono" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="rgba(255,255,255,0.03)" stopOpacity={1} />
            <stop offset="95%" stopColor="rgba(255,255,255,0)" stopOpacity={1} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1.5}
          fill="url(#sparkGradMono)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/charts/sparkline.tsx
git commit -m "style: monochrome sparkline with smaller dimensions"
```

### Task 16: Bar Chart Component

**Files:**
- Modify: `dashboard/src/components/charts/bar-chart.tsx`

- [ ] **Step 1: Update bar chart to monochrome**

In both horizontal and vertical layouts, apply these changes:

- `CartesianGrid stroke`: keep `rgba(255,255,255,0.04)`
- `XAxis` and `YAxis` tick fill: change `#71717a` to `#525252`
- `XAxis` and `YAxis` stroke: change `rgba(255,255,255,0.1)` to `rgba(255,255,255,0.04)`
- Tooltip contentStyle: change `backgroundColor: '#18181b'` to `'#141414'`, `border: '1px solid #27272a'` to `'1px solid rgba(255,255,255,0.08)'`, `color: '#e4e4e7'` to `'#fafafa'`, `borderRadius: '10px'` to `'8px'`
- Default `color` prop: change `'#14b8a6'` to `'rgba(255,255,255,0.15)'`
- `Bar fillOpacity`: change `0.85` to `1`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/charts/bar-chart.tsx
git commit -m "style: monochrome bar chart"
```

### Task 17: Area Chart Component

**Files:**
- Modify: `dashboard/src/components/charts/area-chart.tsx`

- [ ] **Step 1: Update area chart to monochrome**

- Default `color` prop: change `'#14b8a6'` to `'rgba(255,255,255,0.3)'`
- Gradient stops: change `stopOpacity={0.2}` to `stopOpacity={0.06}`, keep bottom at `0`
- `CartesianGrid stroke`: keep `rgba(255,255,255,0.04)`
- `XAxis` and `YAxis` tick fill: change `#71717a` to `#525252`
- `XAxis` and `YAxis` stroke: change `rgba(255,255,255,0.1)` to `rgba(255,255,255,0.04)`
- Tooltip contentStyle: same changes as bar chart — `backgroundColor: '#141414'`, `border: '1px solid rgba(255,255,255,0.08)'`, `color: '#fafafa'`, `borderRadius: '8px'`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/charts/area-chart.tsx
git commit -m "style: monochrome area chart"
```

---

## Chunk 4: Shared Components

### Task 18: Stat Card Component

**Files:**
- Modify: `dashboard/src/components/shared/stat-card.tsx`

- [ ] **Step 1: Redesign stat card layout**

Replace the entire component. Remove icon prop usage, reposition sparkline to top-right, make trend neutral color, remove border-top divider:

```tsx
import { Sparkline } from '@/components/charts/sparkline'
import type { TimeseriesPoint } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  trend?: number
  trendLabel?: string
  icon?: React.ReactNode
  sparklineData?: TimeseriesPoint[]
  sparklineColor?: string
  className?: string
}

export function StatCard({
  label,
  value,
  trend,
  trendLabel,
  sparklineData,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'relative flex justify-between rounded-[10px] border border-white/[0.08] p-4',
        className,
      )}
    >
      <div className="flex flex-col min-w-0">
        <p className="text-[11px] text-[#525252] uppercase tracking-[0.02em]">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold text-[#fafafa] tracking-tight">{value}</p>
        {trend !== undefined && (
          <p className="mt-1.5 text-[11px] text-[#a3a3a3]">
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            {trendLabel && <span className="text-[#525252] ml-1">{trendLabel}</span>}
          </p>
        )}
      </div>
      {sparklineData && sparklineData.length > 0 && (
        <div className="shrink-0 mt-1">
          <Sparkline data={sparklineData} />
        </div>
      )}
    </div>
  )
}
```

Note: `icon` and `sparklineColor` props are kept in the interface for backward compat but ignored in render.

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/shared/stat-card.tsx
git commit -m "style: minimal stat card with monochrome sparkline"
```

### Task 19: Date Range Picker Component

**Files:**
- Modify: `dashboard/src/components/shared/date-range-picker.tsx`

- [ ] **Step 1: Update date range picker to monochrome**

Remove the Calendar icon import if desired, or change its color.

Pill container: change `rounded-lg border border-zinc-800 bg-zinc-900/80 p-0.5` to `rounded-lg p-0.5`

Active pill: change `bg-teal-500/15 text-teal-300` to `bg-white/[0.06] text-[#fafafa]`

Inactive pill: change `text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60` to `text-[#525252] hover:text-[#a3a3a3] hover:bg-white/[0.04]`

Calendar icon: change `text-zinc-600` to `text-[#525252]`

Custom date inputs: change `border border-zinc-800 bg-zinc-900 ... focus:ring-teal-500/40` to `border border-white/[0.08] bg-transparent ... focus:ring-white/15`

"to" span: change `text-zinc-600` to `text-[#525252]`

Apply button: change `bg-teal-600 text-white hover:bg-teal-500` to `bg-[#fafafa] text-[#0a0a0a] hover:bg-[#e5e5e5]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/shared/date-range-picker.tsx
git commit -m "style: monochrome date range picker"
```

### Task 20: Data Table Component

**Files:**
- Modify: `dashboard/src/components/shared/data-table.tsx`

- [ ] **Step 1: Update pagination styling**

Search icon: change `text-zinc-600` to `text-[#525252]`

Pagination text: change `text-xs text-zinc-600` to `text-xs text-[#525252]`

Active page button: change `bg-teal-500/10 text-teal-300` to `bg-white/[0.06] text-[#fafafa]`

Inactive page button: change `text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300` to `text-[#525252] hover:bg-white/[0.04] hover:text-[#a3a3a3]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/shared/data-table.tsx
git commit -m "style: monochrome data table pagination"
```

### Task 21: Empty State Component

**Files:**
- Modify: `dashboard/src/components/shared/empty-state.tsx`

- [ ] **Step 1: Update empty state to minimal**

Icon container: change `rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-4 mb-4 animate-float` to `p-4 mb-4`

Title: change `text-sm font-semibold text-zinc-300` to `text-sm font-medium text-[#a3a3a3]`

Description: change `text-[13px] text-zinc-500` to `text-[13px] text-[#525252]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/shared/empty-state.tsx
git commit -m "style: minimal empty state"
```

---

## Chunk 5: Layout Components

### Task 22: Sidebar Component

**Files:**
- Modify: `dashboard/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Update sidebar to monochrome**

Mobile hamburger button: change `bg-zinc-900 border border-zinc-800` to `bg-[#0a0a0a] border border-white/[0.08]`

Aside: change `border-r border-zinc-800/80 bg-zinc-950` to `border-r border-white/[0.08] bg-[#0a0a0a]`

Logo header border: change `border-b border-zinc-800/80` to `border-b border-white/[0.08]`

Logo badge: change `bg-gradient-to-br from-teal-500 to-teal-600` to `bg-[#fafafa]`. Change the "R" text: `text-white` to `text-[#0a0a0a]`

Brand subtitle: `text-zinc-600` to `text-[#525252]`

Remove group labels (`<p>` with "Core", "Management", "System"). Keep the `mb-5` spacing on the group `div`.

Nav item border-radius: change `rounded-lg` to `rounded-md` (6px per spec)

Active nav item: change `bg-teal-500/10 text-teal-300` to `bg-white/[0.06] text-[#fafafa]`

Inactive nav item: change `text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50` to `text-[#525252] hover:text-[#a3a3a3] hover:bg-white/[0.04]`

Active icon: change `text-teal-400` to `text-[#fafafa]`

Inactive icon: change `text-zinc-600` to `text-[#525252]`

Footer border: change `border-t border-zinc-800/80` to `border-t border-white/[0.08]`

Footer text: change `text-zinc-700` to `text-[#525252]`

Version badge: change `bg-zinc-800/60` to `bg-white/[0.04]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/layout/sidebar.tsx
git commit -m "style: monochrome sidebar with group label removal"
```

### Task 23: Header Component

**Files:**
- Modify: `dashboard/src/components/layout/header.tsx`

- [ ] **Step 1: Update header to monochrome**

Header: change `border-b border-zinc-800/80 bg-[#09090b]/90` to `border-b border-white/[0.08] bg-[#0a0a0a]/90`

Title: change `text-sm font-semibold text-white` to `text-base font-semibold text-[#fafafa]`

Status container: change `border border-zinc-800 bg-zinc-900/80` to `border border-white/[0.08] bg-transparent`

Status text: change `text-[11px] text-zinc-500` to `text-[11px] text-[#525252]`

Settings link: change `text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50` to `text-[#525252] hover:text-[#a3a3a3] hover:bg-white/[0.04]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/layout/header.tsx
git commit -m "style: monochrome header"
```

---

## Chunk 6: Pages

### Task 24: Overview Page

**Files:**
- Modify: `dashboard/src/pages/overview.tsx`

- [ ] **Step 1: Update overview page**

Page title: change `text-xl font-bold text-white` to `text-base font-semibold text-[#fafafa]`.

Remove the subtitle: delete `<p className="text-[13px] text-zinc-500 mt-0.5">Gateway performance at a glance</p>`

Remove `icon` and `sparklineColor` props from all 4 StatCard usages. Remove unused icon imports (`Activity`, `DollarSign`, `Zap`, `Timer`) from lucide-react — keep `Server`.

Provider health list items: change `hover:bg-zinc-800/40` to `hover:bg-white/[0.04]`

Provider icon container: change `rounded-md bg-zinc-800 p-1.5` to `p-1.5`, icon `text-zinc-500` to `text-[#525252]`

Provider name: `text-zinc-200` → `text-[#fafafa]`, model count: `text-zinc-600` → `text-[#525252]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/pages/overview.tsx
git commit -m "style: monochrome overview page"
```

### Task 25: Analytics Page

**Files:**
- Modify: `dashboard/src/pages/analytics.tsx`

- [ ] **Step 1: Update analytics page**

Page title: change `text-2xl font-bold text-white` to `text-base font-semibold text-[#fafafa]`.

Remove subtitle: delete `<p className="text-sm text-zinc-500 mt-1">Cost and usage analytics</p>`

Remove `icon` props from all 4 StatCard usages. Remove unused icon imports (`DollarSign`, `TrendingUp`, `Zap`, `Activity`).

AreaChart color: change `color="#f59e0b"` to remove the prop (default is now monochrome).

BarChart colors: change `color="#14b8a6"` and `color="#2dd4bf"` to remove the props.

EmptyState icons: change `text-zinc-600` to `text-[#525252]` on all icon props.

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/pages/analytics.tsx
git commit -m "style: monochrome analytics page"
```

### Task 26: Requests Page

**Files:**
- Modify: `dashboard/src/pages/requests.tsx`

- [ ] **Step 1: Update requests page**

Page title: change `text-2xl font-bold text-white` to `text-base font-semibold text-[#fafafa]`.

Remove subtitle: delete `<p className="text-sm text-zinc-500 mt-1">Browse and filter request logs</p>`

Error pre block: change `bg-zinc-900 border border-zinc-800` to `bg-transparent border border-white/[0.08]`

Do a find-and-replace across the entire file for inline zinc colors:
- `text-zinc-500` → `text-[#525252]` (all occurrences)
- `text-zinc-200` → `text-[#fafafa]` (all occurrences)
- `text-zinc-300` → `text-[#a3a3a3]` (all occurrences)
- `text-zinc-400` → `text-[#a3a3a3]` (all occurrences)

Also in the detail dialog: `bg-zinc-900 border border-zinc-800` → `bg-transparent border border-white/[0.08]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/pages/requests.tsx
git commit -m "style: monochrome requests page"
```

### Task 27: Providers Page

**Files:**
- Modify: `dashboard/src/pages/providers.tsx`

- [ ] **Step 1: Update providers page**

Page title: change `text-2xl font-bold text-white` to `text-base font-semibold text-[#fafafa]`.

Remove subtitle: delete `<p className="text-sm text-zinc-500 mt-1">Configure your AI provider API keys below. Keys are stored securely in the gateway database.</p>`

Provider card icon container: change `rounded-lg bg-zinc-800/60 p-2.5` to `p-2.5`, icon `text-zinc-500` to `text-[#525252]`

Do a find-and-replace across the entire file:
- `text-zinc-100` → `text-[#fafafa]`
- `text-zinc-200` → `text-[#fafafa]`
- `text-zinc-300` → `text-[#a3a3a3]`
- `text-zinc-400` → `text-[#a3a3a3]`
- `text-zinc-500` → `text-[#525252]`
- `text-zinc-600` → `text-[#525252]`
- `text-zinc-700` → `text-[#525252]`
- `bg-zinc-900` → `bg-transparent` (but NOT `bg-zinc-900/80`)
- `border-zinc-800` → `border-white/[0.08]`
- `border border-zinc-800` → `border border-white/[0.08]`
- `border-t border-zinc-800` → `border-t border-white/[0.08]`
- `focus:ring-teal-500/40` → `focus:ring-white/15`
- `focus:border-teal-500/40` → `focus:border-white/15`
- `bg-teal-500` (enabled toggle) → `bg-[#fafafa]`
- `hover:text-zinc-300` → `hover:text-[#a3a3a3]`
- `hover:bg-zinc-800` → `hover:bg-white/[0.04]`

Label styling in dialog: change `text-sm font-medium text-zinc-400` to `text-[11px] font-normal text-[#525252]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/pages/providers.tsx
git commit -m "style: monochrome providers page"
```

### Task 28: Models Page

**Files:**
- Modify: `dashboard/src/pages/models.tsx`

- [ ] **Step 1: Update models page**

Page title: change `text-2xl font-bold text-white` to `text-base font-semibold text-[#fafafa]`.

Remove subtitle: delete `<p className="text-sm text-zinc-500 mt-1">Available models and pricing</p>`

Badge `variant="info"` for provider → change to `variant="default"`.

Find-and-replace: `text-zinc-100` → `text-[#fafafa]`, `text-zinc-600` → `text-[#525252]`, `text-zinc-300` → `text-[#a3a3a3]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/pages/models.tsx
git commit -m "style: monochrome models page"
```

### Task 29: Keys Page

**Files:**
- Modify: `dashboard/src/pages/keys.tsx`

- [ ] **Step 1: Update keys page**

Page title: change `text-2xl font-bold text-white` to `text-base font-semibold text-[#fafafa]`.

Remove subtitle: delete `<p className="text-sm text-zinc-500 mt-1">Manage API keys for accessing the gateway</p>`

Key prefix code: change `bg-zinc-800/60 border border-zinc-700/60 ... text-zinc-400` to `bg-transparent border border-white/[0.08] ... text-[#a3a3a3]`

Actions button: change `hover:bg-zinc-800/60` to `hover:bg-white/[0.04]`

Created key code: change `bg-zinc-900 border border-zinc-800 ... text-zinc-200` to `bg-transparent border border-white/[0.08] ... text-[#fafafa]`

Find-and-replace: `text-zinc-100` → `text-[#fafafa]`, `text-zinc-500` → `text-[#525252]`, `text-zinc-300` → `text-[#a3a3a3]`, `text-zinc-600` → `text-[#525252]`, `text-zinc-400` → `text-[#a3a3a3]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/pages/keys.tsx
git commit -m "style: monochrome keys page"
```

### Task 30: Teams Page

**Files:**
- Modify: `dashboard/src/pages/teams.tsx`

- [ ] **Step 1: Update teams page**

Page title: change `text-2xl font-bold text-white` to `text-base font-semibold text-[#fafafa]`.

Remove subtitle: delete `<p className="text-sm text-zinc-500 mt-1">Manage organizations, teams, and users</p>`

Badge `variant="info"` for admin role → change to `variant="default"`.

Find-and-replace: `text-zinc-100` → `text-[#fafafa]`, `text-zinc-500` → `text-[#525252]`, `text-zinc-300` → `text-[#a3a3a3]`, `text-zinc-400` → `text-[#a3a3a3]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/pages/teams.tsx
git commit -m "style: monochrome teams page"
```

### Task 31: Budgets Page

**Files:**
- Modify: `dashboard/src/pages/budgets.tsx`

- [ ] **Step 1: Update budgets page**

Page title: change `text-2xl font-bold text-white` to `text-base font-semibold text-[#fafafa]`.

Remove subtitle: delete `<p className="text-sm text-zinc-500 mt-1">Configure spending limits per organization, team, or key</p>`

Badge `variant="info"` for org type → change to `variant="default"`.

Progress bar track: change `bg-zinc-800/60` to `bg-white/[0.04]`

Progress bar fill: change `bg-teal-400` (low usage) to `bg-[#fafafa]/30`. Keep `bg-red-400` and `bg-amber-400` for high usage (semantic colors).

Find-and-replace: `text-zinc-200` → `text-[#fafafa]`, `text-zinc-300` → `text-[#a3a3a3]`, `text-zinc-500` → `text-[#525252]`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/pages/budgets.tsx
git commit -m "style: monochrome budgets page"
```

### Task 32: Cache Page

**Files:**
- Modify: `dashboard/src/pages/cache.tsx`

- [ ] **Step 1: Update cache page**

Page title: change `text-2xl font-bold text-white` to `text-base font-semibold text-[#fafafa]`.

Remove subtitle: delete `<p className="text-sm text-zinc-500 mt-1">Semantic cache performance metrics</p>`

Remove `icon` props from all 4 StatCard usages. Remove unused icon imports (`Zap`, `TrendingUp`, `HardDrive`, `Database`).

AreaChart: change `color="#22c55e"` to remove the prop.

EmptyState icon: change `text-zinc-600` to `text-[#525252]`.

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/pages/cache.tsx
git commit -m "style: monochrome cache page"
```

### Task 33: Simple Pages (Guardrails, Plugins, Settings)

**Files:**
- Modify: `dashboard/src/pages/guardrails.tsx`
- Modify: `dashboard/src/pages/plugins.tsx`
- Modify: `dashboard/src/pages/settings.tsx`

- [ ] **Step 1: Update guardrails page**

Page title: `text-2xl font-bold text-white` → `text-base font-semibold text-[#fafafa]`.

Remove subtitle: delete `<p className="text-sm text-zinc-500 mt-1">Configure content filtering and safety guardrails</p>`

EmptyState icon: change `text-zinc-600` to `text-[#525252]`.

- [ ] **Step 2: Update plugins page**

Page title: `text-2xl font-bold text-white` → `text-base font-semibold text-[#fafafa]`.

Remove subtitle: delete `<p className="text-sm text-zinc-500 mt-1">Manage gateway plugins and extensions</p>`

EmptyState icon: change `text-zinc-600` to `text-[#525252]`.

- [ ] **Step 3: Update settings page**

Page title: `text-2xl font-bold text-white` → `text-base font-semibold text-[#fafafa]`.

Remove subtitle: delete `<p className="text-sm text-zinc-500 mt-1">Gateway configuration and status</p>` (and the loading state subtitle `<p className="text-sm text-zinc-500 mt-1">Gateway configuration</p>`).

Badge `variant="info"` for providers → change to `variant="default"`.

SettingRow: change `text-zinc-500` to `text-[#525252]`, `text-zinc-200` to `text-[#fafafa]`.

Also update `text-zinc-600` → `text-[#525252]` on the "None" fallback span.

- [ ] **Step 4: Commit**

```bash
git add dashboard/src/pages/guardrails.tsx dashboard/src/pages/plugins.tsx dashboard/src/pages/settings.tsx
git commit -m "style: monochrome guardrails, plugins, settings pages"
```

---

## Chunk 7: Verification

### Task 34: Build & Visual Verification

- [ ] **Step 1: Full build check**

Run: `cd dashboard && npx vite build 2>&1 | tail -10`
Expected: Build succeeds with no errors

- [ ] **Step 2: Grep for leftover teal references**

Run: `grep -r "teal" dashboard/src/ --include="*.tsx" --include="*.css" -l`
Expected: No files found (all teal references removed)

- [ ] **Step 3: Grep for leftover zinc-900/zinc-800 background fills**

Run: `grep -rn "bg-zinc-900" dashboard/src/ --include="*.tsx" -l`
Expected: No files found (all replaced with transparent or #0a0a0a)

- [ ] **Step 4: Grep for leftover variant="info" badge usage**

Run: `grep -rn 'variant="info"' dashboard/src/ --include="*.tsx"`
Expected: No matches

- [ ] **Step 5: Commit any remaining fixes and final verification commit**

```bash
git add -A dashboard/src/
git commit -m "style: complete dashboard redesign to ultra minimal monochrome"
```
