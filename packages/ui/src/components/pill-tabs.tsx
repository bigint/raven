"use client";

import { LayoutGroup, motion } from "motion/react";
import type { ReactNode } from "react";
import { useId } from "react";
import { cn } from "../cn";

interface PillTabOption<T extends string = string> {
  value: T;
  label: string;
  extra?: ReactNode;
  disabled?: boolean;
  tooltip?: string;
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
          "flex h-9 items-center gap-1 overflow-x-auto rounded-md border border-border px-1 w-fit",
          className
        )}
        role="tablist"
      >
        {options.map((opt) => (
          <button
            aria-selected={value === opt.value}
            className={cn(
              "relative shrink-0 rounded-md px-3 py-1 text-sm font-medium transition-colors",
              opt.disabled && "cursor-not-allowed opacity-50"
            )}
            disabled={opt.disabled}
            key={opt.value}
            onClick={() => !opt.disabled && onChange(opt.value)}
            role="tab"
            tabIndex={value === opt.value ? 0 : -1}
            title={opt.tooltip}
            type="button"
          >
            {value === opt.value && !opt.disabled && (
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
                opt.disabled
                  ? "text-muted-foreground"
                  : value === opt.value
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

export type { PillTabOption, PillTabsProps };
export { PillTabs };
