"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../cn";

interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
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
  searchable?: boolean;
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
  searchable = false
}: SelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.value === value);
  const selectedLabel = selected?.label ?? placeholder;

  const filtered = searchable
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
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

  useEffect(() => {
    if (open && searchable) {
      inputRef.current?.focus();
    }
    if (!open) {
      setSearch("");
    }
  }, [open, searchable]);

  return (
    <div className={className}>
      {label && (
        <label className="mb-1 block text-sm font-medium" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="relative" ref={containerRef}>
        <button
          className={cn(
            "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus:ring-destructive"
          )}
          disabled={disabled}
          id={id}
          onClick={() => setOpen(!open)}
          type="button"
        >
          <span
            className={cn(
              "flex items-center gap-2",
              !value && "text-muted-foreground"
            )}
          >
            {selected?.icon}
            {selectedLabel}
          </span>
          <svg
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              d="M19 9l-7 7-7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
            {searchable && (
              <div className="border-b border-border px-3 py-2">
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  ref={inputRef}
                  type="text"
                  value={search}
                />
              </div>
            )}
            <div className="max-h-60 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  No results
                </p>
              ) : (
                filtered.map((option) => (
                  <button
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                      option.value === value
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                    key={option.value}
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
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {option.icon}
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
};

export type { SelectOption, SelectProps };
export { Select };
