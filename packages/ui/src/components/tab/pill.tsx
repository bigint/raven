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
        "inline-flex border border-border rounded-md overflow-hidden",
        className
      )}
    >
      {options.map((opt) => (
        <Tabs.Tab
          className={cn(
            "shrink-0 cursor-pointer px-2.5 h-7 text-xs font-medium transition-colors border-l border-border first:border-l-0",
            "bg-background text-muted-foreground hover:text-foreground hover:bg-muted",
            "data-active:bg-accent data-active:text-foreground",
            opt.disabled && "cursor-not-allowed opacity-50"
          )}
          disabled={opt.disabled}
          key={opt.value}
          title={opt.tooltip}
          value={opt.value}
        >
          {opt.label}
          {opt.extra}
        </Tabs.Tab>
      ))}
    </Tabs.List>
  </Tabs.Root>
);

export type { PillTabOption, PillTabsProps };
export { PillTabs };
