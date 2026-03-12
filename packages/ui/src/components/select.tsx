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
