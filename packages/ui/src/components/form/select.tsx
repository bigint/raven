"use client";

import { Popover } from "@base-ui/react/popover";
import { Select as BaseSelect } from "@base-ui/react/select";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../cn";

interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  label?: string;
  error?: string | null;
  searchable?: boolean;
}

const TRIGGER_CLASS =
  "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-2.5 text-left text-sm text-foreground transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50";

const ChevronIcon = () => (
  <svg
    aria-hidden="true"
    className="size-3 shrink-0 text-muted-foreground"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = () => (
  <svg
    aria-hidden="true"
    className="size-3.5"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function filterOptions(
  options: readonly SelectOption[],
  search: string
): readonly SelectOption[] {
  if (!search) return options;
  const term = search.toLowerCase();
  return options.filter((o) => o.label.toLowerCase().includes(term));
}

const SearchableSelect = ({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  id,
  className,
  label,
  error
}: Omit<SelectProps, "searchable">) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(
    () => filterOptions(options, search),
    [options, search]
  );

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlightedIndex]) {
        handleSelect(filtered[highlightedIndex].value);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setSearch("");
    }
  };

  const emptyMessage =
    options.length === 0 ? "No options available" : "No results found";

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <label
          className="text-sm font-medium"
          id={id ? `${id}-label` : undefined}
        >
          {label}
        </label>
      )}

      <Popover.Root
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) setHighlightedIndex(0);
          else setSearch("");
        }}
        open={open}
      >
        <Popover.Trigger
          aria-labelledby={id ? `${id}-label` : undefined}
          className={cn(
            TRIGGER_CLASS,
            error && "border-foreground ring-1 ring-foreground",
            !selected && "!text-muted-foreground"
          )}
          disabled={disabled}
          id={id}
          render={<button type="button" />}
        >
          <span className="truncate">
            {selected ? (
              <span className="flex items-center gap-2">
                {selected.icon}
                {selected.label}
              </span>
            ) : (
              placeholder
            )}
          </span>
          <ChevronIcon />
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Positioner align="start" className="z-[200]" sideOffset={4}>
            <Popover.Popup className="overflow-hidden rounded-md border border-border bg-popover shadow-lg outline-none">
              <input
                aria-label="Search options"
                className="w-full border-b border-border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search…"
                ref={inputRef}
                type="text"
                value={search}
              />
              <div
                className="max-h-48 overflow-y-auto p-1"
                style={{
                  minWidth: "var(--anchor-width)",
                  width: "max-content"
                }}
              >
                {filtered.map((option, i) => (
                  <button
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none",
                      i === highlightedIndex &&
                        "bg-accent text-accent-foreground",
                      option.value === value && "font-medium"
                    )}
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    type="button"
                  >
                    <span className="inline-flex size-4 shrink-0 items-center justify-center">
                      {option.value === value && <CheckIcon />}
                    </span>
                    {option.icon}
                    <span className="truncate">{option.label}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </p>
                )}
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      {error && <p className="text-xs font-medium text-foreground">{error}</p>}
    </div>
  );
};

const StandardSelect = ({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  id,
  className,
  label,
  error
}: Omit<SelectProps, "searchable">) => (
  <div className={cn("flex flex-col gap-1", className)}>
    {label && (
      <label
        className="text-sm font-medium"
        id={id ? `${id}-label` : undefined}
      >
        {label}
      </label>
    )}
    <BaseSelect.Root
      disabled={disabled}
      onValueChange={(val) => onChange(val as string)}
      value={value}
    >
      <BaseSelect.Trigger
        className={cn(
          TRIGGER_CLASS,
          error && "border-foreground ring-1 ring-foreground"
        )}
        id={id}
      >
        <BaseSelect.Value placeholder={placeholder}>
          {(val: string) => {
            const match = options.find((o) => o.value === val);
            return match ? (
              <span className="flex min-w-0 items-center gap-2">
                {match.icon}
                <span className="truncate">{match.label}</span>
              </span>
            ) : (
              <span className="truncate">{val}</span>
            );
          }}
        </BaseSelect.Value>
        <BaseSelect.Icon>
          <ChevronIcon />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner
          alignItemWithTrigger={false}
          className="z-[100]"
          sideOffset={4}
        >
          <BaseSelect.Popup
            className="max-h-60 overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-lg"
            style={{ width: "var(--anchor-width)" }}
          >
            <BaseSelect.List>
              {options.map((option) => (
                <BaseSelect.Item
                  className="flex w-full cursor-default items-center gap-2 px-3 py-2 text-sm outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                  key={option.value}
                  value={option.value}
                >
                  <BaseSelect.ItemIndicator className="inline-flex size-4 shrink-0 items-center justify-center">
                    <CheckIcon />
                  </BaseSelect.ItemIndicator>
                  {option.icon}
                  <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
    {error && <p className="text-xs font-medium text-foreground">{error}</p>}
  </div>
);

const Select = ({ searchable = false, ...props }: SelectProps) =>
  searchable ? <SearchableSelect {...props} /> : <StandardSelect {...props} />;

export type { SelectOption, SelectProps };
export { Select };
