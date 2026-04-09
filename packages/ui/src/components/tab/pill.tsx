"use client";

import { Tabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";
import { cn } from "../../cn";

interface PillTabOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
  readonly extra?: ReactNode;
  readonly disabled?: boolean;
  readonly tooltip?: string;
}

interface PillTabsProps<T extends string = string> {
  readonly options: PillTabOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly className?: string;
}

const PillTabs = <T extends string = string>({
  options,
  value,
  onChange,
  className
}: PillTabsProps<T>) => (
  <Tabs.Root onValueChange={(v) => onChange(v as T)} value={value}>
    <Tabs.List
      activateOnFocus
      className={cn(
        "relative flex h-9 w-fit items-center gap-1 overflow-x-auto rounded-md border border-border px-1",
        className
      )}
    >
      {options.map((opt) => (
        <Tabs.Tab
          className={cn(
            "relative z-0 shrink-0 cursor-pointer rounded-md px-3 py-1 text-sm font-medium transition-colors",
            "text-muted-foreground hover:text-foreground data-active:text-background",
            opt.disabled && "cursor-not-allowed opacity-50"
          )}
          disabled={opt.disabled}
          key={opt.value}
          title={opt.tooltip}
          value={opt.value}
        >
          <span className="relative z-10">
            {opt.label}
            {opt.extra}
          </span>
        </Tabs.Tab>
      ))}
      <Tabs.Indicator className="absolute top-[var(--active-tab-top)] left-[var(--active-tab-left)] h-[var(--active-tab-height)] w-[var(--active-tab-width)] -z-1 rounded-md bg-foreground transition-all duration-300 ease-[cubic-bezier(0.65,0,0.35,1)]" />
    </Tabs.List>
  </Tabs.Root>
);

export type { PillTabOption, PillTabsProps };
export { PillTabs };
