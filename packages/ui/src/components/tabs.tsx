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
  <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
    {tabs.map((tab) => (
      <button
        className={cn(
          "flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors",
          value === tab.value
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
        key={tab.value}
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
