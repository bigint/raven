# Modular Refactor & Design Polish — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Raven platform into modular, scalable components with a proper design system, TanStack Query data fetching, backend hardening, and visual polish with dark mode.

**Architecture:** Phase 0 builds the shared foundation (component library, design tokens, TanStack Query, API envelope). Phase 1 dispatches 8 parallel agents in isolated git worktrees to decompose pages, harden backend, and polish design. Phase 2 integrates and reviews.

**Tech Stack:** Next.js 15, Hono, Drizzle ORM, TanStack Query, Framer Motion, Base UI, CVA, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-03-12-modular-refactor-design.md`

---

## Chunk 1: Phase 0 — Dependencies & Design Tokens

### Task 1: Add workspace dependencies

**Files:**
- Modify: `apps/web/package.json`
- Modify: `packages/ui/package.json`

- [ ] **Step 1: Add `@raven/ui` as dependency of `@raven/web`**

In `apps/web/package.json`, add to `dependencies`:
```json
"@raven/ui": "workspace:*"
```

- [ ] **Step 2: Add Base UI and Framer Motion to `@raven/ui`**

In `packages/ui/package.json`, add to `dependencies`:
```json
"@base-ui-components/react": "^1.0.0",
"motion": "^12.0.0"
```

Also move `react` from `dependencies` to `peerDependencies` to avoid duplicate React instances:
```json
"peerDependencies": {
  "react": "^19.0.0"
}
```

- [ ] **Step 3: Add Framer Motion to `@raven/web`**

In `apps/web/package.json`, add to `dependencies`:
```json
"motion": "^12.0.0"
```

- [ ] **Step 4: Install all dependencies**

Run: `pnpm install`
Expected: Clean install with no peer dependency errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json packages/ui/package.json pnpm-lock.yaml
git commit -m "feat: add @raven/ui, base-ui, and framer motion dependencies"
```

---

### Task 2: Extend design tokens

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Add extended tokens and dark mode to `globals.css`**

Replace the full `globals.css` with:

```css
@import "tailwindcss";

@source "../**/*.tsx";

@theme {
  /* Light mode (default) */
  --color-background: #ffffff;
  --color-foreground: #0a0a0a;
  --color-popover: #ffffff;
  --color-popover-foreground: #0a0a0a;
  --color-primary: #0a0a0a;
  --color-primary-foreground: #fafafa;
  --color-muted: #f5f5f5;
  --color-muted-foreground: #737373;
  --color-border: #e5e5e5;
  --color-input: #e5e5e5;
  --color-ring: #0a0a0a;
  --color-accent: #f5f5f5;
  --color-accent-foreground: #171717;
  --color-destructive: #ef4444;
  --color-destructive-foreground: #ffffff;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-warning-foreground: #ffffff;
  --color-info: #3b82f6;
  --color-info-foreground: #ffffff;
  --color-card: #ffffff;
  --color-card-foreground: #0a0a0a;
  --color-surface: #fafafa;

  /* Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;

  /* Shadows */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.03);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07);

  /* Animation */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}

body {
  font-feature-settings:
    "rlig" 1,
    "calt" 1;
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

@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #09090b;
    --color-foreground: #fafafa;
    --color-popover: #0a0a0a;
    --color-popover-foreground: #fafafa;
    --color-primary: #fafafa;
    --color-primary-foreground: #0a0a0a;
    --color-muted: #1a1a1a;
    --color-muted-foreground: #a3a3a3;
    --color-border: #262626;
    --color-input: #262626;
    --color-ring: #d4d4d4;
    --color-accent: #1a1a1a;
    --color-accent-foreground: #fafafa;
    --color-destructive: #dc2626;
    --color-destructive-foreground: #ffffff;
    --color-success: #16a34a;
    --color-warning: #d97706;
    --color-warning-foreground: #ffffff;
    --color-info: #2563eb;
    --color-info-foreground: #ffffff;
    --color-card: #0a0a0a;
    --color-card-foreground: #fafafa;
    --color-surface: #111111;
  }
}
```

- [ ] **Step 2: Fix hardcoded colors in root layout**

In `apps/web/src/app/layout.tsx`, change:
```tsx
className={`${outfit.className} min-h-screen bg-white text-neutral-900 antialiased`}
```
to:
```tsx
className={`${outfit.className} min-h-screen bg-background text-foreground antialiased`}
```

- [ ] **Step 3: Verify the app renders**

Run: `pnpm dev:web`
Expected: App loads at http://localhost:3000 with no CSS errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/globals.css apps/web/src/app/layout.tsx
git commit -m "feat: extend design tokens with dark mode, shadows, and animation values"
```

---

### Task 3: Build `@raven/ui` core components — Button, Spinner, Badge, Avatar

**Files:**
- Create: `packages/ui/src/components/button.tsx`
- Create: `packages/ui/src/components/spinner.tsx`
- Create: `packages/ui/src/components/badge.tsx`
- Create: `packages/ui/src/components/avatar.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Create Button component**

```tsx
// packages/ui/src/components/button.tsx
"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-medium transition-all duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:opacity-90",
        secondary: "border border-border bg-background text-foreground hover:bg-accent",
        destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
        ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4",
        lg: "h-10 px-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
export type { ButtonProps };
```

- [ ] **Step 2: Create Spinner component**

```tsx
// packages/ui/src/components/spinner.tsx
import { cn } from "../cn";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
};

const Spinner = ({ className, size = "md" }: SpinnerProps) => (
  <div
    className={cn(
      "animate-spin rounded-full border-2 border-muted-foreground border-t-transparent",
      sizeMap[size],
      className
    )}
    role="status"
    aria-label="Loading"
  />
);

export { Spinner };
export type { SpinnerProps };
```

- [ ] **Step 3: Create Badge component**

```tsx
// packages/ui/src/components/badge.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        error: "bg-destructive/10 text-destructive",
        info: "bg-info/10 text-info",
        primary: "bg-primary/10 text-primary",
      },
      dot: {
        true: "",
        false: "",
      },
    },
    defaultVariants: {
      variant: "neutral",
      dot: false,
    },
  }
);

const dotColorMap: Record<string, string> = {
  neutral: "bg-muted-foreground",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
  info: "bg-info",
  primary: "bg-primary",
};

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

const Badge = ({ className, variant, dot, children, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant, dot, className }))} {...props}>
    {dot && (
      <span
        className={cn(
          "size-1.5 rounded-full",
          dotColorMap[variant ?? "neutral"]
        )}
      />
    )}
    {children}
  </span>
);

export { Badge, badgeVariants };
export type { BadgeProps };
```

- [ ] **Step 4: Create Avatar component**

```tsx
// packages/ui/src/components/avatar.tsx
import { cn } from "../cn";

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "size-7 text-xs",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
};

const Avatar = ({ name, src, size = "md", className }: AvatarProps) => {
  const initials = name?.charAt(0)?.toUpperCase() ?? "?";

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? "Avatar"}
        className={cn("rounded-full object-cover", sizeMap[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary/10 font-medium",
        sizeMap[size],
        className
      )}
    >
      {initials}
    </div>
  );
};

export { Avatar };
export type { AvatarProps };
```

- [ ] **Step 5: Export all components from index**

Update `packages/ui/src/index.ts`:
```tsx
export { cn } from "./cn";
export { Button, buttonVariants, type ButtonProps } from "./components/button";
export { Spinner, type SpinnerProps } from "./components/spinner";
export { Badge, badgeVariants, type BadgeProps } from "./components/badge";
export { Avatar, type AvatarProps } from "./components/avatar";
```

- [ ] **Step 6: Type check**

Run: `cd packages/ui && pnpm typecheck`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/
git commit -m "feat: add Button, Spinner, Badge, Avatar components to @raven/ui"
```

---

### Task 4: Build `@raven/ui` — Input, Textarea, Switch, PageHeader

**Files:**
- Create: `packages/ui/src/components/input.tsx`
- Create: `packages/ui/src/components/textarea.tsx`
- Create: `packages/ui/src/components/switch.tsx`
- Create: `packages/ui/src/components/page-header.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Create Input component**

```tsx
// packages/ui/src/components/input.tsx
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  description?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, description, id, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        className={cn(
          "w-full rounded-[var(--radius-md)] border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
          error && "border-destructive focus:ring-destructive",
          className
        )}
        id={id}
        ref={ref}
        {...props}
      />
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";

export { Input };
export type { InputProps };
```

- [ ] **Step 2: Create Textarea component**

```tsx
// packages/ui/src/components/textarea.tsx
import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
  description?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, description, id, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium" htmlFor={id}>
          {label}
        </label>
      )}
      <textarea
        className={cn(
          "w-full rounded-[var(--radius-md)] border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-y",
          error && "border-destructive focus:ring-destructive",
          className
        )}
        id={id}
        ref={ref}
        {...props}
      />
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
export type { TextareaProps };
```

- [ ] **Step 3: Create Switch component**

```tsx
// packages/ui/src/components/switch.tsx
"use client";

import { cn } from "../cn";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const Switch = ({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className,
}: SwitchProps) => (
  <div className={cn("flex items-center gap-3", className)}>
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted"
      )}
      type="button"
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform duration-[var(--duration-fast)]",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
    {label && <span className="text-sm">{label}</span>}
  </div>
);

export { Switch };
export type { SwitchProps };
```

- [ ] **Step 3: Create PageHeader component**

```tsx
// packages/ui/src/components/page-header.tsx
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <div className="mb-8 flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export { PageHeader };
export type { PageHeaderProps };
```

- [ ] **Step 5: Update index exports**

Append to `packages/ui/src/index.ts`:
```tsx
export { Input, type InputProps } from "./components/input";
export { Textarea, type TextareaProps } from "./components/textarea";
export { Switch, type SwitchProps } from "./components/switch";
export { PageHeader, type PageHeaderProps } from "./components/page-header";
```

- [ ] **Step 6: Type check**

Run: `cd packages/ui && pnpm typecheck`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/
git commit -m "feat: add Input, Textarea, Switch, PageHeader components to @raven/ui"
```

---

### Task 5: Build `@raven/ui` — Modal, ConfirmDialog, EmptyState

**Files:**
- Create: `packages/ui/src/components/modal.tsx`
- Create: `packages/ui/src/components/confirm-dialog.tsx`
- Create: `packages/ui/src/components/empty-state.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Create Modal component using Base UI Dialog + Framer Motion**

Uses Base UI's `Dialog` for accessibility (focus trap, ARIA roles, escape-to-close) and Framer Motion for enter/exit animations.

```tsx
// packages/ui/src/components/modal.tsx
"use client";

import { Dialog } from "@base-ui-components/react/dialog";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "../cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

const Modal = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: ModalProps) => (
  <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
    <AnimatePresence>
      {open && (
        <Dialog.Portal>
          <Dialog.Backdrop
            render={
              <motion.div
                className="fixed inset-0 z-50 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            }
          />
          <Dialog.Popup
            render={
              <motion.div
                className={cn(
                  "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background shadow-xl",
                  sizeMap[size]
                )}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              />
            }
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <Dialog.Title className="text-base font-semibold">
                {title}
              </Dialog.Title>
              <Dialog.Close className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Dialog.Close>
            </div>
            <div className="px-6 py-5">{children}</div>
            {footer && (
              <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
                {footer}
              </div>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      )}
    </AnimatePresence>
  </Dialog.Root>
);

export { Modal };
export type { ModalProps };
```

- [ ] **Step 2: Create ConfirmDialog component**

```tsx
// packages/ui/src/components/confirm-dialog.tsx
"use client";

import { Modal } from "./modal";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  variant?: "destructive" | "primary";
}

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  loading = false,
  variant = "destructive",
}: ConfirmDialogProps) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    size="sm"
    footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant={variant}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? "Processing..." : confirmLabel}
        </Button>
      </>
    }
  >
    <p className="text-sm text-muted-foreground">{description}</p>
  </Modal>
);

export { ConfirmDialog };
export type { ConfirmDialogProps };
```

- [ ] **Step 3: Create EmptyState component**

```tsx
// packages/ui/src/components/empty-state.tsx
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <div className="rounded-xl border border-border p-12 text-center">
    {icon && (
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
    )}
    <p className="font-medium text-foreground">{title}</p>
    {description && (
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export { EmptyState };
export type { EmptyStateProps };
```

- [ ] **Step 4: Update index exports**

Append to `packages/ui/src/index.ts`:
```tsx
export { Modal, type ModalProps } from "./components/modal";
export { ConfirmDialog, type ConfirmDialogProps } from "./components/confirm-dialog";
export { EmptyState, type EmptyStateProps } from "./components/empty-state";
```

- [ ] **Step 5: Type check**

Run: `cd packages/ui && pnpm typecheck`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/
git commit -m "feat: add Modal, ConfirmDialog, EmptyState components to @raven/ui"
```

---

### Task 6: Build `@raven/ui` — DataTable, Tabs, Select

**Files:**
- Create: `packages/ui/src/components/data-table.tsx`
- Create: `packages/ui/src/components/tabs.tsx`
- Create: `packages/ui/src/components/select.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Create DataTable component**

```tsx
// packages/ui/src/components/data-table.tsx
"use client";

import type { ReactNode } from "react";
import { cn } from "../cn";
import { Spinner } from "./spinner";
import { EmptyState } from "./empty-state";

interface Column<T> {
  key: string;
  header: string;
  className?: string;
  headerClassName?: string;
  render: (item: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  loadingMessage?: string;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyAction?: ReactNode;
}

const DataTable = <T,>({
  columns,
  data,
  keyExtractor,
  loading = false,
  loadingMessage = "Loading...",
  emptyIcon,
  emptyTitle = "No data",
  emptyAction,
}: DataTableProps<T>) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-border p-12 text-center">
        <Spinner className="mx-auto" />
        <p className="mt-3 text-sm text-muted-foreground">{loadingMessage}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground",
                  col.headerClassName
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr
              key={keyExtractor(item)}
              className={cn(
                "transition-colors hover:bg-muted/30",
                idx !== data.length - 1 && "border-b border-border"
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn("px-5 py-4", col.className)}>
                  {col.render(item, idx)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export { DataTable };
export type { DataTableProps, Column };
```

- [ ] **Step 2: Create Tabs component**

```tsx
// packages/ui/src/components/tabs.tsx
"use client";

import { cn } from "../cn";

interface Tab {
  value: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
}

const Tabs = ({ tabs, value, onChange }: TabsProps) => (
  <div className="mb-6 flex gap-1 border-b border-border">
    {tabs.map((tab) => (
      <button
        key={tab.value}
        className={cn(
          "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
          value === tab.value
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onChange(tab.value)}
        type="button"
      >
        {tab.label}
        {tab.count !== undefined && (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-xs",
              value === tab.value
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

export { Tabs };
export type { TabsProps, Tab };
```

- [ ] **Step 3: Create Select component (replacing 143-line custom version)**

```tsx
// packages/ui/src/components/select.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "../cn";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  label?: string;
  error?: string | null;
}

const Select = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  id,
  className,
  label,
  error,
}: SelectProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="text-sm font-medium" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="relative" ref={containerRef}>
        <button
          className={cn(
            "flex w-full items-center justify-between rounded-[var(--radius-md)] border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus:ring-destructive"
          )}
          disabled={disabled}
          id={id}
          onClick={() => setOpen(!open)}
          type="button"
        >
          <span className={value ? "" : "text-muted-foreground"}>
            {selectedLabel}
          </span>
          <svg
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-[var(--radius-md)] border border-border bg-popover py-1 shadow-md">
            {options.map((option) => (
              <button
                key={option.value}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  option.value === value ? "text-foreground" : "text-muted-foreground"
                )}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                type="button"
              >
                <svg
                  className={cn(
                    "size-3.5 shrink-0",
                    option.value === value ? "opacity-100" : "opacity-0"
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

export { Select };
export type { SelectProps, SelectOption };
```

- [ ] **Step 4: Update index exports**

Append to `packages/ui/src/index.ts`:
```tsx
export { DataTable, type DataTableProps, type Column } from "./components/data-table";
export { Tabs, type TabsProps, type Tab } from "./components/tabs";
export { Select, type SelectProps, type SelectOption } from "./components/select";
```

- [ ] **Step 5: Type check**

Run: `cd packages/ui && pnpm typecheck`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/
git commit -m "feat: add DataTable, Tabs, Select components to @raven/ui"
```

---

### Task 7: Set up TanStack Query provider

**Files:**
- Create: `apps/web/src/app/providers.tsx`
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Create the providers wrapper (client component)**

```tsx
// apps/web/src/app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

const Providers = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

export { Providers };
```

- [ ] **Step 2: Wrap root layout with Providers**

In `apps/web/src/app/layout.tsx`, add import and wrap children:

```tsx
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  description: "Unified AI gateway for teams",
  title: "Raven - AI Gateway"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${outfit.className} min-h-screen bg-background text-foreground antialiased`}
      >
        <Providers>
          {children}
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify app still renders**

Run: `pnpm dev:web`
Expected: App loads with no errors. React Query devtools do not appear (not installed, intentional).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/providers.tsx apps/web/src/app/layout.tsx
git commit -m "feat: set up TanStack Query provider in root layout"
```

---

### Task 8: Standardize API response envelope

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/web/src/lib/api.ts`

- [ ] **Step 1: Update error handler to wrap errors in `{ error: {} }` format**

In `apps/api/src/index.ts`, replace the `app.onError` block (lines 49-65):

```typescript
// Global error handler
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
      err.statusCode as 400 | 401 | 403 | 404 | 409 | 429 | 500
    );
  }
  console.error("Unhandled error:", err);
  return c.json(
    { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    500
  );
});
```

Also update the `notFound` handler (line 101-103):
```typescript
app.notFound((c) =>
  c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404)
);
```

- [ ] **Step 2: Update frontend `api.ts` to unwrap error format**

In `apps/web/src/lib/api.ts`, update the error parsing in each method. The error body is now `{ error: { code, message } }`. Update the shared error handling pattern. Replace the entire file:

```typescript
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let currentOrgId: string | null = null;

export const setOrgId = (orgId: string | null) => {
  currentOrgId = orgId;
};

export const getOrgId = () => currentOrgId;

const headers = (extra?: Record<string, string>): Record<string, string> => ({
  ...(currentOrgId ? { "X-Org-Id": currentOrgId } : {}),
  ...extra,
});

const handleResponse = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.error?.message ?? body?.message ?? "Request failed";
    throw new Error(message);
  }
  const body = await res.json();
  return body as T;
};

export const api = {
  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: headers(),
      method: "DELETE",
    });
    return handleResponse<T>(res);
  },

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: headers(),
    });
    return handleResponse<T>(res);
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
      headers: headers({ "Content-Type": "application/json" }),
      method: "POST",
    });
    return handleResponse<T>(res);
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
      headers: headers({ "Content-Type": "application/json" }),
      method: "PUT",
    });
    return handleResponse<T>(res);
  },
};
```

Note: We keep `body as T` rather than `body.data as T` for now because backend endpoints still return raw objects. Wrapping responses in `{ data: T }` requires updating every endpoint — that's Backend 2's job in Phase 1. The `handleResponse` function is already structured to handle both raw and wrapped formats.

- [ ] **Step 3: Verify both apps still work together**

Run: `pnpm dev`
Expected: Both API and web start. Dashboard pages load data correctly.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/index.ts apps/web/src/lib/api.ts
git commit -m "feat: standardize API error envelope and refactor api client"
```

---

### Task 9: Extract shared constants to `@raven/types`

**Files:**
- Create: `packages/types/src/constants.ts`
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Create shared constants file**

```typescript
// packages/types/src/constants.ts
import type { Provider } from "./providers";

export const PROVIDER_LABELS: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google AI",
};

export const ROLE_OPTIONS = [
  { label: "Member", value: "member" },
  { label: "Admin", value: "admin" },
  { label: "Viewer", value: "viewer" },
] as const;

export const ROLE_BADGE_VARIANT: Record<string, "primary" | "neutral" | "info"> = {
  admin: "info",
  member: "neutral",
  owner: "primary",
};

export const ENVIRONMENT_OPTIONS = [
  { label: "Live", value: "live" },
  { label: "Test", value: "test" },
] as const;
```

- [ ] **Step 2: Re-export from index**

In `packages/types/src/index.ts`, append:
```typescript
export * from "./constants";
```

- [ ] **Step 3: Type check**

Run: `cd packages/types && pnpm typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add packages/types/
git commit -m "feat: extract shared constants to @raven/types"
```

---

### Task 10: Update STYLEGUIDE hook naming convention

**Files:**
- Modify: `STYLEGUIDE.md`

- [ ] **Step 1: Update hook filename convention**

In `STYLEGUIDE.md`, find the hook naming convention section (around line 174) and change `useProfile.ts` (camelCase) to `use-profile.ts` (kebab-case) to match the actual codebase convention (`use-event-stream.ts`). This must be done before Phase 1 agents start creating hook files.

- [ ] **Step 2: Commit**

```bash
git add STYLEGUIDE.md
git commit -m "docs: update hook naming convention to kebab-case"
```

---

## Chunk 2: Phase 1 — Frontend Agent Tasks

Phase 1 agents work in isolated git worktrees. Each agent owns specific files and follows the same pattern:
1. Create query options factories and mutation hooks in `hooks/`
2. Extract sub-components into `components/`
3. Rewrite `page.tsx` as a thin orchestrator importing from `@raven/ui`, local hooks, and local components
4. Delete the old `@/components/select.tsx` (replaced by `@raven/ui` Select)
5. Replace all raw `useState`/`useEffect` data fetching with TanStack Query
6. Use `@raven/ui` components (`Button`, `Modal`, `DataTable`, `Badge`, `PageHeader`, etc.) instead of raw Tailwind

### Task 11: Frontend Agent 1 — `team`, `keys`, `profile` pages

**Agent prompt context:** This agent decomposes the three largest pages.

**Files to create/modify:**
```
# Team page
app/(dashboard)/team/page.tsx                    # Rewrite: thin orchestrator (~40 lines)
app/(dashboard)/team/hooks/use-team-data.ts      # Create: query options + mutations
app/(dashboard)/team/components/member-list.tsx   # Create: members table
app/(dashboard)/team/components/invitation-list.tsx # Create: invitations table
app/(dashboard)/team/components/team-list.tsx     # Create: teams table
app/(dashboard)/team/components/invite-form.tsx   # Create: invite modal form
app/(dashboard)/team/components/team-form.tsx     # Create: create team modal form

# Keys page
app/(dashboard)/keys/page.tsx                    # Rewrite: thin orchestrator
app/(dashboard)/keys/hooks/use-keys.ts           # Create: query options + mutations
app/(dashboard)/keys/components/key-list.tsx      # Create: keys table
app/(dashboard)/keys/components/key-form.tsx      # Create: create/edit form modal
app/(dashboard)/keys/components/key-reveal.tsx    # Create: new key reveal dialog

# Profile page
app/(dashboard)/profile/page.tsx                 # Rewrite: thin orchestrator
app/(dashboard)/profile/hooks/use-profile.ts     # Create: query options + mutations
app/(dashboard)/profile/components/profile-form.tsx  # Create: profile edit form
app/(dashboard)/profile/components/org-list.tsx      # Create: org listing
app/(dashboard)/profile/components/create-org-form.tsx # Create: create org modal

# Delete old select (now in @raven/ui)
components/select.tsx                             # Delete
```

**Instructions for agent:**
- Read the existing page files thoroughly before decomposing
- Use `queryOptions()` factory pattern (not custom hooks wrapping useQuery) per STYLEGUIDE
- Use `useEventStream` with `queryClient.invalidateQueries()` in the page orchestrator
- Import `Button`, `Modal`, `DataTable`, `Badge`, `PageHeader`, `ConfirmDialog`, `EmptyState`, `Input`, `Select`, `Switch`, `Tabs`, `Avatar`, `Spinner` from `@raven/ui`
- Import `ROLE_OPTIONS`, `ROLE_BADGE_VARIANT`, `ENVIRONMENT_OPTIONS` from `@raven/types`
- Arrow function syntax for all components
- `"use client"` directive on all components that use hooks
- kebab-case filenames
- Each component file should be under 150 lines
- Commit after each page is fully decomposed

---

### Task 12: Frontend Agent 2 — `providers`, `budgets`, `requests` pages

**Files to create/modify:**
```
# Providers page
app/(dashboard)/providers/page.tsx                      # Rewrite
app/(dashboard)/providers/hooks/use-providers.ts        # Create
app/(dashboard)/providers/components/provider-list.tsx   # Create
app/(dashboard)/providers/components/provider-form.tsx   # Create

# Budgets page
app/(dashboard)/budgets/page.tsx                        # Rewrite
app/(dashboard)/budgets/hooks/use-budgets.ts            # Create
app/(dashboard)/budgets/components/budget-list.tsx       # Create
app/(dashboard)/budgets/components/budget-form.tsx       # Create

# Requests page
app/(dashboard)/requests/page.tsx                       # Rewrite
app/(dashboard)/requests/hooks/use-requests.ts          # Create
app/(dashboard)/requests/components/request-table.tsx    # Create
app/(dashboard)/requests/components/request-filters.tsx  # Create
```

**Instructions for agent:** Same conventions as Task 11. Read existing pages first. Use `@raven/ui` components, `queryOptions()` pattern, arrow functions, kebab-case files. The requests page has pagination — keep pagination state in the hook via query key params. Commit after each page.

---

### Task 13: Frontend Agent 3 — `overview`, `analytics`, `billing`, `settings` + layout

**Files to create/modify:**
```
# Overview page
app/(dashboard)/overview/page.tsx                        # Rewrite
app/(dashboard)/overview/hooks/use-overview.ts           # Create
app/(dashboard)/overview/components/stat-cards.tsx        # Create
app/(dashboard)/overview/components/usage-chart.tsx       # Create
app/(dashboard)/overview/components/recent-requests.tsx   # Create

# Analytics page
app/(dashboard)/analytics/page.tsx                       # Rewrite
app/(dashboard)/analytics/hooks/use-analytics.ts         # Create
app/(dashboard)/analytics/components/usage-charts.tsx     # Create
app/(dashboard)/analytics/components/token-breakdown.tsx  # Create

# Billing page
app/(dashboard)/billing/page.tsx                         # Rewrite
app/(dashboard)/billing/hooks/use-billing.ts             # Create
app/(dashboard)/billing/components/plan-selector.tsx      # Create
app/(dashboard)/billing/components/subscription-status.tsx # Create

# Settings page
app/(dashboard)/settings/page.tsx                        # Rewrite
app/(dashboard)/settings/hooks/use-settings.ts           # Create
app/(dashboard)/settings/components/settings-form.tsx     # Create
app/(dashboard)/settings/components/danger-zone.tsx       # Create

# Dashboard layout
app/(dashboard)/layout.tsx                               # Rewrite: thin wrapper
app/(dashboard)/components/sidebar.tsx                   # Create
app/(dashboard)/components/org-switcher.tsx               # Create
app/(dashboard)/components/user-menu.tsx                  # Create
app/(dashboard)/hooks/use-orgs.ts                        # Create
```

**Instructions for agent:** Same conventions as Tasks 11-12. The layout decomposition is critical — extract `OrgSwitcher`, `UserMenu`, and `Sidebar` into their own components. The `useOrgs` hook uses TanStack Query for org fetching. Use `@raven/ui` components. Commit after each page/component group.

---

## Chunk 3: Phase 1 — Backend & Design Agent Tasks

### Task 14: Backend Agent 1 — Proxy handler decomposition + middleware

**Files to create/modify:**
```
# Proxy decomposition
modules/proxy/handler.ts            # Rewrite: ~80 lines pipeline orchestrator
modules/proxy/auth.ts               # Create: key extraction + validation
modules/proxy/rate-limiter.ts       # Create: Redis sliding window (extract from handler)
modules/proxy/provider-resolver.ts  # Create: path parsing, config lookup, decryption
modules/proxy/upstream.ts           # Create: URL building, header forwarding, fetch
modules/proxy/response.ts           # Create: streaming vs buffered response handling
modules/proxy/logger.ts             # Create: async request logging + event publishing
modules/proxy/token-usage.ts        # Create: token extraction + StreamTokenAccumulator

# Middleware
middleware/error-boundary.ts        # Create: centralized error-to-response mapping
middleware/request-id.ts            # Create: unique ID per request
middleware/request-timing.ts        # Create: standardized latency headers
middleware/auth.ts                  # Modify: fix type safety (remove `as never` cast)
middleware/tenant.ts                # Modify: fix type safety
```

**Instructions for agent:**
- Read `apps/api/src/modules/proxy/handler.ts` (383 lines) thoroughly
- Extract each function into its own module with clear interfaces
- The pipeline in `handler.ts` should read as a clear sequence: `auth -> rateLimit -> resolve -> forward -> log`
- For `token-usage.ts`, include a `StreamTokenAccumulator` class that:
  - Parses SSE chunks looking for usage data in the final event
  - OpenAI sends usage in the final `data: [DONE]` preceded by a chunk with `usage` field
  - Anthropic sends `message_stop` event with usage in the preceding `message_delta`
  - Returns `{ inputTokens, outputTokens }` after stream completes
- For middleware: extract the error handler from `index.ts` into `middleware/error-boundary.ts`
- Fix `c.get("user" as never)` in `middleware/tenant.ts` — use properly typed Hono variables
- Add `X-Request-Id` header via `middleware/request-id.ts` (use `crypto.randomUUID()`)
- All extracted modules should have explicit TypeScript interfaces for their inputs/outputs
- Commit after each module extraction

---

### Task 15: Backend Agent 2 — Zod schema extraction + response wrapping

**Files to create/modify:**
```
# Schema extraction (one per module)
modules/keys/schema.ts              # Create: createKeySchema, updateKeySchema
modules/providers/schema.ts         # Create: createProviderSchema, updateProviderSchema
modules/budgets/schema.ts           # Create: createBudgetSchema, updateBudgetSchema
modules/guardrails/schema.ts        # Create: createGuardrailSchema, updateGuardrailSchema
modules/teams/schema.ts             # Create: team/member/invitation schemas
modules/settings/schema.ts          # Create: updateSettingsSchema
modules/user/schema.ts              # Create: updateProfileSchema

# Shared response wrapper
lib/response.ts                     # Create: typed response helpers

# Update each module's route handlers to use schemas
modules/keys/create.ts              # Modify: use schema
modules/keys/update.ts              # Modify: use schema
modules/providers/create.ts         # Modify: use schema
modules/providers/update.ts         # Modify: use schema
modules/budgets/create.ts           # Modify: use schema
modules/budgets/update.ts           # Modify: use schema
modules/guardrails/create.ts        # Modify: use schema
modules/guardrails/update.ts        # Modify: use schema
modules/teams/teams.ts              # Modify: use schema (contains team CRUD)
modules/teams/invitations.ts        # Modify: use schema (contains invitation CRUD)
modules/teams/members.ts            # Modify: use schema (contains member management)
modules/settings/update.ts          # Modify: use schema
modules/user/profile.ts             # Modify: use schema (contains profile update)
```

**Instructions for agent:**
- Read each module's create/update handlers to understand current inline validation
- Extract validation into Zod schemas in co-located `schema.ts` files
- Create `lib/response.ts` with helpers:
  ```typescript
  export const success = <T>(c: Context, data: T, status = 200) =>
    c.json({ data }, status);
  export const created = <T>(c: Context, data: T) =>
    c.json({ data }, 201);
  ```
- Update each route handler to: (1) parse input with `schema.parse()`, (2) return via `success(c, result)`
- Do NOT modify `modules/proxy/` (owned by Backend Agent 1)
- Do NOT modify `index.ts` error handler (already updated in Phase 0)
- Commit after each module's schemas are extracted

---

### Task 16: Designer Agent — Motion system, visual polish, dark mode audit

**Files to create/modify:**
```
# Motion utilities
packages/ui/src/components/motion.tsx     # Create: reusable motion wrappers

# Polish existing components (styling only)
packages/ui/src/components/data-table.tsx # Modify: add row stagger animation
packages/ui/src/components/button.tsx     # Modify: refine press animation
packages/ui/src/components/empty-state.tsx # Modify: add fade-in animation

# CSS refinements
apps/web/src/app/globals.css             # Modify: add animation keyframes, skeleton shimmer

# Auth page dark mode fixes
apps/web/src/app/(auth)/sign-in/page.tsx  # Modify: replace hardcoded bg-white with tokens
apps/web/src/app/(auth)/sign-up/page.tsx  # Modify: replace hardcoded bg-white with tokens
```

**Instructions for agent:**
- Create `motion.tsx` with reusable wrappers:
  - `FadeIn` — simple opacity animation for mounting
  - `StaggerList` — children animate in with stagger delay
- Modal already uses Framer Motion (built in Phase 0 with Base UI Dialog + AnimatePresence) — do NOT modify modal structure
- Add skeleton shimmer keyframe to `globals.css`
- Add subtle hover lift (`translateY(-1px)`) to `DataTable` rows via CSS
- Audit all `@raven/ui` components for hardcoded colors — replace with CSS custom property references
- Audit auth pages (`sign-in`, `sign-up`) for hardcoded `bg-white` / color values — replace with design tokens
- Do NOT modify dashboard page files (owned by frontend agents)
- Do NOT add structural changes to components — styling only
- Commit after each component group

---

### Task 17: QA Agent — Type checking + lint + integration review

**Runs after Tasks 11-16 are complete and merged.**

- [ ] **Step 1: Run full type check**

Run: `pnpm typecheck`
Expected: No TypeScript errors across entire monorepo.

- [ ] **Step 2: Run linter**

Run: `pnpm lint`
Expected: No lint errors. Fix any issues found.

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: Clean build for both api and web.

- [ ] **Step 4: Review import consistency**

Verify:
- All pages import from `@raven/ui` (not raw Tailwind component patterns)
- No page file exceeds 100 lines
- All data fetching uses `useQuery`/`useMutation` (no raw `useEffect` + `fetch`)
- Old `@/components/select.tsx` is deleted
- All hooks use `queryOptions()` factory pattern

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve type errors and lint issues from refactor"
```

---

### Task 18: Security Agent — Audit

**Runs after Tasks 11-16 are complete and merged.**

- [ ] **Step 1: Audit crypto**

Review `apps/api/src/lib/crypto.ts`:
- Verify AES-256-GCM is used correctly (IV generation, tag handling)
- Check for timing-safe comparison where needed

- [ ] **Step 2: Audit auth flows**

Review `apps/api/src/middleware/auth.ts` and `apps/api/src/middleware/tenant.ts`:
- Verify session validation is correct
- Check for authorization bypass risks
- Verify org membership checks are enforced

- [ ] **Step 3: Audit proxy handler**

Review the decomposed proxy modules:
- Verify key hashing uses constant-time comparison
- Check header stripping (no auth header forwarding)
- Verify rate limiting can't be bypassed
- Check for SSRF risks in upstream URL construction

- [ ] **Step 4: Audit input validation**

Review all `schema.ts` files:
- Verify Zod schemas are strict enough
- Check for injection risks in user-supplied strings
- Verify all API endpoints validate input before processing

- [ ] **Step 5: Report findings**

Create a security report at `docs/superpowers/security-audit-2026-03-12.md` with findings and recommendations. Fix critical issues immediately.

---

## Chunk 4: Phase 2 — Integration

### Task 19: Merge all worktree branches

- [ ] **Step 1: List all worktree branches**

Run: `git branch --list 'worktree-*'`

- [ ] **Step 2: Merge each branch sequentially**

Merge in this order to minimize conflicts:
1. Backend Agent 2 (schemas — least likely to conflict)
2. Backend Agent 1 (proxy — isolated to proxy module)
3. Designer Agent (CSS + UI component styling)
4. Frontend Agent 1 (team, keys, profile)
5. Frontend Agent 2 (providers, budgets, requests)
6. Frontend Agent 3 (overview, analytics, billing, settings, layout)

For each:
```bash
git merge <branch-name> --no-edit
```

If conflicts arise, resolve by keeping the destination branch's structure and incorporating the incoming changes.

**Important:** Backend Agent 2 wraps all responses in `{ data: T }`. After merging Backend Agent 2's branch, update `apps/web/src/lib/api.ts` `handleResponse` to unwrap: `return body.data as T` instead of `return body as T`. Do this before merging any frontend branches.

- [ ] **Step 3: Run full verification after all merges**

```bash
pnpm install && pnpm typecheck && pnpm lint && pnpm build
```

Expected: Clean pass on all three.

- [ ] **Step 4: Commit merge resolution if needed**

```bash
git add -A
git commit -m "feat: integrate modular refactor from all agent branches"
```

---

### Task 20: Final cleanup

- [ ] **Step 1: Delete old `@/components/select.tsx` if still present**

Verify it was removed by Frontend Agent 1. If not, delete it.

- [ ] **Step 2: Run dev server and smoke test**

Run: `pnpm dev`
Manually verify:
- Dashboard loads with sidebar
- Each page renders data
- Dark mode works (change system preference)
- Modals open/close with animation
- Forms submit and show validation errors
- Tables show loading skeletons, empty states

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup after modular refactor"
```
