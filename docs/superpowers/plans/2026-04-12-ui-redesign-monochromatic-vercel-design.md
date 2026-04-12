# UI Redesign · Monochromatic Vercel-Inspired · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Raven's current shadcn-style UI with a monochromatic, Vercel-inspired redesign. New tokens, Geist typography, retuned @raven/ui primitives, new sidebar shell with grouped nav + usage meter + ⌘K command palette, and 4 flagship pages (Overview, Playground, Knowledge detail, Analytics).

**Architecture:** Token-first. Rewrite `globals.css` so every page picks up new colors/typography passively. Retune existing primitives in `packages/ui` against new tokens. Add 10 new primitives. Rewrite the dashboard shell in `apps/web/src/app/(dashboard)/`. Rewrite 4 flagship pages with custom layouts. Remaining pages migrate passively via token aliases.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind 4 (`@theme` block), Base UI React, `class-variance-authority`, Lucide icons, Recharts, Motion, TanStack Query. Geist Sans + Geist Mono via the `geist` npm package. Biome for lint.

**Project conventions** (follow strictly):
- No test files are added for UI work. Verification is type-check + lint + manual browser check (both light and dark modes).
- File naming: `snake-case.tsx` for components, `kebab-case.ts` for utilities, `use-*.ts` for hooks.
- Components use Base UI primitives + `cva` for variants + `cn()` helper for class composition.
- Commits use conventional commit form: `feat: ...`, `refactor: ...`, `chore: ...`. Never include a co-author trailer.
- Every UI task ends with `pnpm --filter @raven/web typecheck && pnpm --filter @raven/ui typecheck`.

**Reference spec:** `docs/superpowers/specs/2026-04-12-ui-redesign-monochromatic-vercel-design.md` — consult it for color values, typography scale, primitive variants, and page layouts.

**Mockups (for visual reference):** `.superpowers/brainstorm/68434-1775971975/content/` — `color-system.html`, `shell-layout.html`, `playground.html`, `flagship-pages.html`. Open these in a browser alongside the dev server when working on flagship pages.

---

## Phase 1 · Foundation (tokens + typography)

### Task 1: Install Geist font package

**Files:** `apps/web/package.json` (lockfile updated automatically)

- [ ] **Step 1: Install**

```bash
pnpm --filter @raven/web add geist
```

- [ ] **Step 2: Verify**

```bash
pnpm --filter @raven/web list geist
```

Expected: shows `geist 1.x.x`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore: add geist font package"
```

---

### Task 2: Swap root layout to Geist Sans + Geist Mono

**Files:** `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Read the existing file**

```bash
cat apps/web/src/app/layout.tsx
```

Keep the existing theme-init inline script (the `<script dangerouslySetInnerHTML={{__html: ...}}>` block that reads `localStorage.theme` and applies the `.dark` class before hydration). Do not remove or alter that script — it prevents a flash of incorrect theme.

- [ ] **Step 2: Apply these edits only**

1. Remove the `import { Outfit } from "next/font/google";` line.
2. Remove `const outfit = Outfit({ subsets: ["latin"] });`.
3. Add at the top:
   ```ts
   import { GeistMono } from "geist/font/mono";
   import { GeistSans } from "geist/font/sans";
   ```
4. On the root `<html>` element, add `className={`${GeistSans.variable} ${GeistMono.variable}`}` (preserve `lang` and `suppressHydrationWarning`).
5. On the `<body>` element, change `className={`${outfit.className} min-h-screen bg-background text-foreground antialiased`}` to `className="min-h-screen bg-background text-foreground antialiased font-sans"`.
6. Optionally update `viewport.themeColor` from `"#09090b"` to `"#0a0a0a"` to match the new dark bg.
7. Leave the theme-init `<script>` block, the `<Providers>` wrapper, and the skip-link anchor exactly as they were.

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @raven/web typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "refactor: swap root layout to geist fonts"
```

---

### Task 3: Rewrite `globals.css` with monochromatic tokens

**Files:** `apps/web/src/app/globals.css`

- [ ] **Step 1: Replace the entire file**

```css
@import "tailwindcss";

@source "../**/*.tsx";
@source "../../../../packages/ui/src/**/*.tsx";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Typography */
  --font-sans: var(--font-geist-sans), -apple-system, "SF Pro Text", system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), "SF Mono", "Menlo", monospace;

  /* === Light mode colors (default) === */
  /* New semantic tokens */
  --color-bg: #ffffff;
  --color-bg-subtle: #fafafa;
  --color-surface: #f5f5f5;
  --color-surface-hover: #ededed;
  --color-border: #e5e5e5;
  --color-border-strong: #d4d4d4;
  --color-text-muted: #737373;
  --color-text-secondary: #525252;
  --color-text: #171717;
  --color-text-strong: #0a0a0a;

  /* Tailwind legacy aliases (preserve utility class names on migrating pages) */
  --color-background: #ffffff;
  --color-foreground: #171717;
  --color-card: #f5f5f5;
  --color-card-foreground: #171717;
  --color-popover: #f5f5f5;
  --color-popover-foreground: #171717;
  --color-primary: #0a0a0a;
  --color-primary-foreground: #ffffff;
  --color-muted: #fafafa;
  --color-muted-foreground: #737373;
  --color-input: #d4d4d4;
  --color-ring: #0a0a0a;
  --color-accent: #ededed;
  --color-accent-foreground: #171717;

  /* Semantic colors collapse to monochrome */
  --color-destructive: #0a0a0a;
  --color-destructive-foreground: #ffffff;
  --color-success: #0a0a0a;
  --color-success-foreground: #ffffff;
  --color-warning: #0a0a0a;
  --color-warning-foreground: #ffffff;
  --color-info: #0a0a0a;
  --color-info-foreground: #ffffff;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;

  /* Shadows (only for floating elements) */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.06);
  --shadow-md: 0 4px 12px -2px rgb(0 0 0 / 0.10);
  --shadow-lg: 0 12px 32px -4px rgb(0 0 0 / 0.16);

  /* Motion */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}

/* === Dark mode overrides === */
.dark {
  --color-bg: #0a0a0a;
  --color-bg-subtle: #0f0f0f;
  --color-surface: #141414;
  --color-surface-hover: #1a1a1a;
  --color-border: #1f1f1f;
  --color-border-strong: #2a2a2a;
  --color-text-muted: #737373;
  --color-text-secondary: #a3a3a3;
  --color-text: #ededed;
  --color-text-strong: #fafafa;

  --color-background: #0a0a0a;
  --color-foreground: #ededed;
  --color-card: #141414;
  --color-card-foreground: #ededed;
  --color-popover: #141414;
  --color-popover-foreground: #ededed;
  --color-primary: #fafafa;
  --color-primary-foreground: #0a0a0a;
  --color-muted: #0f0f0f;
  --color-muted-foreground: #737373;
  --color-input: #2a2a2a;
  --color-ring: #fafafa;
  --color-accent: #1a1a1a;
  --color-accent-foreground: #ededed;

  --color-destructive: #fafafa;
  --color-destructive-foreground: #0a0a0a;
  --color-success: #fafafa;
  --color-success-foreground: #0a0a0a;
  --color-warning: #fafafa;
  --color-warning-foreground: #0a0a0a;
  --color-info: #fafafa;
  --color-info-foreground: #0a0a0a;
}

/* Global typography defaults */
html {
  font-family: var(--font-sans);
  font-feature-settings: "rlig" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-size: 13px;
  line-height: 1.5;
  letter-spacing: -0.01em;
}

.tabular-nums,
[data-tabular] {
  font-variant-numeric: tabular-nums;
}

button,
a,
select,
input[type="checkbox"],
input[type="radio"],
input[type="range"],
[role="button"],
[role="tab"],
[role="link"],
[role="menuitem"],
[role="option"],
label[for] {
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: Boot dev server and manually verify both modes**

```bash
pnpm --filter @raven/web dev
```

Open `http://localhost:3000/overview`. Toggle theme (or in devtools add/remove `class="dark"` on `<html>`).

Expected: pages render in neutral palette in both modes. No hues visible. Existing layouts still function.

- [ ] **Step 3: Typecheck + lint**

```bash
pnpm --filter @raven/web typecheck
pnpm --filter @raven/web lint
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat: rewrite design tokens to monochromatic neutral scale"
```

---

## Phase 2 · Retune primitives (`packages/ui`)

### Task 4: Retune `Button`

**Files:** `packages/ui/src/components/button.tsx`

- [ ] **Step 1: Replace file**

```tsx
"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "../cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap",
  {
    defaultVariants: {
      size: "md",
      variant: "primary"
    },
    variants: {
      size: {
        lg: "h-9 px-3.5 text-sm",
        md: "h-8 px-3 text-sm",
        sm: "h-[26px] px-2.5 text-xs"
      },
      variant: {
        destructive:
          "bg-primary text-primary-foreground hover:opacity-90 font-semibold",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        primary: "bg-primary text-primary-foreground hover:opacity-90",
        secondary:
          "border border-border bg-background text-foreground hover:bg-accent hover:border-input"
      }
    }
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

const Button = ({
  className,
  variant,
  size,
  type = "button",
  ref,
  ...props
}: ButtonProps & { ref?: Ref<HTMLButtonElement> }) => (
  <BaseButton
    className={cn(buttonVariants({ className, size, variant }))}
    ref={ref}
    type={type}
    {...props}
  />
);

export type { ButtonProps };
export { Button, buttonVariants };
```

Size change: `sm=26px`, `md=32px`, `lg=36px`. Destructive uses the same inverse fill as primary but bolder; a `!` icon can be added by callers in `children`.

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @raven/ui typecheck
git add packages/ui/src/components/button.tsx
git commit -m "refactor: retune Button for monochromatic tokens"
```

---

### Task 5: Retune `Badge` — drop color variants

**Files:** `packages/ui/src/components/badge.tsx` (+ every caller using removed variants)

- [ ] **Step 1: Replace badge.tsx**

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
  {
    defaultVariants: {
      mono: false,
      variant: "outline"
    },
    variants: {
      mono: {
        false: "",
        true: "font-mono text-[11px]"
      },
      variant: {
        outline: "border border-border text-muted-foreground bg-transparent",
        solid: "bg-primary text-primary-foreground",
        subtle: "bg-muted text-foreground"
      }
    }
  }
);

type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & {
    dot?: boolean;
  };

const Badge = ({
  className,
  variant,
  mono,
  dot,
  children,
  ...props
}: BadgeProps) => (
  <span className={cn(badgeVariants({ className, mono, variant }))} {...props}>
    {dot && <span className="size-1.5 rounded-full bg-current opacity-70" />}
    {children}
  </span>
);

export type { BadgeProps };
export { Badge, badgeVariants };
```

- [ ] **Step 2: Update callers using removed variants**

```bash
git grep -n 'variant="success"\|variant="warning"\|variant="error"\|variant="info"\|variant="primary"\|variant="neutral"' apps/web/src packages/ui/src | grep -i 'badge'
```

For each hit, map to:
- `success`, `primary`, `info` → `solid`
- `warning`, `error` → `subtle` (add a `!` icon in children if the meaning is error)
- `neutral` → `outline`

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm --filter @raven/ui typecheck
pnpm --filter @raven/web typecheck
git add packages/ui/src/components/badge.tsx apps/web/src
git commit -m "refactor: monochromatic Badge variants (outline/solid/subtle)"
```

---

### Task 6: Retune `Spinner` and `Tooltip`

**Files:** `packages/ui/src/components/spinner.tsx`, `packages/ui/src/components/tooltip.tsx`

- [ ] **Step 1: Replace spinner.tsx**

```tsx
import { cn } from "../cn";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  lg: "size-6",
  md: "size-4",
  sm: "size-3"
};

const Spinner = ({ className, size = "md" }: SpinnerProps) => (
  <div
    aria-label="Loading"
    className={cn(
      "animate-spin rounded-full border border-border border-t-foreground",
      sizeMap[size],
      className
    )}
    role="status"
  />
);

export type { SpinnerProps };
export { Spinner };
```

- [ ] **Step 2: Replace tooltip.tsx**

```tsx
"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ReactNode } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

const Tooltip = ({
  content,
  children,
  side = "top",
  align = "center"
}: TooltipProps) => {
  if (!content) return <>{children}</>;

  return (
    <BaseTooltip.Provider delay={200}>
      <BaseTooltip.Root>
        <BaseTooltip.Trigger render={children as React.JSX.Element} />
        <BaseTooltip.Portal>
          <BaseTooltip.Positioner align={align} side={side} sideOffset={6}>
            <BaseTooltip.Popup className="rounded-sm bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow-sm">
              {content}
            </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  );
};

export type { TooltipProps };
export { Tooltip };
```

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm --filter @raven/ui typecheck
git add packages/ui/src/components/spinner.tsx packages/ui/src/components/tooltip.tsx
git commit -m "refactor: retune Spinner and Tooltip for Vercel density"
```

---

### Task 7: Retune form primitives

**Files:** `packages/ui/src/components/form/{input,textarea,checkbox,switch,select}.tsx`

- [ ] **Step 1: Replace form/input.tsx**

```tsx
"use client";

import { Field } from "@base-ui/react/field";
import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "../../cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  description?: string;
}

const Input = ({
  className,
  label,
  error,
  description,
  ref,
  ...props
}: InputProps & { ref?: Ref<HTMLInputElement> }) => (
  <Field.Root invalid={!!error}>
    {label && (
      <Field.Label className="mb-1.5 block text-[10px] font-medium text-muted-foreground uppercase tracking-[0.08em]">
        {label}
      </Field.Label>
    )}
    <Field.Control
      className={cn(
        "w-full h-8 rounded-md border border-input bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring data-[invalid]:border-foreground data-[invalid]:ring-1 data-[invalid]:ring-foreground",
        className
      )}
      ref={ref}
      render={<input />}
      {...props}
    />
    {description && !error && (
      <Field.Description className="mt-1.5 text-xs text-muted-foreground">
        {description}
      </Field.Description>
    )}
    {error && (
      <Field.Error className="mt-1.5 text-xs font-medium text-foreground">
        {error}
      </Field.Error>
    )}
  </Field.Root>
);

export type { InputProps };
export { Input };
```

- [ ] **Step 2: Update form/textarea.tsx**

Read the file. In the `<Field.Control>` className, replace the textarea class string with:

```
w-full min-h-[80px] rounded-md border border-input bg-background px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring resize-y data-[invalid]:border-foreground data-[invalid]:ring-1 data-[invalid]:ring-foreground
```

Keep the same Field.Root/Label/Description/Error structure (uppercase tracking label, foreground-colored error text) used in Input.

- [ ] **Step 3: Update form/checkbox.tsx**

Adjust checkbox visual:
- Box classes: `"size-3.5 rounded-sm border border-input bg-background data-[state=checked]:bg-foreground data-[state=checked]:border-foreground transition-colors"`
- Check icon color: `text-background`
- Focus: add `focus-visible:ring-1 focus-visible:ring-ring`
- Label gap: `gap-2`

Keep the rest of the component structure identical.

- [ ] **Step 4: Update form/switch.tsx**

Track (unchecked): `"w-[26px] h-3.5 rounded-full border border-input bg-transparent transition-colors"`
Track (checked, add on `data-[state=checked]`): `bg-foreground border-foreground`
Thumb (unchecked): `size-2.5 rounded-full bg-muted-foreground transition-transform`
Thumb (checked, via `data-[state=checked]`): `translate-x-[11px] bg-background`
Focus: `focus-visible:ring-1 focus-visible:ring-ring`

- [ ] **Step 5: Update form/select.tsx**

Match Input exactly: `h-8`, `rounded-md`, `border border-input`, `bg-background`, `px-2.5`, `text-sm`. Chevron icon: `size-3 text-muted-foreground`.

- [ ] **Step 6: Typecheck + commit**

```bash
pnpm --filter @raven/ui typecheck
pnpm --filter @raven/web typecheck
git add packages/ui/src/components/form
git commit -m "refactor: retune form primitives for Vercel density"
```

---

### Task 8: Retune `Tabs` (Line + Pill)

**Files:** `packages/ui/src/components/tab/{line,pill}.tsx`

- [ ] **Step 1: Update line.tsx**

- Outer container: `"flex items-center gap-5 border-b border-border"`
- Tab button base: `"relative py-2.5 text-sm font-medium transition-colors"`
- Inactive: `"text-muted-foreground hover:text-foreground"`
- Active: `"text-foreground"` + add an absolutely positioned 1.5px bottom bar (`<span className="absolute inset-x-0 -bottom-px h-[1.5px] bg-foreground" />`) so the active bar overlaps the container border cleanly.

- [ ] **Step 2: Update pill.tsx to segmented-control style**

- Outer container: `"inline-flex border border-border rounded-md overflow-hidden"`
- Item base: `"px-2.5 h-7 text-xs font-medium transition-colors border-l border-border first:border-l-0"`
- Active: `"bg-accent text-foreground"`
- Inactive: `"bg-background text-muted-foreground hover:text-foreground hover:bg-muted"`

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm --filter @raven/ui typecheck
pnpm --filter @raven/web typecheck
git add packages/ui/src/components/tab
git commit -m "refactor: retune Tabs (line + segmented pill) for new tokens"
```

---

### Task 9: Retune `Modal` and `ConfirmDialog`

**Files:** `packages/ui/src/components/dialog/{modal,confirm}.tsx`

- [ ] **Step 1: Update modal.tsx**

Panel: `"w-full max-w-lg rounded-xl border border-border bg-popover text-popover-foreground shadow-lg"`
Header: `"px-5 py-4 border-b border-border flex items-center justify-between"`
Title: `"text-base font-semibold tracking-tight"`
Close button: same size/style as ghost icon button, `text-muted-foreground hover:text-foreground`
Content: `"p-5 text-sm"`
Footer: `"px-5 py-3 border-t border-border flex gap-2 justify-end"`
Backdrop: `"fixed inset-0 bg-background/70 backdrop-blur-sm"`

- [ ] **Step 2: Update confirm.tsx**

Uses the updated Modal. Cancel = `variant="secondary"`, Confirm = `variant="primary"` unless `destructive` prop is passed (then `variant="destructive"`). No red tint anywhere.

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm --filter @raven/ui typecheck
pnpm --filter @raven/web typecheck
git add packages/ui/src/components/dialog
git commit -m "refactor: retune Modal and ConfirmDialog for monochromatic tokens"
```

---

### Task 10: Retune `DataTable`

**Files:** `packages/ui/src/components/table.tsx`

- [ ] **Step 1: Update classes**

- Wrapper: `"border border-border rounded-lg overflow-hidden bg-card"`
- Table: `"w-full text-sm"`
- Thead row: `"bg-muted border-b border-border"`
- Thead cell: `"text-[10px] uppercase tracking-[0.08em] font-medium text-muted-foreground px-3 py-2 text-left"`
- Tbody row: `"border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"`
- Tbody cell: `"px-3 py-2.5 text-foreground"`

- [ ] **Step 2: Add `numeric` flag to `Column` type (if not present)**

Update the Column type:

```ts
interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  numeric?: boolean;
  width?: string | number;
}
```

In the cell renderer, when `column.numeric` is true, add classes `"font-mono text-[12.5px] tabular-nums text-right"`. Keep existing columns working unchanged (flag is optional).

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm --filter @raven/ui typecheck
pnpm --filter @raven/web typecheck
git add packages/ui/src/components/table.tsx
git commit -m "refactor: retune DataTable for Vercel density (mono numerics, uppercase headers)"
```

---

### Task 11: Retune `PageHeader`, `EmptyState`, `RavenLogo`

**Files:** `packages/ui/src/components/{header,empty,logo}.tsx`

- [ ] **Step 1: Update header.tsx**

Extend `PageHeaderProps` with two optional props:

```ts
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: React.ReactNode[];
  actions?: React.ReactNode;
}
```

Layout:
```tsx
<div className="flex items-start justify-between gap-4 pb-4 mb-6 border-b border-border">
  <div>
    {breadcrumb && breadcrumb.length > 0 && (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {breadcrumb.map((seg, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="text-border">/</span>}
            <span>{seg}</span>
          </Fragment>
        ))}
      </div>
    )}
    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
      {title}
    </h1>
    {subtitle && (
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    )}
  </div>
  {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
</div>
```

Import `Fragment` from `"react"`.

- [ ] **Step 2: Update empty.tsx**

Add a `compact` bool prop. Default container: `"py-14 px-6 flex flex-col items-center text-center"`. Compact: `"py-8 px-4 flex flex-col items-center text-center"`.
Icon circle: `"size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3"` (compact: `size-8 mb-2`).
Title: `"text-sm font-medium text-foreground"`.
Description: `"text-xs text-muted-foreground mt-1 max-w-sm"`.

- [ ] **Step 3: Update logo.tsx**

Ensure all SVG paths use `fill="currentColor"` and the root SVG does not hardcode colors. If the component currently accepts a `className`, that's enough — the color will inherit from `text-foreground` on callers.

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm --filter @raven/ui typecheck
pnpm --filter @raven/web typecheck
git add packages/ui/src/components/header.tsx packages/ui/src/components/empty.tsx packages/ui/src/components/logo.tsx
git commit -m "refactor: retune PageHeader (add breadcrumb+actions), EmptyState (compact), Logo"
```

---

## Phase 3 · New primitives

### Task 12: Create `Kbd`

**Files:** `packages/ui/src/components/kbd.tsx`

- [ ] **Step 1: Create file**

```tsx
import type { HTMLAttributes } from "react";
import { cn } from "../cn";

type KbdProps = HTMLAttributes<HTMLElement>;

const Kbd = ({ className, children, ...props }: KbdProps) => (
  <kbd
    className={cn(
      "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-sm border border-border bg-muted font-mono text-[10px] font-medium text-muted-foreground leading-none",
      className
    )}
    {...props}
  >
    {children}
  </kbd>
);

export type { KbdProps };
export { Kbd };
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @raven/ui typecheck
git add packages/ui/src/components/kbd.tsx
git commit -m "feat: add Kbd primitive"
```

---

### Task 13: Create `StatusDot`

**Files:** `packages/ui/src/components/status-dot.tsx`

- [ ] **Step 1: Create file**

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../cn";

const statusDotVariants = cva("inline-block shrink-0 rounded-full", {
  defaultVariants: {
    size: "md",
    variant: "filled"
  },
  variants: {
    size: {
      md: "size-1.5",
      sm: "size-1",
      lg: "size-2"
    },
    variant: {
      filled: "bg-foreground",
      ring: "bg-transparent border-[1.5px] border-muted-foreground",
      striped:
        "bg-[repeating-linear-gradient(45deg,var(--color-muted-foreground)_0_1.5px,transparent_1.5px_3px)]",
      error: "bg-foreground"
    }
  }
});

interface StatusDotProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusDotVariants> {
  label?: string;
}

const StatusDot = ({
  className,
  size,
  variant,
  label,
  ...props
}: StatusDotProps) => (
  <span
    aria-label={label}
    className={cn(statusDotVariants({ className, size, variant }))}
    role="status"
    {...props}
  />
);

export type { StatusDotProps };
export { StatusDot, statusDotVariants };
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @raven/ui typecheck
git add packages/ui/src/components/status-dot.tsx
git commit -m "feat: add StatusDot primitive (filled/ring/striped/error)"
```

---

### Task 14: Create `SectionLabel`

**Files:** `packages/ui/src/components/section-label.tsx`

- [ ] **Step 1: Create file**

```tsx
import type { HTMLAttributes } from "react";
import { cn } from "../cn";

type SectionLabelProps = HTMLAttributes<HTMLDivElement>;

const SectionLabel = ({
  className,
  children,
  ...props
}: SectionLabelProps) => (
  <div
    className={cn(
      "text-[10px] uppercase tracking-[0.08em] font-medium text-muted-foreground",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type { SectionLabelProps };
export { SectionLabel };
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @raven/ui typecheck
git add packages/ui/src/components/section-label.tsx
git commit -m "feat: add SectionLabel primitive"
```

---

### Task 15: Create `NavGroup`

**Files:** `packages/ui/src/components/nav-group.tsx`

- [ ] **Step 1: Create file**

```tsx
"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../cn";
import { SectionLabel } from "./section-label";

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

interface NavGroupProps {
  label?: string;
  items: readonly NavItem[];
  pathname: string;
  collapsed?: boolean;
}

const NavGroup = ({
  label,
  items,
  pathname,
  collapsed = false
}: NavGroupProps): ReactNode => (
  <div className="flex flex-col gap-0.5">
    {label && !collapsed && (
      <SectionLabel className="px-2.5 pt-3.5 pb-1.5">{label}</SectionLabel>
    )}
    {items.map((item) => {
      const isActive =
        pathname === item.href || pathname.startsWith(`${item.href}/`);
      const Icon = item.icon;
      return (
        <Link
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2.5 h-8 text-sm transition-colors",
            isActive
              ? "bg-accent text-foreground font-medium"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            collapsed && "justify-center px-0"
          )}
          href={item.href}
          key={item.href}
          title={collapsed ? item.label : undefined}
        >
          <Icon className="size-3.5 shrink-0" strokeWidth={1.5} />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </Link>
      );
    })}
  </div>
);

export type { NavGroupProps, NavItem };
export { NavGroup };
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @raven/ui typecheck
git add packages/ui/src/components/nav-group.tsx
git commit -m "feat: add NavGroup primitive"
```

---

### Task 16: Create `UsageMeter`

**Files:** `packages/ui/src/components/usage-meter.tsx`

- [ ] **Step 1: Create file**

```tsx
import type { HTMLAttributes } from "react";
import { cn } from "../cn";
import { SectionLabel } from "./section-label";

interface UsageMeterProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  used: number;
  total: number;
  formatValue?: (value: number) => string;
  resetsAt?: string;
}

const defaultFormat = (value: number): string => value.toLocaleString("en-US");

const UsageMeter = ({
  className,
  label,
  used,
  total,
  formatValue = defaultFormat,
  resetsAt,
  ...props
}: UsageMeterProps) => {
  const percent = Math.min(100, Math.round((used / total) * 100));
  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...props}>
      <div className="flex items-center justify-between">
        <SectionLabel>{label}</SectionLabel>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {percent}%
        </span>
      </div>
      <div className="h-1 rounded-sm bg-muted overflow-hidden">
        <div
          className="h-full bg-foreground transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>
          {formatValue(used)} / {formatValue(total)}
        </span>
        {resetsAt && <span>Resets {resetsAt}</span>}
      </div>
    </div>
  );
};

export type { UsageMeterProps };
export { UsageMeter };
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @raven/ui typecheck
git add packages/ui/src/components/usage-meter.tsx
git commit -m "feat: add UsageMeter primitive"
```

---

### Task 17: Create `Breadcrumb`

**Files:** `packages/ui/src/components/breadcrumb.tsx`

- [ ] **Step 1: Create file**

```tsx
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { cn } from "../cn";

interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  className?: string;
  segments: readonly BreadcrumbSegment[];
}

const Breadcrumb = ({ className, segments }: BreadcrumbProps): ReactNode => (
  <nav
    aria-label="Breadcrumb"
    className={cn("flex items-center gap-1.5 text-sm", className)}
  >
    {segments.map((segment, index) => {
      const isLast = index === segments.length - 1;
      return (
        <Fragment key={`${segment.label}-${index}`}>
          {index > 0 && (
            <span aria-hidden="true" className="text-border select-none">
              /
            </span>
          )}
          {segment.href && !isLast ? (
            <Link
              className="text-muted-foreground hover:text-foreground transition-colors"
              href={segment.href}
            >
              {segment.label}
            </Link>
          ) : (
            <span
              aria-current={isLast ? "page" : undefined}
              className={cn(
                isLast
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              {segment.label}
            </span>
          )}
        </Fragment>
      );
    })}
  </nav>
);

export type { BreadcrumbProps, BreadcrumbSegment };
export { Breadcrumb };
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @raven/ui typecheck
git add packages/ui/src/components/breadcrumb.tsx
git commit -m "feat: add Breadcrumb primitive"
```

---

### Task 18: Create `Sparkline`

**Files:** `packages/ui/src/components/sparkline.tsx`

- [ ] **Step 1: Create file**

```tsx
import { cn } from "../cn";

interface SparklineProps {
  className?: string;
  data: readonly number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
}

const Sparkline = ({
  className,
  data,
  width = 100,
  height = 28,
  strokeWidth = 1
}: SparklineProps) => {
  if (data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const pad = strokeWidth;
  const usableHeight = height - pad * 2;

  const points = data
    .map((value, index) => {
      const x = index * stepX;
      const y = pad + usableHeight - ((value - min) / range) * usableHeight;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      className={cn("text-muted-foreground", className)}
      height={height}
      preserveAspectRatio="none"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <polyline
        fill="none"
        points={points}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
};

export type { SparklineProps };
export { Sparkline };
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @raven/ui typecheck
git add packages/ui/src/components/sparkline.tsx
git commit -m "feat: add Sparkline primitive"
```

---

### Task 19: Create `MetricCard`

**Files:** `packages/ui/src/components/metric-card.tsx`

- [ ] **Step 1: Create file**

```tsx
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";
import { SectionLabel } from "./section-label";
import { Sparkline } from "./sparkline";

interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: string;
  sparkline?: readonly number[];
}

const MetricCard = ({
  className,
  label,
  value,
  unit,
  delta,
  sparkline,
  ...props
}: MetricCardProps) => (
  <div
    className={cn(
      "rounded-lg border border-border bg-card px-3.5 py-3",
      className
    )}
    {...props}
  >
    <SectionLabel>{label}</SectionLabel>
    <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums leading-none">
      {value}
      {unit && (
        <span className="ml-0.5 text-sm font-normal text-muted-foreground">
          {unit}
        </span>
      )}
    </div>
    {(sparkline || delta) && (
      <div className="mt-2.5 flex items-center gap-2">
        {sparkline && <Sparkline data={sparkline} width={60} height={16} />}
        {delta && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {delta}
          </span>
        )}
      </div>
    )}
  </div>
);

export type { MetricCardProps };
export { MetricCard };
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @raven/ui typecheck
git add packages/ui/src/components/metric-card.tsx
git commit -m "feat: add MetricCard primitive"
```

---

### Task 20: Create `LogStream`

**Files:** `packages/ui/src/components/log-stream.tsx`

Minimal overflow-based list, generic over row type. A virtualization library can be added later if needed.

- [ ] **Step 1: Create file**

```tsx
"use client";

import { memo, type ReactNode } from "react";
import { cn } from "../cn";

interface LogStreamProps<T> {
  className?: string;
  rows: readonly T[];
  rowKey: (row: T, index: number) => string;
  renderRow: (row: T, index: number) => ReactNode;
  maxHeight?: string;
  emptyState?: ReactNode;
}

const LogRow = memo(
  ({ children }: { children: ReactNode }): ReactNode => (
    <div className="px-3.5 py-2 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors font-mono text-[12px] leading-5">
      {children}
    </div>
  )
);
LogRow.displayName = "LogRow";

const LogStream = <T,>({
  className,
  rows,
  rowKey,
  renderRow,
  maxHeight = "480px",
  emptyState
}: LogStreamProps<T>): ReactNode => {
  if (rows.length === 0 && emptyState) {
    return <div className={cn("p-6", className)}>{emptyState}</div>;
  }
  return (
    <div
      className={cn(
        "overflow-auto border border-border rounded-lg bg-card",
        className
      )}
      style={{ maxHeight }}
    >
      {rows.map((row, index) => (
        <LogRow key={rowKey(row, index)}>{renderRow(row, index)}</LogRow>
      ))}
    </div>
  );
};

export type { LogStreamProps };
export { LogStream };
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @raven/ui typecheck
git add packages/ui/src/components/log-stream.tsx
git commit -m "feat: add LogStream primitive"
```

---

### Task 21: Create Command Palette (registry + component)

**Files:**
- Create: `apps/web/src/app/(dashboard)/components/command-registry.ts`
- Create: `apps/web/src/app/(dashboard)/components/command-palette.tsx`

- [ ] **Step 1: Write command-registry.ts**

```ts
import type { LucideIcon } from "lucide-react";

export interface CommandAction {
  readonly id: string;
  readonly title: string;
  readonly section: "Navigation" | "Theme" | "Actions" | "Admin";
  readonly icon: LucideIcon;
  readonly shortcut?: readonly string[];
  readonly href?: string;
  readonly run?: () => void;
}
```

- [ ] **Step 2: Write command-palette.tsx**

```tsx
"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Kbd } from "@raven/ui";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CommandAction } from "./command-registry";

interface CommandPaletteProps {
  actions: readonly CommandAction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const matchAction = (action: CommandAction, query: string): boolean => {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    action.title.toLowerCase().includes(q) ||
    action.section.toLowerCase().includes(q)
  );
};

const CommandPalette = ({
  actions,
  open,
  onOpenChange
}: CommandPaletteProps) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(
    () => actions.filter((a) => matchAction(a, query)),
    [actions, query]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const runAction = (action: CommandAction) => {
    onOpenChange(false);
    if (action.href) router.push(action.href);
    else action.run?.();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const action = filtered[activeIndex];
      if (action) runAction(action);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, CommandAction[]>();
    for (const action of filtered) {
      const list = map.get(action.section) ?? [];
      list.push(action);
      map.set(action.section, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  let flatIndex = 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-background/70 backdrop-blur-sm z-40" />
        <Dialog.Popup className="fixed left-1/2 top-[22%] -translate-x-1/2 z-50 w-[520px] max-w-[90vw] rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-3.5 h-11">
            <Search className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
            <input
              autoFocus
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type a command or search..."
              value={query}
            />
            <Kbd>Esc</Kbd>
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {grouped.length === 0 && (
              <div className="px-3.5 py-8 text-center text-sm text-muted-foreground">
                No results for &quot;{query}&quot;
              </div>
            )}
            {grouped.map(([section, items]) => (
              <div key={section}>
                <div className="px-3.5 pt-2 pb-1 text-[10px] uppercase tracking-[0.08em] font-medium text-muted-foreground">
                  {section}
                </div>
                {items.map((action) => {
                  const isActive = flatIndex === activeIndex;
                  const currentIndex = flatIndex++;
                  const Icon = action.icon;
                  return (
                    <button
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors ${
                        isActive
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      }`}
                      key={action.id}
                      onClick={() => runAction(action)}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      type="button"
                    >
                      <Icon className="size-3.5 shrink-0" strokeWidth={1.5} />
                      <span className="flex-1 truncate">{action.title}</span>
                      {action.shortcut && (
                        <span className="flex items-center gap-1">
                          {action.shortcut.map((k) => (
                            <Kbd key={k}>{k}</Kbd>
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export type { CommandPaletteProps };
export { CommandPalette };
```

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm --filter @raven/web typecheck
git add apps/web/src/app/\(dashboard\)/components/command-registry.ts apps/web/src/app/\(dashboard\)/components/command-palette.tsx
git commit -m "feat: add command palette (registry + component)"
```

---

### Task 22: Export all new primitives from `@raven/ui`

**Files:** `packages/ui/src/index.ts`

- [ ] **Step 1: Replace file**

```ts
export { cn } from "./cn";
export { Badge } from "./components/badge";
export { Breadcrumb, type BreadcrumbProps, type BreadcrumbSegment } from "./components/breadcrumb";
export { Button } from "./components/button";
export { ConfirmDialog } from "./components/dialog/confirm";
export { Modal } from "./components/dialog/modal";
export { EmptyState } from "./components/empty";
export { Checkbox } from "./components/form/checkbox";
export { Input } from "./components/form/input";
export { Select, type SelectOption } from "./components/form/select";
export { Switch } from "./components/form/switch";
export { Textarea } from "./components/form/textarea";
export { PageHeader } from "./components/header";
export { Kbd, type KbdProps } from "./components/kbd";
export { LogStream, type LogStreamProps } from "./components/log-stream";
export { RavenLogo } from "./components/logo";
export { MetricCard, type MetricCardProps } from "./components/metric-card";
export { NavGroup, type NavGroupProps, type NavItem } from "./components/nav-group";
export { SectionLabel, type SectionLabelProps } from "./components/section-label";
export { Sparkline, type SparklineProps } from "./components/sparkline";
export { Spinner } from "./components/spinner";
export { StatusDot, type StatusDotProps } from "./components/status-dot";
export { Tabs } from "./components/tab/line";
export { type PillTabOption, PillTabs } from "./components/tab/pill";
export { type Column, DataTable } from "./components/table";
export { Tooltip } from "./components/tooltip";
export { UsageMeter, type UsageMeterProps } from "./components/usage-meter";
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @raven/ui typecheck
pnpm --filter @raven/web typecheck
git add packages/ui/src/index.ts
git commit -m "feat: export new primitives from @raven/ui"
```

---

## Phase 4 · Shell

### Task 23: Rewrite `Sidebar`

**Files:** `apps/web/src/app/(dashboard)/components/sidebar.tsx`

- [ ] **Step 1: Replace file**

```tsx
"use client";

import { NavGroup, type NavItem, RavenLogo, UsageMeter } from "@raven/ui";
import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronsUpDown,
  Cpu,
  CreditCard,
  Key,
  LayoutDashboard,
  Menu,
  Network,
  Route,
  ScrollText,
  Search,
  Settings,
  Shield,
  SquareTerminal,
  Users,
  Webhook,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { UserMenu } from "./user-menu";

const OVERVIEW_ITEMS: readonly NavItem[] = [
  { href: "/overview", icon: LayoutDashboard, label: "Overview" }
];

const BUILD_ITEMS: readonly NavItem[] = [
  { href: "/chat", icon: SquareTerminal, label: "Playground" },
  { href: "/knowledge", icon: BookOpen, label: "Knowledge" },
  { href: "/models", icon: Cpu, label: "Models" },
  { href: "/routing", icon: Route, label: "Routing" },
  { href: "/guardrails", icon: Shield, label: "Guardrails" }
];

const MONITOR_ITEMS: readonly NavItem[] = [
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/requests", icon: Activity, label: "Requests" },
  { href: "/audit-logs", icon: ScrollText, label: "Audit Logs" }
];

const CONFIGURE_ITEMS: readonly NavItem[] = [
  { href: "/providers", icon: Network, label: "Providers" },
  { href: "/keys", icon: Key, label: "API Keys" },
  { href: "/budgets", icon: CreditCard, label: "Budgets" },
  { href: "/webhooks", icon: Webhook, label: "Webhooks" }
];

const ADMIN_ITEMS: readonly NavItem[] = [
  { href: "/users", icon: Users, label: "Users" },
  { href: "/settings", icon: Settings, label: "Instance Settings" }
];

const useLockBodyScroll = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLocked]);
};

interface SidebarProps {
  readonly user: {
    readonly name?: string | null;
    readonly email?: string | null;
  };
  readonly onOpenPalette: () => void;
}

const NavSections = ({
  pathname,
  isAdmin,
  collapsed
}: {
  pathname: string;
  isAdmin: boolean;
  collapsed?: boolean;
}) => (
  <>
    <NavGroup items={OVERVIEW_ITEMS} pathname={pathname} collapsed={collapsed} />
    <NavGroup
      label="Build"
      items={BUILD_ITEMS}
      pathname={pathname}
      collapsed={collapsed}
    />
    <NavGroup
      label="Monitor"
      items={MONITOR_ITEMS}
      pathname={pathname}
      collapsed={collapsed}
    />
    <NavGroup
      label="Configure"
      items={CONFIGURE_ITEMS}
      pathname={pathname}
      collapsed={collapsed}
    />
    {isAdmin && (
      <NavGroup
        label="Admin"
        items={ADMIN_ITEMS}
        pathname={pathname}
        collapsed={collapsed}
      />
    )}
  </>
);

export const Sidebar = ({ user, onOpenPalette }: SidebarProps) => {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  useLockBodyScroll(drawerOpen);

  return (
    <>
      <div className="flex md:hidden items-center justify-between border-b border-border bg-muted px-3.5 h-11">
        <div className="flex items-center gap-2">
          <RavenLogo className="size-5 text-foreground" />
          <span className="text-sm font-semibold">Raven</span>
        </div>
        <button
          aria-label="Open menu"
          className="flex items-center justify-center size-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => setDrawerOpen(true)}
          type="button"
        >
          <Menu className="size-4" strokeWidth={1.5} />
        </button>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              animate={{ opacity: 1 }}
              aria-hidden="true"
              className="fixed inset-0 bg-background/60 backdrop-blur-sm"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={closeDrawer}
              transition={{ duration: 0.15 }}
            />
            <motion.div
              animate={{ y: 0 }}
              aria-label="Navigation"
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-xl border-t border-border bg-muted shadow-lg"
              exit={{ y: "100%" }}
              initial={{ y: "100%" }}
              role="dialog"
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex justify-center py-2">
                <div className="h-1 w-8 rounded-full bg-border" />
              </div>
              <div className="flex items-center justify-between px-3.5 pb-2">
                <div className="flex items-center gap-2">
                  <RavenLogo className="size-5 text-foreground" />
                  <span className="font-semibold">Raven</span>
                </div>
                <button
                  aria-label="Close menu"
                  className="size-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={closeDrawer}
                  type="button"
                >
                  <X className="size-4" strokeWidth={1.5} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-1.5 pb-3">
                <NavSections pathname={pathname} isAdmin={!!isAdmin} />
              </nav>
              <UserMenu user={user} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <aside className="hidden md:flex w-60 border-r border-border bg-muted flex-col shrink-0 h-screen sticky top-0">
        <button
          className="flex items-center gap-2 px-3 h-12 border-b border-border hover:bg-accent/60 transition-colors"
          type="button"
        >
          <RavenLogo className="size-5 text-foreground shrink-0" />
          <span className="flex-1 text-left text-sm font-semibold text-foreground">
            Raven
          </span>
          <ChevronsUpDown
            className="size-3.5 text-muted-foreground"
            strokeWidth={1.5}
          />
        </button>

        <div className="px-2.5 pt-2.5 pb-1">
          <button
            className="w-full flex items-center gap-2 px-2.5 h-8 rounded-md border border-border bg-background text-muted-foreground text-sm hover:border-input transition-colors"
            onClick={onOpenPalette}
            type="button"
          >
            <Search className="size-3.5" strokeWidth={1.5} />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-sm border border-border bg-muted font-mono text-[10px] font-medium text-muted-foreground leading-none">
              ⌘K
            </kbd>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-1.5 pb-2">
          <NavSections pathname={pathname} isAdmin={!!isAdmin} />
        </nav>

        <div className="shrink-0 border-t border-border p-2.5 space-y-2.5">
          <UsageMeter
            label="Usage"
            used={640000}
            total={1000000}
            formatValue={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`)}
            resetsAt="Apr 30"
          />
          <UserMenu user={user} />
        </div>
      </aside>
    </>
  );
};
```

Note: The `used`/`total` values in `UsageMeter` are placeholder. Task 26 wires real usage data via the `Shell` component if a hook exists; otherwise leave the placeholder and open a follow-up issue.

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @raven/web typecheck
git add apps/web/src/app/\(dashboard\)/components/sidebar.tsx
git commit -m "feat: rewrite sidebar with grouped nav, search pill, and usage meter"
```

---

### Task 24: Retune `UserMenu`

**Files:** `apps/web/src/app/(dashboard)/components/user-menu.tsx`

- [ ] **Step 1: Read current file**

```bash
cat apps/web/src/app/\(dashboard\)/components/user-menu.tsx
```

- [ ] **Step 2: Replace the trigger row markup**

Wherever the component renders the clickable user row, replace its container with:

```tsx
<button
  type="button"
  className="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-accent/60 transition-colors text-left"
>
  <div className="size-6 rounded-full bg-accent flex items-center justify-center text-foreground text-[11px] font-medium shrink-0">
    {(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
  </div>
  <div className="flex-1 min-w-0">
    <div className="text-[12.5px] font-medium text-foreground truncate">
      {user.name ?? "User"}
    </div>
    <div className="text-[11px] text-muted-foreground truncate">
      {user.email ?? ""}
    </div>
  </div>
  <ChevronsUpDown className="size-3 text-muted-foreground shrink-0" strokeWidth={1.5} />
</button>
```

(Import `ChevronsUpDown` from `"lucide-react"`.) Keep any existing popover/menu logic.

- [ ] **Step 3: Restyle popover**

If the menu uses a popover, update its container to `"bg-popover border border-border rounded-lg shadow-md p-1"` and each menu item to `"flex items-center gap-2 px-2.5 h-8 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground"`.

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm --filter @raven/web typecheck
git add apps/web/src/app/\(dashboard\)/components/user-menu.tsx
git commit -m "refactor: retune UserMenu for new sidebar slot"
```

---

### Task 25: Create `TopBar`

**Files:** `apps/web/src/app/(dashboard)/components/top-bar.tsx`

- [ ] **Step 1: Inspect the theme store shape**

```bash
cat apps/web/src/stores/theme.ts
```

Note the exact selector names (for `theme` and `toggleTheme` / `setTheme`). Adjust the imports below if the names differ.

- [ ] **Step 2: Create top-bar.tsx**

```tsx
"use client";

import { Breadcrumb, type BreadcrumbSegment } from "@raven/ui";
import { CircleHelp, MessageSquare, Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/stores/theme";

interface TopBarProps {
  segments: readonly BreadcrumbSegment[];
}

const TopBar = ({ segments }: TopBarProps) => {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <div className="h-12 border-b border-border bg-background flex items-center gap-2 px-4">
      <Breadcrumb segments={segments} />
      <div className="flex-1" />
      <button
        className="h-7 inline-flex items-center gap-1.5 px-2.5 text-xs text-muted-foreground border border-border rounded-md hover:text-foreground hover:border-input transition-colors"
        type="button"
      >
        <MessageSquare className="size-3" strokeWidth={1.5} />
        Feedback
      </button>
      <button
        aria-label="Help"
        className="size-7 inline-flex items-center justify-center rounded-md text-muted-foreground border border-border hover:text-foreground hover:border-input transition-colors"
        type="button"
      >
        <CircleHelp className="size-3.5" strokeWidth={1.5} />
      </button>
      <button
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        className="size-7 inline-flex items-center justify-center rounded-md text-muted-foreground border border-border hover:text-foreground hover:border-input transition-colors"
        onClick={toggleTheme}
        type="button"
      >
        <Icon className="size-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
};

export type { TopBarProps };
export { TopBar };
```

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm --filter @raven/web typecheck
git add apps/web/src/app/\(dashboard\)/components/top-bar.tsx
git commit -m "feat: add TopBar with breadcrumb, feedback, help, theme toggle"
```

---

### Task 26: Wire `Shell` into `(dashboard)/layout.tsx`

**Files:**
- Create: `apps/web/src/app/(dashboard)/components/shell.tsx`
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Create shell.tsx**

```tsx
"use client";

import type { BreadcrumbSegment } from "@raven/ui";
import {
  Activity,
  BarChart3,
  BookOpen,
  Command as CommandIcon,
  Cpu,
  CreditCard,
  Key,
  LayoutDashboard,
  Moon,
  Network,
  Route,
  ScrollText,
  Shield,
  SquareTerminal,
  Sun,
  Webhook
} from "lucide-react";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useThemeStore } from "@/stores/theme";
import { CommandPalette } from "./command-palette";
import type { CommandAction } from "./command-registry";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

interface ShellProps {
  children: ReactNode;
  user: {
    readonly name?: string | null;
    readonly email?: string | null;
  };
}

const ROUTE_TITLES: Record<string, string> = {
  "/overview": "Overview",
  "/chat": "Playground",
  "/knowledge": "Knowledge",
  "/models": "Models",
  "/routing": "Routing",
  "/guardrails": "Guardrails",
  "/analytics": "Analytics",
  "/requests": "Requests",
  "/audit-logs": "Audit Logs",
  "/providers": "Providers",
  "/keys": "API Keys",
  "/budgets": "Budgets",
  "/webhooks": "Webhooks",
  "/profile": "Profile",
  "/users": "Users",
  "/settings": "Instance Settings"
};

const breadcrumbFor = (pathname: string): BreadcrumbSegment[] => {
  const base: BreadcrumbSegment = { label: "Raven", href: "/overview" };
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [base];
  const first = `/${segments[0]}`;
  const title = ROUTE_TITLES[first] ?? segments[0];
  return [base, { label: title }];
};

const Shell = ({ children, user }: ShellProps) => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const actions = useMemo<CommandAction[]>(() => {
    const nav: CommandAction[] = [
      { id: "nav-overview", title: "Overview", section: "Navigation", icon: LayoutDashboard, href: "/overview" },
      { id: "nav-playground", title: "Playground", section: "Navigation", icon: SquareTerminal, href: "/chat" },
      { id: "nav-knowledge", title: "Knowledge", section: "Navigation", icon: BookOpen, href: "/knowledge" },
      { id: "nav-models", title: "Models", section: "Navigation", icon: Cpu, href: "/models" },
      { id: "nav-routing", title: "Routing", section: "Navigation", icon: Route, href: "/routing" },
      { id: "nav-guardrails", title: "Guardrails", section: "Navigation", icon: Shield, href: "/guardrails" },
      { id: "nav-analytics", title: "Analytics", section: "Navigation", icon: BarChart3, href: "/analytics" },
      { id: "nav-requests", title: "Requests", section: "Navigation", icon: Activity, href: "/requests" },
      { id: "nav-audit", title: "Audit Logs", section: "Navigation", icon: ScrollText, href: "/audit-logs" },
      { id: "nav-providers", title: "Providers", section: "Navigation", icon: Network, href: "/providers" },
      { id: "nav-keys", title: "API Keys", section: "Navigation", icon: Key, href: "/keys" },
      { id: "nav-budgets", title: "Budgets", section: "Navigation", icon: CreditCard, href: "/budgets" },
      { id: "nav-webhooks", title: "Webhooks", section: "Navigation", icon: Webhook, href: "/webhooks" }
    ];
    const theme: CommandAction[] = [
      { id: "theme-toggle", title: "Toggle theme", section: "Theme", icon: Sun, run: toggleTheme },
      { id: "theme-dark", title: "Dark mode", section: "Theme", icon: Moon, run: () => setTheme("dark") },
      { id: "theme-light", title: "Light mode", section: "Theme", icon: Sun, run: () => setTheme("light") }
    ];
    const actionsList: CommandAction[] = [
      { id: "action-palette", title: "Open command palette", section: "Actions", icon: CommandIcon, shortcut: ["⌘", "K"], run: () => setPaletteOpen(true) }
    ];
    const admin: CommandAction[] = isAdmin
      ? [
          { id: "nav-users", title: "Users", section: "Admin", icon: Activity, href: "/users" },
          { id: "nav-settings", title: "Instance Settings", section: "Admin", icon: Activity, href: "/settings" }
        ]
      : [];
    return [...nav, ...theme, ...actionsList, ...admin];
  }, [isAdmin, setTheme, toggleTheme]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const segments = breadcrumbFor(pathname);

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} onOpenPalette={() => setPaletteOpen(true)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar segments={segments} />
        <main id="main-content" className="flex-1 min-w-0">
          {children}
        </main>
      </div>
      <CommandPalette
        actions={actions}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
      />
    </div>
  );
};

export { Shell };
```

If `useThemeStore` exposes different selector names, adjust `toggleTheme` / `setTheme` references accordingly. Everything else stays the same.

- [ ] **Step 2: Update `(dashboard)/layout.tsx` to use Shell**

Read the current file:

```bash
cat apps/web/src/app/\(dashboard\)/layout.tsx
```

Preserve all existing auth imports and calls. Replace the JSX body so it wraps `{children}` in `<Shell user={userShape}>`. Example:

```tsx
import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth-server";  // use the existing auth helper
import { Shell } from "./components/shell";

const DashboardLayout = async ({ children }: { children: ReactNode }) => {
  const session = await requireSession();
  const user = {
    name: session.user.name,
    email: session.user.email
  };
  return <Shell user={user}>{children}</Shell>;
};

export default DashboardLayout;
```

If the existing file uses a different auth helper (e.g. `getServerSession`, `auth()`), keep that helper and just swap in `<Shell user={...}>{children}</Shell>` as the return value.

- [ ] **Step 3: Typecheck + browser verify**

```bash
pnpm --filter @raven/web typecheck
pnpm --filter @raven/web dev
```

Open `http://localhost:3000/overview` and confirm:
- Sidebar renders with grouped nav (Overview / Build / Monitor / Configure)
- Top bar shows "Raven / Overview"
- `⌘K` opens palette
- Clicking a palette nav item navigates
- Theme toggle flips dark/light
- Refresh preserves theme (handled by the existing theme-init script)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/components/shell.tsx apps/web/src/app/\(dashboard\)/layout.tsx
git commit -m "feat: wire Shell (sidebar + top bar + command palette) into dashboard layout"
```

---

## Phase 5 · Flagship pages

### Task 27: Redesign Overview page

**Files:**
- Modify: `apps/web/src/app/(dashboard)/overview/page.tsx`
- Modify/trim: `apps/web/src/app/(dashboard)/overview/components/*`

Mockup: `.superpowers/brainstorm/68434-1775971975/content/flagship-pages.html` (top section).

- [ ] **Step 1: Inspect existing overview code**

```bash
ls apps/web/src/app/\(dashboard\)/overview/components/
cat apps/web/src/app/\(dashboard\)/overview/page.tsx
cat apps/web/src/app/\(dashboard\)/overview/hooks/*.ts 2>/dev/null
```

Identify the hooks providing totals + series for requests/tokens/latency/spend, and the provider status list. Keep the hook layer untouched — the redesign only changes presentation.

- [ ] **Step 2: Rewrite page.tsx**

```tsx
"use client";

import { MetricCard, PageHeader, PillTabs, StatusDot } from "@raven/ui";
import { useOverviewMetrics, useProviderStatus } from "./hooks";

const RANGE_OPTIONS = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" }
];

const OverviewPage = () => {
  const { metrics } = useOverviewMetrics();
  const { providers } = useProviderStatus();

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <PageHeader
        title="Overview"
        subtitle={metrics?.rangeLabel ?? "Last 7 days"}
        actions={<PillTabs options={RANGE_OPTIONS} defaultValue="7d" />}
      />

      <div className="grid grid-cols-4 gap-2.5 mb-6">
        <MetricCard
          label="Requests"
          value={metrics?.requests.display ?? "—"}
          delta={metrics?.requests.delta}
          sparkline={metrics?.requests.series}
        />
        <MetricCard
          label="Tokens"
          value={metrics?.tokens.display ?? "—"}
          delta={metrics?.tokens.delta}
          sparkline={metrics?.tokens.series}
        />
        <MetricCard
          label="p95 latency"
          value={metrics?.latencyP95.display ?? "—"}
          unit="ms"
          delta={metrics?.latencyP95.delta}
          sparkline={metrics?.latencyP95.series}
        />
        <MetricCard
          label="Spend"
          value={metrics?.spend.display ?? "—"}
          delta={metrics?.spend.delta}
          sparkline={metrics?.spend.series}
        />
      </div>

      <div className="grid grid-cols-[1.5fr_1fr] gap-2.5">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <div className="text-sm font-medium text-foreground">Request volume</div>
            <div className="text-xs text-muted-foreground mt-0.5">by model provider</div>
          </div>
          <div className="p-4 h-44">
            {/* Render the existing recharts component here if one exists. Pass monochrome colors:
                  fill: var(--color-foreground), var(--color-muted-foreground), var(--color-accent-foreground)
                  gridStroke: var(--color-border)
                  axisText: var(--color-muted-foreground), font-size 10px
             */}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border text-sm font-medium text-foreground">
            Provider status
          </div>
          <ul className="py-1">
            {(providers ?? []).map((p) => {
              const variant =
                p.status === "operational"
                  ? "filled"
                  : p.status === "degraded"
                    ? "striped"
                    : p.status === "pending"
                      ? "ring"
                      : "error";
              return (
                <li
                  className="flex items-center gap-2.5 px-4 py-2 text-sm"
                  key={p.name}
                >
                  <StatusDot variant={variant} label={p.status} />
                  <span className="flex-1 text-foreground">{p.name}</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {p.latencyMs}ms
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
```

Adapt the hook names and field shapes to what actually exists. If a field like `metrics.requests.display` doesn't exist, format it where you have access to the raw number (e.g. `metrics.requests.total.toLocaleString()`).

- [ ] **Step 3: Recolor any existing chart**

If an existing recharts chart is reused for the request-volume card, replace all color props with neutral tokens:
- Bar/line fill: `var(--color-foreground)`, `var(--color-muted-foreground)`, `var(--color-accent-foreground)` (stack order, darkest on top)
- Grid stroke: `var(--color-border)`
- Axis tick fill: `var(--color-muted-foreground)`, `fontSize: 10`
- Tooltip: `{ contentStyle: { background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 } }`

- [ ] **Step 4: Typecheck, browser verify, commit**

```bash
pnpm --filter @raven/web typecheck
```

Visit `/overview`, verify in both themes.

```bash
git add apps/web/src/app/\(dashboard\)/overview
git commit -m "feat: redesign Overview page (metric cards + provider status)"
```

---

### Task 28: Redesign Playground (Chat)

**Files:**
- Modify: `apps/web/src/app/(dashboard)/chat/page.tsx`
- Create/modify: `apps/web/src/app/(dashboard)/chat/components/{playground-header,config-pane,conversation,composer}.tsx`

Mockup: `.superpowers/brainstorm/68434-1775971975/content/playground.html`.

This is the showpiece. Keep all existing business logic untouched — only presentation changes.

- [ ] **Step 1: Survey the existing chat**

```bash
ls apps/web/src/app/\(dashboard\)/chat/components/
cat apps/web/src/app/\(dashboard\)/chat/page.tsx
```

Identify: which component renders messages, which is the composer, where the model/temperature/system-prompt/tools state lives, which hook triggers a run.

- [ ] **Step 2: Create playground-header.tsx**

```tsx
"use client";

import { Badge, Breadcrumb, Button } from "@raven/ui";

interface PlaygroundHeaderProps {
  promptName: string;
  isDraft: boolean;
  onCompare: () => void;
  onHistory: () => void;
  onSave: () => void;
}

const PlaygroundHeader = ({
  promptName,
  isDraft,
  onCompare,
  onHistory,
  onSave
}: PlaygroundHeaderProps) => (
  <div className="h-11 px-4 border-b border-border flex items-center gap-2">
    <Breadcrumb
      segments={[
        { label: "Playground", href: "/chat" },
        { label: promptName }
      ]}
    />
    {isDraft && (
      <Badge className="ml-1" variant="outline">
        Draft
      </Badge>
    )}
    <div className="flex-1" />
    <Button onClick={onCompare} size="sm" variant="secondary">
      Compare
    </Button>
    <Button onClick={onHistory} size="sm" variant="secondary">
      History
    </Button>
    <Button onClick={onSave} size="sm" variant="primary">
      Save
    </Button>
  </div>
);

export { PlaygroundHeader };
```

- [ ] **Step 3: Create config-pane.tsx**

```tsx
"use client";

import { SectionLabel, Textarea } from "@raven/ui";
import { ChevronDown } from "lucide-react";

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  context: string;
}

interface ToolInfo {
  id: string;
  name: string;
  enabled: boolean;
}

interface ConfigPaneProps {
  model: ModelInfo;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  tools: readonly ToolInfo[];
  onModelClick: () => void;
  onTemperatureChange: (v: number) => void;
  onMaxTokensChange: (v: number) => void;
  onSystemPromptChange: (v: string) => void;
  onAddTool: () => void;
}

const Slider = ({
  min,
  max,
  value,
  onChange
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) => (
  <input
    className="w-full h-[2px] bg-border rounded appearance-none accent-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-input"
    max={max}
    min={min}
    onChange={(e) => onChange(Number(e.target.value))}
    step={min < 1 ? 0.1 : 1}
    type="range"
    value={value}
  />
);

const ConfigPane = ({
  model,
  temperature,
  maxTokens,
  systemPrompt,
  tools,
  onModelClick,
  onTemperatureChange,
  onMaxTokensChange,
  onSystemPromptChange,
  onAddTool
}: ConfigPaneProps) => (
  <aside className="w-[340px] shrink-0 border-r border-border bg-muted overflow-y-auto">
    <div className="p-4 flex flex-col gap-5">
      <div>
        <SectionLabel className="mb-2">Model</SectionLabel>
        <button
          className="w-full flex items-center gap-2 px-2.5 h-9 rounded-md bg-background border border-input hover:border-ring transition-colors"
          onClick={onModelClick}
          type="button"
        >
          <div className="size-4 rounded-sm bg-foreground" />
          <span className="flex-1 text-left text-sm font-medium text-foreground truncate">
            {model.name}
          </span>
          <ChevronDown className="size-3 text-muted-foreground" strokeWidth={1.5} />
        </button>
        <div className="mt-1.5 text-[11px] text-muted-foreground">
          via {model.provider} · {model.context}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>Temperature</SectionLabel>
          <span className="text-[11px] text-foreground tabular-nums">
            {temperature.toFixed(1)}
          </span>
        </div>
        <Slider max={2} min={0} onChange={onTemperatureChange} value={temperature} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>Max tokens</SectionLabel>
          <span className="text-[11px] text-foreground tabular-nums">
            {maxTokens.toLocaleString()}
          </span>
        </div>
        <Slider max={8192} min={256} onChange={onMaxTokensChange} value={maxTokens} />
      </div>

      <div>
        <SectionLabel className="mb-2">System prompt</SectionLabel>
        <Textarea
          onChange={(e) => onSystemPromptChange(e.target.value)}
          placeholder="You are a helpful assistant..."
          value={systemPrompt}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>Tools</SectionLabel>
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={onAddTool}
            type="button"
          >
            + Add
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {tools.map((t) => (
            <div
              className="flex items-center gap-2 px-2 h-8 rounded-md border border-border"
              key={t.id}
            >
              <span className="flex-1 text-[12.5px] text-foreground">{t.name}</span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {t.enabled ? "enabled" : "disabled"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </aside>
);

export type { ConfigPaneProps, ModelInfo, ToolInfo };
export { ConfigPane };
```

- [ ] **Step 4: Create conversation.tsx**

```tsx
"use client";

import type { ReactNode } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: ReactNode;
  latencyMs?: number;
  tokens?: number;
}

interface ConversationProps {
  messages: readonly Message[];
  userInitial?: string;
  assistantInitial?: string;
}

const Conversation = ({
  messages,
  userInitial = "Y",
  assistantInitial = "C"
}: ConversationProps) => (
  <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
    {messages.map((msg) => {
      const isUser = msg.role === "user";
      const hasMeta = !isUser && (msg.latencyMs !== undefined || msg.tokens !== undefined);
      return (
        <div key={msg.id}>
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`size-5 rounded-sm flex items-center justify-center text-[10px] font-semibold ${
                isUser
                  ? "bg-accent text-foreground"
                  : "bg-foreground text-background"
              }`}
            >
              {isUser ? userInitial : assistantInitial}
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {isUser ? "User" : "Assistant"}
            </span>
            {hasMeta && (
              <span className="ml-auto text-[11px] text-muted-foreground font-mono tabular-nums">
                {msg.latencyMs !== undefined && `${msg.latencyMs}ms`}
                {msg.latencyMs !== undefined && msg.tokens !== undefined && " · "}
                {msg.tokens !== undefined && `${msg.tokens} tok`}
              </span>
            )}
          </div>
          <div className="pl-7 text-sm leading-relaxed text-foreground">
            {msg.content}
          </div>
        </div>
      );
    })}
  </div>
);

export type { Message, ConversationProps };
export { Conversation };
```

- [ ] **Step 5: Create composer.tsx**

```tsx
"use client";

import { Button } from "@raven/ui";
import { ArrowUp, Paperclip } from "lucide-react";
import { useRef, useState } from "react";

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const Composer = ({ onSend, disabled }: ComposerProps) => {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const send = () => {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
  };

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="rounded-lg border border-input bg-muted px-3 py-2.5 focus-within:border-ring transition-colors">
        <textarea
          className="w-full min-h-[36px] max-h-48 bg-transparent outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground leading-relaxed"
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Chat with your prompt..."
          ref={ref}
          value={value}
        />
        <div className="flex items-center mt-1">
          <button
            className="size-6 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
            type="button"
          >
            <Paperclip className="size-3.5" strokeWidth={1.5} />
          </button>
          <div className="flex-1" />
          <span className="text-[11px] text-muted-foreground mr-3">
            ⌘⏎ Send · ⇧⏎ newline
          </span>
          <Button disabled={disabled} onClick={send} size="sm">
            <ArrowUp className="size-3" strokeWidth={2} />
            Run
          </Button>
        </div>
      </div>
    </div>
  );
};

export type { ComposerProps };
export { Composer };
```

- [ ] **Step 6: Wire page.tsx**

Replace the page with a composition that reads from the existing state layer. The exact hook name/shape comes from Step 1. Sketch:

```tsx
"use client";

import { usePlaygroundState } from "./hooks/use-playground-state";
import { Composer } from "./components/composer";
import { ConfigPane } from "./components/config-pane";
import { Conversation } from "./components/conversation";
import { PlaygroundHeader } from "./components/playground-header";

const ChatPage = () => {
  const state = usePlaygroundState();
  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      <PlaygroundHeader
        isDraft={state.isDraft}
        onCompare={state.onCompare}
        onHistory={state.onHistory}
        onSave={state.onSave}
        promptName={state.promptName}
      />
      <div className="flex-1 grid grid-cols-[340px_1fr] min-h-0">
        <ConfigPane
          maxTokens={state.maxTokens}
          model={state.model}
          onAddTool={state.openAddTool}
          onMaxTokensChange={state.setMaxTokens}
          onModelClick={state.openModelPicker}
          onSystemPromptChange={state.setSystemPrompt}
          onTemperatureChange={state.setTemperature}
          systemPrompt={state.systemPrompt}
          temperature={state.temperature}
          tools={state.tools}
        />
        <div className="flex flex-col min-w-0">
          <Conversation messages={state.messages} />
          <Composer disabled={state.isRunning} onSend={state.sendMessage} />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
```

If `usePlaygroundState` does not exist, create a new hook file at `hooks/use-playground-state.ts` that wraps the existing state access (stores, hooks, API calls) from the current page. Do not rewrite the underlying state logic — just consolidate access.

- [ ] **Step 7: Typecheck, browser verify, commit**

```bash
pnpm --filter @raven/web typecheck
```

Browser: `/chat`. Verify split pane, sliders update, system prompt textarea works, `⌘⏎` runs a message, messages render with user/assistant avatars and mono meta on right.

```bash
git add apps/web/src/app/\(dashboard\)/chat
git commit -m "feat: redesign Playground with OpenAI-style split pane"
```

---

### Task 29: Redesign Knowledge collection detail

**Files:**
- Modify: `apps/web/src/app/(dashboard)/knowledge/[id]/page.tsx`
- Create/modify: `apps/web/src/app/(dashboard)/knowledge/[id]/components/{collection-header,chunks-explorer}.tsx`

Mockup: `.superpowers/brainstorm/68434-1775971975/content/flagship-pages.html` (middle section).

- [ ] **Step 1: Inspect existing collection page**

```bash
ls apps/web/src/app/\(dashboard\)/knowledge/\[id\]/
cat apps/web/src/app/\(dashboard\)/knowledge/\[id\]/page.tsx
```

- [ ] **Step 2: Create collection-header.tsx**

```tsx
"use client";

import { Badge, Button } from "@raven/ui";
import { BookOpen, Settings, Upload } from "lucide-react";

interface CollectionStats {
  chunks: number;
  files: number;
  tokens: string;
  size: string;
}

interface CollectionHeaderProps {
  name: string;
  id: string;
  stats: CollectionStats;
  onSettings: () => void;
  onUpload: () => void;
}

const CollectionHeader = ({
  name,
  id,
  stats,
  onSettings,
  onUpload
}: CollectionHeaderProps) => (
  <div className="px-6 py-4 border-b border-border flex items-center gap-3">
    <div className="size-9 rounded-lg bg-accent flex items-center justify-center text-foreground">
      <BookOpen className="size-4" strokeWidth={1.5} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {name}
        </h1>
        <Badge mono variant="outline">
          {id}
        </Badge>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground tabular-nums">
        <span>
          <strong className="text-foreground">
            {stats.chunks.toLocaleString()}
          </strong>{" "}
          chunks
        </span>
        <span>
          <strong className="text-foreground">{stats.files}</strong> files
        </span>
        <span>
          <strong className="text-foreground">{stats.tokens}</strong> tokens
        </span>
        <span>
          <strong className="text-foreground">{stats.size}</strong>
        </span>
      </div>
    </div>
    <Button onClick={onSettings} size="md" variant="secondary">
      <Settings className="size-3.5" strokeWidth={1.5} />
      Settings
    </Button>
    <Button onClick={onUpload} size="md">
      <Upload className="size-3.5" strokeWidth={1.5} />
      Upload
    </Button>
  </div>
);

export type { CollectionHeaderProps, CollectionStats };
export { CollectionHeader };
```

- [ ] **Step 3: Create chunks-explorer.tsx**

```tsx
"use client";

import { Input } from "@raven/ui";
import { useState } from "react";

interface Chunk {
  id: string;
  filename: string;
  tokens: number;
  preview: string;
}

interface FileInfo {
  filename: string;
  size: string;
  chunkCount: number;
  preview: string;
}

interface ChunksExplorerProps {
  chunks: readonly Chunk[];
  getFileInfo: (filename: string) => FileInfo | undefined;
}

const ChunksExplorer = ({ chunks, getFileInfo }: ChunksExplorerProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    chunks[0]?.id ?? null
  );
  const [filter, setFilter] = useState("");

  const filtered = chunks.filter((c) =>
    filter
      ? c.preview.toLowerCase().includes(filter.toLowerCase()) ||
        c.filename.toLowerCase().includes(filter.toLowerCase())
      : true
  );
  const selected = chunks.find((c) => c.id === selectedId);
  const fileInfo = selected ? getFileInfo(selected.filename) : undefined;

  return (
    <div className="grid grid-cols-[1fr_380px] min-h-[480px]">
      <div className="border-r border-border">
        <div className="px-4 py-2.5 border-b border-border">
          <Input
            className="h-7"
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter chunks..."
            value={filter}
          />
        </div>
        <ul>
          {filtered.map((c) => {
            const isActive = c.id === selectedId;
            return (
              <li
                className={`px-5 py-3 border-b border-border cursor-pointer transition-colors ${
                  isActive ? "bg-accent" : "hover:bg-accent/60"
                }`}
                key={c.id}
                onClick={() => setSelectedId(c.id)}
              >
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span className="font-mono">
                    #{c.id} · {c.filename}
                  </span>
                  <span className="tabular-nums">{c.tokens} tok</span>
                </div>
                <div
                  className={`text-sm leading-relaxed line-clamp-2 ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {c.preview}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <aside className="p-4 bg-muted">
        {selected && fileInfo ? (
          <>
            <div className="text-[10px] uppercase tracking-[0.08em] font-medium text-muted-foreground mb-2">
              Source file
            </div>
            <div className="font-mono text-[12px] text-foreground mb-3">
              {fileInfo.filename}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-2.5 rounded-md border border-border">
                <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Size
                </div>
                <div className="text-sm font-medium text-foreground mt-0.5 tabular-nums">
                  {fileInfo.size}
                </div>
              </div>
              <div className="p-2.5 rounded-md border border-border">
                <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Chunks
                </div>
                <div className="text-sm font-medium text-foreground mt-0.5 tabular-nums">
                  {fileInfo.chunkCount}
                </div>
              </div>
            </div>
            <div className="text-[10px] uppercase tracking-[0.08em] font-medium text-muted-foreground mb-2">
              Preview
            </div>
            <div className="relative p-3 rounded-md bg-background border border-border font-mono text-[11px] text-muted-foreground leading-relaxed max-h-40 overflow-hidden">
              {fileInfo.preview}
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent" />
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Select a chunk</div>
        )}
      </aside>
    </div>
  );
};

export type { Chunk, FileInfo, ChunksExplorerProps };
export { ChunksExplorer };
```

- [ ] **Step 4: Wire page.tsx**

Compose:
- `<CollectionHeader>` with stats from the existing collection hook
- `<Tabs>` (Line) with labels `Chunks`, `Files`, `Playground`, `Analytics`, `Jobs` — preserve the existing tab routing approach
- For the Chunks tab body: `<ChunksExplorer>` with the current chunks + file-info hooks

Do not rewrite the existing routing or hook layer. Only change presentation.

- [ ] **Step 5: Typecheck + browser verify + commit**

```bash
pnpm --filter @raven/web typecheck
```

Visit `/knowledge/<some-id>`, verify header, tabs switch, chunk selection highlights and updates the file drawer.

```bash
git add apps/web/src/app/\(dashboard\)/knowledge
git commit -m "feat: redesign Knowledge collection detail (header + chunk explorer)"
```

---

### Task 30: Redesign Analytics

**Files:**
- Modify: `apps/web/src/app/(dashboard)/analytics/page.tsx`
- Create: `apps/web/src/app/(dashboard)/analytics/components/metric-tile.tsx`

Mockup: `.superpowers/brainstorm/68434-1775971975/content/flagship-pages.html` (bottom section).

- [ ] **Step 1: Inspect analytics**

```bash
ls apps/web/src/app/\(dashboard\)/analytics/components/
cat apps/web/src/app/\(dashboard\)/analytics/page.tsx
```

Identify the hook(s) that return the 8 metric values + 24h volume series.

- [ ] **Step 2: Create metric-tile.tsx**

```tsx
import { Sparkline } from "@raven/ui";

interface MetricTileProps {
  label: string;
  value: string;
  unit?: string;
  series: readonly number[];
}

const MetricTile = ({ label, value, unit, series }: MetricTileProps) => (
  <div className="bg-background px-4 py-3.5">
    <div className="text-[11px] text-muted-foreground mb-2">{label}</div>
    <div className="text-xl font-semibold tracking-tight text-foreground tabular-nums mb-2">
      {value}
      {unit && (
        <span className="ml-0.5 text-xs font-normal text-muted-foreground">
          {unit}
        </span>
      )}
    </div>
    <Sparkline data={series} height={24} strokeWidth={1} width={120} />
  </div>
);

export type { MetricTileProps };
export { MetricTile };
```

- [ ] **Step 3: Rewrite page.tsx**

```tsx
"use client";

import { Button, PageHeader } from "@raven/ui";
import { useAnalyticsMetrics } from "./hooks";
import { MetricTile } from "./components/metric-tile";

const AnalyticsPage = () => {
  const { tiles, chartSeries, peak } = useAnalyticsMetrics();

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="p-6 pb-4">
        <PageHeader
          actions={
            <div className="flex gap-2">
              <Button size="sm" variant="secondary">
                All providers
              </Button>
              <Button size="sm" variant="secondary">
                Last 24h
              </Button>
            </div>
          }
          title="Analytics"
        />
      </div>

      <div className="grid grid-cols-4 gap-px bg-border border-y border-border">
        {tiles.map((tile) => (
          <MetricTile key={tile.label} {...tile} />
        ))}
      </div>

      <div className="p-6">
        <div className="flex items-baseline justify-between mb-3">
          <div className="text-sm font-medium text-foreground">
            Request volume · 24h
          </div>
          {peak && (
            <div className="text-[11px] text-muted-foreground tabular-nums">
              Peak: {peak.value} at {peak.time}
            </div>
          )}
        </div>
        <div className="h-40">
          {/* Existing recharts AreaChart, recolored to:
              - stroke: var(--color-foreground)
              - fill: var(--color-accent)
              - grid stroke: var(--color-border)
              - axis text: var(--color-muted-foreground), fontSize 10 */}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
```

Adapt `useAnalyticsMetrics` to the actual hook. If the hook returns raw numbers, format them in the page (or in the hook — either fine) to the string the tile needs (e.g., `"1,284"`, `"184"` with unit `"ms"`, `"34.2"` with unit `"%"`).

- [ ] **Step 4: Typecheck, browser verify, commit**

```bash
pnpm --filter @raven/web typecheck
```

Visit `/analytics`, verify 8-tile grid + 24h chart, both themes.

```bash
git add apps/web/src/app/\(dashboard\)/analytics
git commit -m "feat: redesign Analytics with dense metric grid"
```

---

## Phase 6 · Verification and cleanup

### Task 31: Sweep non-flagship pages

Visit each in both light and dark modes:
- `/providers`
- `/keys`
- `/models`
- `/routing`
- `/guardrails`
- `/requests`
- `/budgets`
- `/audit-logs`
- `/webhooks`
- `/profile`
- `/users` (if admin)
- `/settings` (if admin)

- [ ] **Step 1: Boot dev**

```bash
pnpm --filter @raven/web dev
```

- [ ] **Step 2: Walk the list**

For each route:
- No colored badges (green/red/amber) — if any appear, find the caller and switch to `outline`/`solid`/`subtle`.
- No Outfit font lingering — everything should be Geist.
- Layouts don't overflow or collapse.
- Focus rings + hover states still work.

Fix only regressions introduced by token changes. Do not redesign these pages here.

- [ ] **Step 3: Commit any fixes**

```bash
git add apps/web/src
git commit -m "fix: address non-flagship page regressions from token migration"
```

Skip if no fixes were needed.

---

### Task 32: Documentation updates

**Files:** `apps/docs/content/docs/**/*.mdx`

- [ ] **Step 1: Find doc pages that describe UI**

```bash
git grep -ln "shadcn\|Outfit\|theme color\|dashboard" apps/docs/content/docs/ | head -20
```

- [ ] **Step 2: Update any user-facing references**

If docs describe UI (dashboard, command palette, theme switcher), update them to reflect:
- Monochromatic design
- Geist typography
- Command palette (⌘K)
- Grouped sidebar (Overview / Build / Monitor / Configure)

Skip this step if no such pages exist.

- [ ] **Step 3: Commit**

```bash
git add apps/docs
git commit -m "docs: update UI references for redesign"
```

Skip if no changes.

---

### Task 33: Final typecheck, lint, and smoke test

- [ ] **Step 1: Workspace typecheck**

```bash
pnpm --filter @raven/ui typecheck
pnpm --filter @raven/web typecheck
```

Expected: zero errors.

- [ ] **Step 2: Lint**

```bash
pnpm --filter @raven/web lint
```

Biome auto-formats on write. If it adjusts formatting, accept and commit:

```bash
git add .
git commit -m "chore: apply biome formatting"
```

- [ ] **Step 3: Final browser smoke test**

```bash
pnpm --filter @raven/web dev
```

Walk the flagship pages in both themes:
- `/overview`
- `/chat`
- `/knowledge/<existing-collection-id>`
- `/analytics`

Verify success criteria from the spec:
- All pages render only neutral colors
- Outfit is gone; Geist is used
- Flagship pages match mockups
- Non-flagship pages still work
- `⌘K` opens palette on every page
- Light + dark parity — no contrast issues

---

## Self-review

**Spec coverage:**
- Dark + light parity, neutral-only palette: Task 3 ✓
- Geist typography swap: Tasks 1–3 ✓
- Primitive retune (Button, Badge, Spinner, Tooltip, form/*, Tabs, Modal, DataTable, PageHeader/Empty/Logo): Tasks 4–11 ✓
- New primitives (Kbd, StatusDot, SectionLabel, NavGroup, UsageMeter, Breadcrumb, Sparkline, MetricCard, LogStream): Tasks 12–20 ✓
- Command palette (registry + component): Task 21 ✓
- `@raven/ui` exports: Task 22 ✓
- Shell (sidebar + top bar + palette wiring + ⌘K): Tasks 23–26 ✓
- Flagship pages: Overview (27), Playground (28), Knowledge (29), Analytics (30)
- Non-flagship regression sweep: Task 31 ✓
- Docs: Task 32 ✓
- Final verification: Task 33 ✓

**Placeholder scan:** All code blocks contain concrete implementations. Hook adapters in flagship-page tasks are called out explicitly ("adapt to existing hook") because the hook shapes are project-specific — the executor inspects the current file in Step 1 of each page task and adjusts names only.

**Type consistency:**
- `NavItem` defined in Task 15, reused in Task 23 via `@raven/ui` import.
- `BreadcrumbSegment` defined in Task 17, imported in Tasks 25 and 26.
- `CommandAction` defined in Task 21, imported in Task 26.
- `MetricCardProps`, `SparklineProps`, `UsageMeterProps` have single definitions in Tasks 19, 18, 16.
- Button variants (`primary`, `secondary`, `ghost`, `destructive`) match across Task 4 and all downstream usage.
- Badge variants (`outline`, `solid`, `subtle`) are consistent in Task 5 and all callers.

## References

- Spec: `docs/superpowers/specs/2026-04-12-ui-redesign-monochromatic-vercel-design.md`
- Mockups: `.superpowers/brainstorm/68434-1775971975/content/*.html`
- Vercel Geist design system: https://vercel.com/geist
- `geist` font package: https://www.npmjs.com/package/geist
