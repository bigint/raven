"use client";

import { LayoutGroup, motion } from "motion/react";
import { useId } from "react";
import { cn } from "../cn";

interface PillTabOption<T extends string = string> {
  value: T;
  label: string;
  extra?: React.ReactNode;
}

interface PillTabsProps<T extends string = string> {
  options: PillTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

const PillTabs = <T extends string = string>({
  options,
  value,
  onChange,
  className
}: PillTabsProps<T>) => {
  const id = useId();

  return (
    <LayoutGroup id={id}>
      <div
        className={cn(
          "flex items-center gap-1 overflow-x-auto rounded-lg border border-border p-1 w-fit",
          className
        )}
      >
        {options.map((opt) => (
          <button
            className="relative shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            key={opt.value}
            onClick={() => onChange(opt.value)}
            type="button"
          >
            {value === opt.value && (
              <motion.div
                className="absolute inset-0 rounded-md bg-primary"
                layoutId="pill-indicator"
                transition={{
                  bounce: 0.15,
                  duration: 0.35,
                  type: "spring"
                }}
              />
            )}
            <span
              className={cn(
                "relative z-10",
                value === opt.value
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
              {opt.extra}
            </span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
};

export { PillTabs };
export type { PillTabOption, PillTabsProps };
