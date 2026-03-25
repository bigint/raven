"use client";

import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn } from "../cn";

interface Tab {
  readonly value: string;
  readonly label: string;
  readonly count?: number;
}

interface TabsProps {
  readonly tabs: Tab[];
  readonly value: string;
  readonly onChange: (value: string) => void;
}

const Tabs = ({ tabs, value, onChange }: TabsProps) => (
  <BaseTabs.Root onValueChange={(v) => onChange(v as string)} value={value}>
    <BaseTabs.List
      activateOnFocus
      className="mb-6 flex gap-1 overflow-x-auto border-b border-border"
    >
      {tabs.map((tab) => (
        <BaseTabs.Tab
          className={cn(
            "relative z-0 flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-t-md px-4 py-2 text-sm font-medium transition-colors",
            "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            "data-active:text-foreground"
          )}
          key={tab.value}
          value={tab.value}
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
        </BaseTabs.Tab>
      ))}
      <BaseTabs.Indicator className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary transition-[left,width] duration-300 ease-[cubic-bezier(0.65,0,0.35,1)]" />
    </BaseTabs.List>
  </BaseTabs.Root>
);

export type { Tab, TabsProps };
export { Tabs };
