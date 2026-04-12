"use client";

import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn } from "../../cn";

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
      className="mb-6 flex items-center gap-5 overflow-x-auto border-b border-border"
    >
      {tabs.map((tab) => (
        <BaseTabs.Tab
          className={cn(
            "relative flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap py-2.5 text-sm font-medium transition-colors",
            "text-muted-foreground hover:text-foreground",
            "data-active:text-foreground"
          )}
          key={tab.value}
          value={tab.value}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-xs",
                value === tab.value
                  ? "bg-muted text-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {tab.count}
            </span>
          )}
          {value === tab.value && (
            <span className="absolute inset-x-0 -bottom-px h-[1.5px] bg-foreground" />
          )}
        </BaseTabs.Tab>
      ))}
    </BaseTabs.List>
  </BaseTabs.Root>
);

export type { Tab, TabsProps };
export { Tabs };
