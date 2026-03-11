# Precision Engineering Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete visual overhaul of Raven AI Gateway dashboard to a precision engineering aesthetic — monochrome, information-dense, zero animation, keyboard-first.

**Architecture:** Every UI file is rewritten from scratch. The data layer (hooks, API client, types) is unchanged. New additions: command palette component, toggle switch component, error banner component. Header component deleted; its functionality moves to sidebar footer and page-level title rows.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Recharts, Lucide React, React Router DOM 7

**Spec:** `docs/superpowers/specs/2026-03-11-precision-dashboard-design.md`

---

## Chunk 1: Foundation (CSS + Utils)

### Task 1: Rewrite app.css with new design tokens

**Files:**
- Rewrite: `dashboard/src/app.css`

- [ ] **Step 1: Replace entire app.css**

```css
@import "tailwindcss";

@theme {
  --color-bg: #09090b;
  --color-surface: rgba(255, 255, 255, 0.02);
  --color-surface-hover: rgba(255, 255, 255, 0.05);
  --color-surface-active: rgba(255, 255, 255, 0.08);

  --color-border: rgba(255, 255, 255, 0.06);
  --color-border-hover: rgba(255, 255, 255, 0.10);

  --color-text-primary: #fafafa;
  --color-text-secondary: #a3a3a3;
  --color-text-tertiary: #525252;
  --color-text-muted: #333333;

  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  --color-focus: rgba(255, 255, 255, 0.20);

  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    Roboto, "Helvetica Neue", Arial, sans-serif;
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
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.06) transparent;
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

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
```

Remove ALL other keyframes (shimmer, fade-in, slide-in, pulse-dot) and their utility classes.

- [ ] **Step 2: Verify build**

Run: `cd dashboard && npx vite build 2>&1 | tail -5`
Expected: Build succeeds. Some pages may have Tailwind warnings for removed classes — that's fine, they'll be fixed in later tasks.

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/app.css
git commit -m "style: rewrite app.css with precision design tokens"
```

---

### Task 2: Add formatBytes to shared utils

**Files:**
- Modify: `dashboard/src/lib/utils.ts`

- [ ] **Step 1: Add formatBytes function to utils.ts**

Add after the existing `formatPercent` function:

```typescript
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/lib/utils.ts
git commit -m "feat: move formatBytes utility to shared utils"
```

---

## Chunk 2: UI Components (all 12 + 3 new)

All UI components are rewritten from scratch. Each component is self-contained — no cross-dependencies except `cn()` from utils.

### Task 3: Rewrite button.tsx

**Files:**
- Rewrite: `dashboard/src/components/ui/button.tsx`

- [ ] **Step 1: Rewrite button component**

Spec reference: Section 8.3. Key changes:
- Default height 28px (from 36px), padding `4px 10px`
- Small: 24px height, `3px 8px` padding, 10px font
- No transitions on any state
- All 4 variants: primary, secondary, ghost, danger
- Disabled: 0.4 opacity

```typescript
import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'icon'
  children: ReactNode
}

const variants = {
  primary: 'bg-[#fafafa] text-[#09090b] hover:bg-[#e5e5e5]',
  secondary: 'bg-transparent text-[#a3a3a3] border border-white/[0.06] hover:bg-white/[0.05]',
  ghost: 'bg-transparent text-[#a3a3a3] hover:bg-white/[0.05]',
  danger: 'bg-transparent text-[#ef4444] border border-red-500/20 hover:bg-red-500/[0.08]',
}

const sizes = {
  sm: 'h-6 px-2 text-[10px]',
  md: 'h-7 px-2.5 text-xs',
  icon: 'h-7 w-7 p-0 justify-center',
}

export function Button({ variant = 'secondary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-medium',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090b]',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/button.tsx
git commit -m "style: rewrite button with precision design"
```

### Task 4: Rewrite card.tsx

**Files:**
- Rewrite: `dashboard/src/components/ui/card.tsx`

- [ ] **Step 1: Rewrite card component**

Spec reference: Section 8.2. Key changes:
- 8px radius (from 10px), surface background, 16px padding
- Section label style for CardTitle (9px uppercase muted)

```typescript
import { cn } from '@/lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-lg border border-white/[0.06] bg-white/[0.02] p-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('mb-3 flex items-center justify-between', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: CardProps) {
  return (
    <h3
      className={cn('text-[9px] font-medium text-[#333] uppercase tracking-[1px]', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardContent({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/card.tsx
git commit -m "style: rewrite card with precision design"
```

### Task 5: Rewrite badge.tsx

**Files:**
- Rewrite: `dashboard/src/components/ui/badge.tsx`

- [ ] **Step 1: Rewrite badge component**

Spec reference: Section 8.4. Key changes:
- No dot variant — removed entirely
- 4px radius, `1px 6px` padding, 10px text
- Status variants change border color and text only

```typescript
import { cn } from '@/lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error'
  children: ReactNode
}

const variants = {
  default: 'border-white/[0.06] text-[#525252]',
  success: 'border-green-500/25 text-[#22c55e]',
  warning: 'border-amber-500/25 text-[#f59e0b]',
  error: 'border-red-500/25 text-[#ef4444]',
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[4px] border px-1.5 py-px text-[10px] font-medium tracking-[0.3px]',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/badge.tsx
git commit -m "style: rewrite badge with precision design"
```

### Task 6: Rewrite input.tsx

**Files:**
- Rewrite: `dashboard/src/components/ui/input.tsx`

- [ ] **Step 1: Rewrite input component**

Spec reference: Section 8.5. Key changes:
- 32px height, 6px radius, transparent bg
- No transitions
- Label: 11px tertiary

```typescript
import { cn } from '@/lib/utils'
import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-[11px] text-[#525252] mb-1">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'h-8 w-full rounded-md border bg-transparent px-2.5 text-[13px] text-[#fafafa] placeholder:text-[#333]',
            'focus:outline-none focus:border-white/[0.15] focus:ring-1 focus:ring-white/[0.10]',
            error ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : 'border-white/[0.06]',
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-[11px] text-[#ef4444]">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/input.tsx
git commit -m "style: rewrite input with precision design"
```

### Task 7: Rewrite select.tsx

**Files:**
- Rewrite: `dashboard/src/components/ui/select.tsx`

- [ ] **Step 1: Rewrite select component**

Spec reference: Section 8.6. Same dimensions as Input.

```typescript
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { forwardRef, type SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, className, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-[11px] text-[#525252] mb-1">{label}</label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'h-8 w-full appearance-none rounded-md border border-white/[0.06] bg-transparent px-2.5 pr-7 text-[13px] text-[#fafafa]',
              'focus:outline-none focus:border-white/[0.15] focus:ring-1 focus:ring-white/[0.10]',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" className="bg-[#111] text-[#333]">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#111] text-[#fafafa]">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#333]" />
        </div>
      </div>
    )
  },
)

Select.displayName = 'Select'
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/select.tsx
git commit -m "style: rewrite select with precision design"
```

### Task 8: Rewrite dialog.tsx

**Files:**
- Rewrite: `dashboard/src/components/ui/dialog.tsx`

- [ ] **Step 1: Rewrite dialog component**

Spec reference: Section 8.9. Key changes:
- #111111 background, 8px radius, no blur on backdrop
- No enter/exit animation
- Escape closes

```typescript
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'

interface DialogProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

export function Dialog({ open, onClose, children, className }: DialogProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-full max-w-[480px] rounded-lg border border-white/[0.08] bg-[#111] p-5',
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-[#333] hover:text-[#a3a3a3]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mb-4', className)}>{children}</div>
}

export function DialogTitle({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <h2 className={cn('text-[13px] font-semibold text-[#fafafa]', className)}>{children}</h2>
  )
}

export function DialogDescription({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p className={cn('mt-1 text-xs text-[#525252]', className)}>{children}</p>
  )
}

export function DialogClose({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-[#a3a3a3] hover:text-[#fafafa]">
      {children}
    </button>
  )
}

export function DialogFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn('mt-4 flex justify-end gap-2 border-t border-white/[0.06] pt-3', className)}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/dialog.tsx
git commit -m "style: rewrite dialog with precision design"
```

### Task 9: Rewrite tabs.tsx

**Files:**
- Rewrite: `dashboard/src/components/ui/tabs.tsx`

- [ ] **Step 1: Rewrite tabs component**

Spec reference: Section 8.10. Key changes:
- Surface bg + border container, 6px radius
- No fade transition on content switch
- 11px text, 500 weight

```typescript
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function TabsList({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'inline-flex rounded-md border border-white/[0.06] bg-white/[0.02] p-0.5',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  activeValue: string
  onSelect: (value: string) => void
  children: ReactNode
  className?: string
}

export function TabsTrigger({ value, activeValue, onSelect, children, className }: TabsTriggerProps) {
  const isActive = value === activeValue
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'px-3 py-1 text-[11px] font-medium rounded-[5px]',
        isActive ? 'bg-white/[0.08] text-[#fafafa]' : 'text-[#525252] hover:text-[#a3a3a3]',
        className,
      )}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  activeValue: string
  children: ReactNode
  className?: string
}

export function TabsContent({ value, activeValue, children, className }: TabsContentProps) {
  if (value !== activeValue) return null
  return <div className={cn('mt-3', className)}>{children}</div>
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/tabs.tsx
git commit -m "style: rewrite tabs with precision design"
```

### Task 10: Rewrite table.tsx

**Files:**
- Rewrite: `dashboard/src/components/ui/table.tsx`

- [ ] **Step 1: Rewrite table component**

Spec reference: Section 8.7. Key changes:
- 32px header height, 36px row height
- 10px uppercase muted headers
- No alternating rows, just bottom borders
- Monospace for number cells

```typescript
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { HTMLAttributes, ReactNode, ThHTMLAttributes } from 'react'

export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('', className)} {...props}>
      {children}
    </thead>
  )
}

export function TableBody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('', className)} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('h-9 border-b border-white/[0.04] hover:bg-white/[0.02]', className)}
      {...props}
    >
      {children}
    </tr>
  )
}

interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortKey?: string
  currentSort?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (key: string) => void
  children: ReactNode
}

export function TableHead({ sortKey, currentSort, sortOrder, onSort, className, children, ...props }: TableHeadProps) {
  const isSorted = sortKey && currentSort === sortKey
  return (
    <th
      className={cn(
        'h-8 px-3 text-left text-[10px] font-medium uppercase tracking-[0.5px] text-[#333]',
        'border-b border-white/[0.06]',
        sortKey && 'cursor-pointer select-none',
        className,
      )}
      onClick={() => sortKey && onSort?.(sortKey)}
      {...props}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortKey && (
          <span className="inline-flex flex-col">
            <ChevronUp className={cn('h-2 w-2', isSorted && sortOrder === 'asc' ? 'text-[#fafafa]' : 'text-[#333]')} />
            <ChevronDown className={cn('h-2 w-2 -mt-0.5', isSorted && sortOrder === 'desc' ? 'text-[#fafafa]' : 'text-[#333]')} />
          </span>
        )}
      </div>
    </th>
  )
}

export function TableCell({ className, children, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-3 text-xs text-[#a3a3a3]', className)} {...props}>
      {children}
    </td>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/table.tsx
git commit -m "style: rewrite table with precision design"
```

### Task 11: Rewrite skeleton.tsx

**Files:**
- Rewrite: `dashboard/src/components/ui/skeleton.tsx`

- [ ] **Step 1: Rewrite skeleton component**

Spec reference: Section 8.13. Key changes:
- No shimmer animation — solid blocks only
- Static `rgba(255,255,255,0.04)` fill

```typescript
import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('rounded-md bg-white/[0.04]', className)} />
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-6 w-32 mb-2" />
      <Skeleton className="h-4 w-16" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-0">
      <div className="flex gap-4 h-8 items-center border-b border-white/[0.06] px-3">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-2.5 w-12" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 h-9 items-center border-b border-white/[0.04] px-3">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-2.5 w-28" />
          <Skeleton className="h-2.5 w-14" />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ui/skeleton.tsx
git commit -m "style: rewrite skeleton with static blocks"
```

### Task 12: Rewrite tooltip.tsx, separator.tsx, dropdown-menu.tsx

**Files:**
- Rewrite: `dashboard/src/components/ui/tooltip.tsx`
- Rewrite: `dashboard/src/components/ui/separator.tsx`
- Rewrite: `dashboard/src/components/ui/dropdown-menu.tsx`

- [ ] **Step 1: Rewrite tooltip**

Spec reference: Section 8.11. No delay, no animation, no arrow.

```typescript
import { cn } from '@/lib/utils'
import { type ReactNode, useState } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

const positions = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div
          className={cn(
            'absolute z-50 whitespace-nowrap rounded-[4px] border border-white/[0.08] bg-[#1a1a1a] px-2 py-1 text-[11px] text-[#a3a3a3]',
            positions[side],
            className,
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Rewrite separator**

Spec reference: Section 8.15.

```typescript
import { cn } from '@/lib/utils'

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function Separator({ orientation = 'horizontal', className }: SeparatorProps) {
  return (
    <div
      className={cn(
        'bg-white/[0.06]',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
        className,
      )}
    />
  )
}
```

- [ ] **Step 3: Rewrite dropdown menu**

Spec reference: Section 8.12. No animation.

```typescript
import { cn } from '@/lib/utils'
import { type ReactNode, useEffect, useRef, useState } from 'react'

interface DropdownMenuProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}

export function DropdownMenu({ trigger, children, align = 'right', className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex">
      <button type="button" onClick={() => setOpen(!open)}>{trigger}</button>
      {open && (
        <div
          className={cn(
            'absolute top-full mt-1 z-50 min-w-[160px] rounded-md border border-white/[0.08] bg-[#111] p-1',
            align === 'right' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface DropdownItemProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  danger?: boolean
  className?: string
}

export function DropdownItem({ children, onClick, disabled, danger, className }: DropdownItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full text-left px-2.5 py-1.5 text-xs rounded-[4px]',
        danger
          ? 'text-[#ef4444] hover:bg-red-500/[0.08]'
          : 'text-[#a3a3a3] hover:bg-white/[0.05]',
        disabled && 'opacity-40 cursor-not-allowed',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-white/[0.06]" />
}
```

- [ ] **Step 4: Commit**

```bash
git add dashboard/src/components/ui/tooltip.tsx dashboard/src/components/ui/separator.tsx dashboard/src/components/ui/dropdown-menu.tsx
git commit -m "style: rewrite tooltip, separator, dropdown with precision design"
```

### Task 13: Create new toggle-switch.tsx and error-banner.tsx

**Files:**
- Create: `dashboard/src/components/ui/toggle-switch.tsx`
- Create: `dashboard/src/components/ui/error-banner.tsx`

- [ ] **Step 1: Create toggle switch**

Spec reference: Section 8.16.

```typescript
import { cn } from '@/lib/utils'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  className?: string
}

export function ToggleSwitch({ checked, onChange, label, disabled, className }: ToggleSwitchProps) {
  return (
    <label className={cn('inline-flex items-center gap-2 cursor-pointer', disabled && 'opacity-40 cursor-not-allowed', className)}>
      {label && <span className="text-xs text-[#a3a3a3]">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative h-4 w-8 rounded-lg',
          checked ? 'bg-[#22c55e]' : 'bg-white/[0.06]',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-3 w-3 rounded-full bg-[#fafafa]',
            checked ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </button>
    </label>
  )
}
```

- [ ] **Step 2: Create error banner**

Spec reference: Section 8.17.

```typescript
import { cn } from '@/lib/utils'
import { AlertCircle, X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ErrorBannerProps {
  children: ReactNode
  onDismiss?: () => void
  className?: string
}

export function ErrorBanner({ children, onDismiss, className }: ErrorBannerProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/[0.05] px-3 py-2',
        className,
      )}
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#ef4444]" />
      <span className="flex-1 text-xs text-[#ef4444]">{children}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="text-[#333] hover:text-[#a3a3a3]">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/components/ui/toggle-switch.tsx dashboard/src/components/ui/error-banner.tsx
git commit -m "feat: add toggle switch and error banner components"
```

---

## Chunk 3: Charts + Shared Components

### Task 14: Rewrite all 3 chart components

**Files:**
- Rewrite: `dashboard/src/components/charts/sparkline.tsx`
- Rewrite: `dashboard/src/components/charts/area-chart.tsx`
- Rewrite: `dashboard/src/components/charts/bar-chart.tsx`

- [ ] **Step 1: Rewrite sparkline**

Spec reference: Section 9.4. Uses system chart tokens.

```typescript
import type { TimeseriesPoint } from '@/lib/types'
import { Area, AreaChart as RechartsAreaChart, ResponsiveContainer } from 'recharts'

interface SparklineProps {
  data: TimeseriesPoint[]
  width?: number
  height?: number
}

export function Sparkline({ data, width = 64, height = 28 }: SparklineProps) {
  return (
    <ResponsiveContainer width={width} height={height}>
      <RechartsAreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={1}
          fill="url(#sparkGrad)"
          isAnimationActive={false}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Rewrite area chart**

Spec reference: Section 9.1, 9.2. No grid, no cursor, 240px default height.

```typescript
import type { TimeseriesPoint } from '@/lib/types'
import { format } from 'date-fns'
import {
  Area,
  AreaChart as RechartsAreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface AreaChartProps {
  data: TimeseriesPoint[]
  gradientId?: string
  height?: number
  valueFormatter?: (value: number) => string
  xAxisFormatter?: (timestamp: string) => string
}

function ChartTooltip({ active, payload, valueFormatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[4px] border border-white/[0.08] bg-[#1a1a1a] px-2 py-1">
      <p className="text-[11px] text-[#a3a3a3]">
        {valueFormatter ? valueFormatter(payload[0].value) : payload[0].value}
      </p>
    </div>
  )
}

export function AreaChart({
  data,
  gradientId = 'areaGrad',
  height = 240,
  valueFormatter,
  xAxisFormatter,
}: AreaChartProps) {
  const formatX = xAxisFormatter ?? ((ts: string) => format(new Date(ts), 'MMM d'))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="timestamp"
          tickFormatter={formatX}
          axisLine={{ stroke: 'rgba(255,255,255,0.04)' }}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#333', fontFamily: 'var(--font-mono)' }}
        />
        <YAxis
          axisLine={{ stroke: 'rgba(255,255,255,0.04)' }}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#333', fontFamily: 'var(--font-mono)' }}
          tickFormatter={valueFormatter}
        />
        <Tooltip cursor={false} content={<ChartTooltip valueFormatter={valueFormatter} />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 3, fill: '#fff', stroke: 'none' }}
          isAnimationActive={false}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 3: Rewrite bar chart**

Spec reference: Section 9.3. Dynamic per-bar opacity using `<Cell>`.

```typescript
import {
  Bar,
  BarChart as RechartsBarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface BarChartProps {
  data: { name: string; value: number }[]
  height?: number
  valueFormatter?: (value: number) => string
  layout?: 'vertical' | 'horizontal'
}

function ChartTooltip({ active, payload, valueFormatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[4px] border border-white/[0.08] bg-[#1a1a1a] px-2 py-1">
      <p className="text-[11px] text-[#a3a3a3]">
        {payload[0].payload.name}: {valueFormatter ? valueFormatter(payload[0].value) : payload[0].value}
      </p>
    </div>
  )
}

function getBarOpacity(value: number, max: number): number {
  if (max === 0) return 0.04
  return 0.04 + (value / max) * 0.12
}

export function BarChart({ data, height = 200, valueFormatter, layout = 'vertical' }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 0)

  if (layout === 'horizontal') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} layout="vertical" margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#333' }}
            width={80}
          />
          <Tooltip cursor={false} content={<ChartTooltip valueFormatter={valueFormatter} />} />
          <Bar dataKey="value" radius={[0, 2, 2, 0]} barSize={16} isAnimationActive={false}>
            {data.map((entry, i) => (
              <Cell key={i} fill={`rgba(255,255,255,${getBarOpacity(entry.value, max)})`} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <XAxis
          dataKey="name"
          axisLine={{ stroke: 'rgba(255,255,255,0.04)' }}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#333' }}
        />
        <YAxis
          axisLine={{ stroke: 'rgba(255,255,255,0.04)' }}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#333', fontFamily: 'var(--font-mono)' }}
          tickFormatter={valueFormatter}
        />
        <Tooltip cursor={false} content={<ChartTooltip valueFormatter={valueFormatter} />} />
        <Bar dataKey="value" radius={[2, 2, 0, 0]} barSize={20} isAnimationActive={false}>
          {data.map((entry, i) => (
            <Cell key={i} fill={`rgba(255,255,255,${getBarOpacity(entry.value, max)})`} />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add dashboard/src/components/charts/sparkline.tsx dashboard/src/components/charts/area-chart.tsx dashboard/src/components/charts/bar-chart.tsx
git commit -m "style: rewrite all charts with monochrome precision design"
```

### Task 15: Rewrite shared components (stat-card, date-range-picker, data-table, empty-state)

**Files:**
- Rewrite: `dashboard/src/components/shared/stat-card.tsx`
- Rewrite: `dashboard/src/components/shared/date-range-picker.tsx`
- Rewrite: `dashboard/src/components/shared/data-table.tsx`
- Rewrite: `dashboard/src/components/shared/empty-state.tsx`

- [ ] **Step 1: Rewrite stat-card**

Spec reference: Section 8.1. 8px radius, 12px padding, no trend percentage.

```typescript
import { Sparkline } from '@/components/charts/sparkline'
import type { TimeseriesPoint } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  sparklineData?: TimeseriesPoint[]
  className?: string
}

export function StatCard({ label, value, sparklineData, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 hover:border-white/[0.10]',
        className,
      )}
    >
      <div className="flex flex-col min-w-0">
        <p className="text-[10px] text-[#525252] uppercase tracking-[0.5px]">{label}</p>
        <p className="mt-2 text-[22px] font-semibold text-[#fafafa] tracking-[-0.5px]">{value}</p>
      </div>
      {sparklineData && sparklineData.length > 0 && (
        <div className="shrink-0 self-end">
          <Sparkline data={sparklineData} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Rewrite empty-state**

Spec reference: Section 8.14. Compact, 120px max height.

```typescript
import { cn } from '@/lib/utils'
import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-8', className)}>
      <div className="text-[#333]">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <p className="mt-2 text-[13px] font-semibold text-[#a3a3a3]">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-[#525252] max-w-[240px] text-center">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
```

- [ ] **Step 3: Rewrite date-range-picker**

Spec reference: Section 8.19. Tabs-style button group.

```typescript
import { cn } from '@/lib/utils'
import { Calendar } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface DateRangePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

const presets = ['1h', '24h', '7d', '30d']

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const handlePreset = (preset: string) => {
    setShowCustom(false)
    onChange(preset)
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Calendar className="h-3.5 w-3.5 text-[#333]" />
      <div className="inline-flex rounded-md border border-white/[0.06] bg-white/[0.02] p-0.5">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handlePreset(preset)}
            className={cn(
              'px-3 py-1 text-[11px] font-medium rounded-[5px]',
              value === preset && !showCustom
                ? 'bg-white/[0.08] text-[#fafafa]'
                : 'text-[#525252] hover:text-[#a3a3a3]',
            )}
          >
            {preset}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={cn(
            'px-3 py-1 text-[11px] font-medium rounded-[5px]',
            showCustom ? 'bg-white/[0.08] text-[#fafafa]' : 'text-[#525252] hover:text-[#a3a3a3]',
          )}
        >
          Custom
        </button>
      </div>
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="h-8 rounded-md border border-white/[0.06] bg-transparent px-2 text-[11px] text-[#fafafa] focus:outline-none focus:border-white/[0.15]"
          />
          <span className="text-[11px] text-[#333]">to</span>
          <input
            type="datetime-local"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="h-8 rounded-md border border-white/[0.06] bg-transparent px-2 text-[11px] text-[#fafafa] focus:outline-none focus:border-white/[0.15]"
          />
          <Button
            size="sm"
            onClick={() => {
              if (customStart && customEnd) onChange(`${customStart}|${customEnd}`)
            }}
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  )
}

export function getDateRange(range: string): { start: string; end: string } {
  if (range.includes('|')) {
    const [start, end] = range.split('|')
    return { start, end }
  }
  const now = new Date()
  const end = now.toISOString()
  const ms: Record<string, number> = {
    '1h': 3600000,
    '24h': 86400000,
    '7d': 604800000,
    '30d': 2592000000,
  }
  const start = new Date(now.getTime() - (ms[range] ?? 86400000)).toISOString()
  return { start, end }
}

export function getGranularity(range: string): string {
  if (range.includes('|')) return 'hour'
  const map: Record<string, string> = {
    '1h': 'minute',
    '24h': 'hour',
    '7d': 'hour',
    '30d': 'day',
  }
  return map[range] ?? 'hour'
}
```

- [ ] **Step 4: Rewrite data-table**

Spec reference: Section 8.8. Dense pagination, search top-left, actions top-right.

```typescript
import { EmptyState } from '@/components/shared/empty-state'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  total?: number
  page?: number
  perPage?: number
  onPageChange?: (page: number) => void
  onSearch?: (query: string) => void
  onSort?: (key: string) => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  isLoading?: boolean
  searchPlaceholder?: string
  emptyTitle?: string
  emptyDescription?: string
  actions?: ReactNode
  onRowClick?: (row: T) => void
  getRowKey: (row: T) => string
  expandedRow?: string | null
  renderExpandedRow?: (row: T) => ReactNode
}

export function DataTable<T>({
  columns,
  data,
  total,
  page = 1,
  perPage = 20,
  onPageChange,
  onSearch,
  onSort,
  sortBy,
  sortOrder,
  searchPlaceholder = 'Search...',
  emptyTitle = 'No results',
  emptyDescription,
  actions,
  onRowClick,
  getRowKey,
  expandedRow,
  renderExpandedRow,
}: DataTableProps<T>) {
  const totalItems = total ?? data.length
  const totalPages = Math.ceil(totalItems / perPage)
  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, totalItems)

  const pageNumbers = []
  for (let i = 1; i <= Math.min(totalPages, 5); i++) {
    pageNumbers.push(i)
  }

  return (
    <div>
      {(onSearch || actions) && (
        <div className="flex items-center gap-3 mb-3">
          {onSearch && (
            <div className="flex-1">
              <Input
                placeholder={searchPlaceholder}
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
          )}
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}

      {data.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <tr>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    sortKey={col.sortable ? col.key : undefined}
                    currentSort={sortBy}
                    sortOrder={sortOrder}
                    onSort={onSort}
                    className={col.className}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </tr>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const key = getRowKey(row)
                const isExpanded = expandedRow === key
                return (
                  <>
                    <TableRow
                      key={key}
                      onClick={() => onRowClick?.(row)}
                      className={cn(onRowClick && 'cursor-pointer')}
                    >
                      {columns.map((col) => (
                        <TableCell key={col.key} className={col.className}>
                          {col.render ? col.render(row) : (row as any)[col.key]}
                        </TableCell>
                      ))}
                    </TableRow>
                    {isExpanded && renderExpandedRow && (
                      <tr key={`${key}-expanded`}>
                        <td colSpan={columns.length} className="bg-white/[0.01] border-b border-white/[0.06] p-0">
                          {renderExpandedRow(row)}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </TableBody>
          </Table>

          {onPageChange && totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-[#525252]">
                {start}–{end} of {totalItems} results
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                  className="h-6 w-6 rounded-[5px] text-[11px] text-[#a3a3a3] hover:bg-white/[0.05] disabled:opacity-40"
                >
                  ‹
                </button>
                {pageNumbers.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPageChange(p)}
                    className={cn(
                      'h-6 w-6 rounded-[5px] text-[11px]',
                      p === page ? 'bg-white/[0.08] text-[#fafafa]' : 'text-[#525252] hover:bg-white/[0.05]',
                    )}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                  className="h-6 w-6 rounded-[5px] text-[11px] text-[#a3a3a3] hover:bg-white/[0.05] disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add dashboard/src/components/shared/stat-card.tsx dashboard/src/components/shared/date-range-picker.tsx dashboard/src/components/shared/data-table.tsx dashboard/src/components/shared/empty-state.tsx
git commit -m "style: rewrite shared components with precision design"
```

---

## Chunk 4: Layout (Shell + Sidebar + Command Palette)

### Task 16: Create command palette

**Files:**
- Create: `dashboard/src/components/shared/command-palette.tsx`

- [ ] **Step 1: Create command palette component**

Spec reference: Section 7. Simple substring search, keyboard navigation, focus trap.

```typescript
import { cn } from '@/lib/utils'
import {
  BarChart3, Cpu, Database, Key, LayoutDashboard, List, Puzzle,
  Server, Settings, Shield, Users, Wallet,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface PaletteItem {
  id: string
  label: string
  category: 'Pages' | 'Actions'
  icon: React.ReactNode
  path?: string
  shortcut?: string
  action?: () => void
}

const pageItems: PaletteItem[] = [
  { id: 'overview', label: 'Overview', category: 'Pages', icon: <LayoutDashboard className="h-3.5 w-3.5" />, path: '/', shortcut: '⌘1' },
  { id: 'requests', label: 'Requests', category: 'Pages', icon: <List className="h-3.5 w-3.5" />, path: '/requests', shortcut: '⌘2' },
  { id: 'analytics', label: 'Analytics', category: 'Pages', icon: <BarChart3 className="h-3.5 w-3.5" />, path: '/analytics', shortcut: '⌘3' },
  { id: 'providers', label: 'Providers', category: 'Pages', icon: <Server className="h-3.5 w-3.5" />, path: '/providers' },
  { id: 'models', label: 'Models', category: 'Pages', icon: <Cpu className="h-3.5 w-3.5" />, path: '/models' },
  { id: 'keys', label: 'Keys', category: 'Pages', icon: <Key className="h-3.5 w-3.5" />, path: '/keys' },
  { id: 'teams', label: 'Teams', category: 'Pages', icon: <Users className="h-3.5 w-3.5" />, path: '/teams' },
  { id: 'budgets', label: 'Budgets', category: 'Pages', icon: <Wallet className="h-3.5 w-3.5" />, path: '/budgets' },
  { id: 'cache', label: 'Cache', category: 'Pages', icon: <Database className="h-3.5 w-3.5" />, path: '/cache' },
  { id: 'guardrails', label: 'Guardrails', category: 'Pages', icon: <Shield className="h-3.5 w-3.5" />, path: '/guardrails' },
  { id: 'plugins', label: 'Plugins', category: 'Pages', icon: <Puzzle className="h-3.5 w-3.5" />, path: '/plugins' },
  { id: 'settings', label: 'Settings', category: 'Pages', icon: <Settings className="h-3.5 w-3.5" />, path: '/settings' },
]

const actionItems: PaletteItem[] = [
  { id: 'create-key', label: 'Create Key', category: 'Actions', icon: <Key className="h-3.5 w-3.5" />, path: '/keys' },
  { id: 'create-org', label: 'Create Org', category: 'Actions', icon: <Users className="h-3.5 w-3.5" />, path: '/teams' },
  { id: 'create-budget', label: 'Create Budget', category: 'Actions', icon: <Wallet className="h-3.5 w-3.5" />, path: '/budgets' },
]

const allItems = [...pageItems, ...actionItems]

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const filtered = query
    ? allItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    : allItems

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const execute = (item: PaletteItem) => {
    onClose()
    if (item.action) {
      item.action()
    } else if (item.path) {
      navigate(item.path)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault()
      execute(filtered[activeIndex])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!open) return null

  const grouped = {
    Pages: filtered.filter((i) => i.category === 'Pages'),
    Actions: filtered.filter((i) => i.category === 'Actions'),
  }

  let flatIndex = -1

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[560px] rounded-lg border border-white/[0.08] bg-[#111] overflow-hidden">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, actions, settings..."
            className="w-full bg-transparent text-sm text-[#fafafa] placeholder:text-[#333] outline-none"
          />
        </div>
        <div className="max-h-[320px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-[#525252]">No results</p>
          ) : (
            Object.entries(grouped).map(([category, items]) =>
              items.length > 0 ? (
                <div key={category} className="mb-2 last:mb-0">
                  <p className="px-2 py-1 text-[9px] font-medium text-[#333] uppercase tracking-[1px]">
                    {category}
                  </p>
                  {items.map((item) => {
                    flatIndex++
                    const isActive = flatIndex === activeIndex
                    const idx = flatIndex
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-selected={isActive}
                        onClick={() => execute(item)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-[5px] px-2.5 py-1.5 text-xs',
                          isActive ? 'bg-white/[0.05] text-[#fafafa]' : 'text-[#a3a3a3]',
                        )}
                      >
                        <span className="text-[#525252]">{item.icon}</span>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.shortcut && (
                          <span className="text-[9px] font-mono text-[#333]">{item.shortcut}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ) : null,
            )
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/shared/command-palette.tsx
git commit -m "feat: add command palette component"
```

### Task 17: Rewrite sidebar with dual-mode

**Files:**
- Rewrite: `dashboard/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Rewrite sidebar**

Spec reference: Sections 6.2, 6.3, 6.5. Dual-mode with collapse toggle, section labels, shortcuts, footer status, localStorage persistence. Read current file first.

Complete rewrite. The new sidebar must:
- Support expanded (220px) and collapsed (52px) states
- Persist collapse state in localStorage key `raven-sidebar-collapsed`
- Show section labels ("Core", "Manage", "System") in expanded mode
- Show keyboard shortcut badges on first 3 items in expanded mode
- Show tooltips on icons in collapsed mode
- Show gateway status in footer
- Include mobile hamburger overlay
- Include command palette search trigger

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/layout/sidebar.tsx
git commit -m "style: rewrite sidebar with dual-mode collapse"
```

### Task 18: Rewrite shell.tsx and delete header.tsx

**Files:**
- Rewrite: `dashboard/src/components/layout/shell.tsx`
- Delete: `dashboard/src/components/layout/header.tsx`

- [ ] **Step 1: Rewrite shell**

Spec reference: Section 6.1, 6.4, 7. Shell now handles:
- Sidebar (no header)
- Dynamic margin-left based on sidebar collapse state
- Keyboard shortcut listeners (⌘K, ⌘1-3) registered here
- CommandPalette rendered here

Read current file, then rewrite. The shell must use a shared state/context for sidebar collapse state so the sidebar and shell both know the width.

- [ ] **Step 2: Delete header.tsx**

Remove the file entirely.

- [ ] **Step 3: Verify build**

Run: `cd dashboard && npx vite build 2>&1 | tail -10`
Expected: Build may show import errors in pages that still reference Header — that's expected, they'll be fixed in the next chunk.

- [ ] **Step 4: Commit**

```bash
git add dashboard/src/components/layout/shell.tsx
git rm dashboard/src/components/layout/header.tsx
git commit -m "style: rewrite shell with dual-mode sidebar, remove header"
```

---

## Chunk 5: Core Pages (Overview, Requests, Analytics)

### Task 19: Rewrite overview page

**Files:**
- Rewrite: `dashboard/src/pages/overview.tsx`

- [ ] **Step 1: Rewrite overview**

Spec reference: Section 10.1. Read current file, then rewrite entirely.

Key changes:
- Page title + DateRangePicker in first row (no header)
- 4 stat cards with sparklines
- 2-column grid: horizontal bar chart (Top Models) + provider health list
- Provider health rows: 36px height, name left, status badge right
- All using new component APIs

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/pages/overview.tsx
git commit -m "style: rewrite overview page with precision design"
```

### Task 20: Rewrite requests page with inline expansion

**Files:**
- Rewrite: `dashboard/src/pages/requests.tsx`

- [ ] **Step 1: Rewrite requests page**

Spec reference: Section 10.2. Read current file, then rewrite entirely.

Key changes:
- Replace modal dialog with inline row expansion
- Status codes colored: 2xx green, 4xx amber, 5xx red (just text, no badge)
- Monospace timestamps (HH:MM:SS.ms)
- "CACHED" badge for cache hits
- Expanded row: 4-column key-value grid + optional error `<pre>` block
- Use new DataTable props: `expandedRow`, `renderExpandedRow`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/pages/requests.tsx
git commit -m "style: rewrite requests page with inline expansion"
```

### Task 21: Rewrite analytics page

**Files:**
- Rewrite: `dashboard/src/pages/analytics.tsx`

- [ ] **Step 1: Rewrite analytics page**

Spec reference: Section 10.3. Read current file, then rewrite entirely.

Key changes:
- 4 stat cards (no sparklines)
- Tabs: "Cost Over Time" / "By Team" / "By Model"
- Area chart 240px, bar charts for team/model breakdowns

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/pages/analytics.tsx
git commit -m "style: rewrite analytics page with precision design"
```

---

## Chunk 6: Management Pages (Providers, Models, Keys, Teams, Budgets)

### Task 22: Rewrite providers page

**Files:**
- Rewrite: `dashboard/src/pages/providers.tsx`

- [ ] **Step 1: Rewrite providers page**

Spec reference: Section 10.4. Read current file, then rewrite entirely.

Key changes:
- 3-column card grid
- Each card: status dot + name, latency + error metrics, model list, action button
- Configure dialog: API key (show/hide), base URL, toggle switch for enable, delete with confirmation
- Use new ToggleSwitch and ErrorBanner components

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/pages/providers.tsx
git commit -m "style: rewrite providers page with precision design"
```

### Task 23: Rewrite models page

**Files:**
- Rewrite: `dashboard/src/pages/models.tsx`

- [ ] **Step 1: Rewrite models page**

Spec reference: Section 10.5. Read current file, then rewrite entirely.

Key changes:
- Dense DataTable, provider as plain text
- Pricing in monospace, right-aligned
- Context window as "128K"
- Features as single-letter monospace: S V T (muted if unsupported, primary if supported)

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/pages/models.tsx
git commit -m "style: rewrite models page with precision design"
```

### Task 24: Rewrite keys page

**Files:**
- Rewrite: `dashboard/src/pages/keys.tsx`

- [ ] **Step 1: Rewrite keys page**

Spec reference: Section 10.6. Read current file, then rewrite entirely.

Key changes:
- Key prefix in monospace
- Relative timestamps ("2m ago")
- Dropdown actions: Rotate, Delete (danger)
- Create dialog fields, key display dialog with copy

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/pages/keys.tsx
git commit -m "style: rewrite keys page with precision design"
```

### Task 25: Rewrite teams page

**Files:**
- Rewrite: `dashboard/src/pages/teams.tsx`

- [ ] **Step 1: Rewrite teams page**

Spec reference: Section 10.7. Read current file, then rewrite entirely.

Key changes:
- Tabs: "Organizations" / "Users"
- Slug in monospace
- Role badges: default variant (no color)
- Create org dialog: name, slug (auto-generated), description

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/pages/teams.tsx
git commit -m "style: rewrite teams page with precision design"
```

### Task 26: Rewrite budgets page

**Files:**
- Rewrite: `dashboard/src/pages/budgets.tsx`

- [ ] **Step 1: Rewrite budgets page**

Spec reference: Section 10.8. Read current file, then rewrite entirely.

Key changes:
- Inline progress bars (80px × 4px, 2px radius)
- Color thresholds: >70% amber, >90% red
- Monospace entity and percentage
- Create Budget dialog with all fields

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/pages/budgets.tsx
git commit -m "style: rewrite budgets page with precision design"
```

---

## Chunk 7: System Pages + Final Verification

### Task 27: Rewrite cache page

**Files:**
- Rewrite: `dashboard/src/pages/cache.tsx`

- [ ] **Step 1: Rewrite cache page**

Spec reference: Section 10.9. Read current file, then rewrite entirely.

Key changes:
- Remove local formatBytes (now in utils.ts)
- 4 stat cards with sparklines
- Area chart 240px for hit rate
- Import formatBytes from `@/lib/utils`

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/pages/cache.tsx
git commit -m "style: rewrite cache page with precision design"
```

### Task 28: Rewrite guardrails, plugins, settings pages

**Files:**
- Rewrite: `dashboard/src/pages/guardrails.tsx`
- Rewrite: `dashboard/src/pages/plugins.tsx`
- Rewrite: `dashboard/src/pages/settings.tsx`

- [ ] **Step 1: Rewrite guardrails**

Spec reference: Section 10.10. Simple empty state with Shield icon.

- [ ] **Step 2: Rewrite plugins**

Spec reference: Section 10.11. Same empty state with Puzzle icon.

- [ ] **Step 3: Rewrite settings**

Spec reference: Section 10.12. Read current file, then rewrite entirely.

Key changes:
- Key-value rows with separators
- "enabled"/"disabled" as badges (success/default variant)
- Providers as badges

- [ ] **Step 4: Commit**

```bash
git add dashboard/src/pages/guardrails.tsx dashboard/src/pages/plugins.tsx dashboard/src/pages/settings.tsx
git commit -m "style: rewrite guardrails, plugins, settings pages"
```

### Task 29: Final build verification and cleanup

**Files:**
- Possibly modify: any file with build errors

- [ ] **Step 1: Run full build**

Run: `cd dashboard && npx vite build`
Expected: Clean build with no errors.

- [ ] **Step 2: Fix any TypeScript or import errors**

If build fails, read error output and fix. Common issues:
- Removed `dot` prop from Badge but pages still pass it → remove from page call sites
- Header import in shell → already deleted
- Animation class references → remove from any remaining usage

- [ ] **Step 3: Run dev server to visually verify**

Run: `cd dashboard && npx vite --host`
Open http://localhost:5173 and verify:
- Sidebar toggles between expanded/collapsed
- ⌘K opens command palette
- All 12 pages render without errors
- Charts display with monochrome styling
- No animations anywhere (except Loader2 spinner)

- [ ] **Step 4: Final commit**

```bash
git add -A dashboard/src/
git commit -m "fix: resolve build errors from precision redesign"
```

---

## Execution Notes

**Parallelism opportunities:**
- Chunks 2 and 3 (UI components and charts/shared) can run in parallel after Chunk 1
- Within Chunk 2, Tasks 3-13 can all run in parallel (no cross-dependencies)
- Within Chunk 5, Tasks 19-21 can run in parallel
- Within Chunk 6, Tasks 22-26 can run in parallel
- Chunk 7 depends on all previous chunks

**Dependency chain:**
```
Chunk 1 (foundation) → Chunk 2 (UI) + Chunk 3 (charts/shared) → Chunk 4 (layout) → Chunk 5 + 6 (pages) → Chunk 7 (final)
```

**Verification at each chunk:**
After completing each chunk, run `cd dashboard && npx vite build` to catch errors early. The build may have warnings during intermediate chunks (pages referencing old component APIs) — that's expected.
