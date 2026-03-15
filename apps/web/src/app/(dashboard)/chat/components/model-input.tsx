"use client";

import { cn } from "@raven/ui";
import { useEffect, useRef, useState } from "react";

interface ModelOption {
  label: string;
  provider: string;
  value: string;
}

interface ModelInputProps {
  disabled: boolean;
  onChange: (value: string, provider: string) => void;
  options: ModelOption[];
  value: string;
}

export const ModelInput = ({
  disabled,
  onChange,
  options,
  value
}: ModelInputProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

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

  const query = search.toLowerCase();
  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(query) ||
      o.value.toLowerCase().includes(query) ||
      o.provider.toLowerCase().includes(query)
  );

  // Group by provider
  const grouped = new Map<string, ModelOption[]>();
  for (const opt of filtered) {
    const group = grouped.get(opt.provider) ?? [];
    group.push(opt);
    grouped.set(opt.provider, group);
  }

  return (
    <div className="w-72" ref={containerRef}>
      <div className="relative">
        <input
          className={cn(
            "flex w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground"
          )}
          disabled={disabled}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search models..."
          type="text"
          value={search}
        />

        {open && filtered.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
            <div className="max-h-72 overflow-y-auto py-1">
              {[...grouped.entries()].map(([provider, models]) => (
                <div key={provider}>
                  <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {provider}
                  </div>
                  {models.map((option) => (
                    <button
                      className={cn(
                        "flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                        option.value === value
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                      key={`${option.provider}/${option.value}`}
                      onClick={() => {
                        onChange(option.value, option.provider);
                        setSearch(option.value);
                        setOpen(false);
                      }}
                      type="button"
                    >
                      <span className="truncate">{option.label}</span>
                      <span className="ml-2 shrink-0 truncate text-xs opacity-50">
                        {option.value}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
