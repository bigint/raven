"use client";

import { LayoutGroup, motion } from "motion/react";
import { useId } from "react";
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

const Tabs = ({ tabs, value, onChange }: TabsProps) => {
  const id = useId();

  return (
    <LayoutGroup id={id}>
      <div
        className="mb-6 flex gap-1 overflow-x-auto border-b border-border"
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            aria-selected={value === tab.value}
            className={cn(
              "relative flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors",
              value === tab.value
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={tab.value}
            onClick={() => onChange(tab.value)}
            role="tab"
            tabIndex={value === tab.value ? 0 : -1}
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
            {value === tab.value && (
              <motion.div
                className="absolute inset-x-0 -bottom-px h-0.5 bg-primary"
                layoutId="tab-underline"
                transition={{
                  bounce: 0.15,
                  duration: 0.35,
                  type: "spring"
                }}
              />
            )}
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
};

export type { Tab, TabsProps };
export { Tabs };
