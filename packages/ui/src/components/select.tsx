"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../cn";

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  className?: string;
  disabled?: boolean;
  id?: string;
  label?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  value: string;
}

const Select = ({
  className,
  disabled = false,
  id,
  label,
  onChange,
  options,
  placeholder = "Select...",
  searchable = false,
  value,
}: SelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? placeholder;

  const filteredOptions =
    searchable && search
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
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
    if (!open) {
      setSearch("");
    }
  }, [open, searchable]);

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <span className="text-sm font-medium">{label}</span>
      )}
      <div className="relative" ref={containerRef}>
        <button
          className="flex w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          id={id}
          onClick={() => setOpen(!open)}
          type="button"
        >
          <span className={value ? "" : "text-muted-foreground"}>
            {selectedLabel}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-md ring-1 ring-black/5">
            {searchable && (
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <Search className="size-3.5 shrink-0 text-muted-foreground" />
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  ref={searchInputRef}
                  type="text"
                  value={search}
                />
              </div>
            )}
            <div className="max-h-60 overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  No results
                </p>
              ) : (
                filteredOptions.map((option) => (
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
                    <Check
                      className={cn(
                        "size-3.5 shrink-0",
                        option.value === value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { Select };
export type { SelectOption, SelectProps };
