"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../cn";

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

const ChevronIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4 text-muted-foreground", className)}
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
    className="size-3.5"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Searchable variant — custom combobox (portaled)                   */
/* ------------------------------------------------------------------ */

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
  placeholder = "Select...",
  disabled = false,
  id,
  className,
  label,
  error
}: Omit<SelectProps, "searchable">) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [pos, setPos] = useState({ left: 0, top: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(
    () => filterOptions(options, search),
    [options, search]
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setSearch("");
    setHighlightedIndex(0);
  }, [disabled]);

  const handleSelect = useCallback(
    (val: string) => {
      onChange(val);
      handleClose();
    },
    [onChange, handleClose]
  );

  // Position dropdown below trigger
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      left: rect.left + window.scrollX,
      top: rect.bottom + window.scrollY + 4,
      width: rect.width
    });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      handleClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, handleClose]);

  // Auto-focus search input
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Reset highlight on filter change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filtered.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-option]");
    items[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, open]);

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
      handleClose();
    }
  };

  const emptyMessage =
    options.length === 0 ? "No options available" : "No results found";

  return (
    <div className={className}>
      {label && (
        <label className="mb-1 block text-sm font-medium" htmlFor={id}>
          {label}
        </label>
      )}

      <button
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus:ring-destructive",
          !selected && "text-muted-foreground"
        )}
        disabled={disabled}
        id={id}
        onClick={open ? handleClose : handleOpen}
        ref={triggerRef}
        type="button"
      >
        <span className="flex items-center gap-2 truncate">
          {selected ? (
            <>
              {selected.icon}
              {selected.label}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronIcon
          className={cn("ml-2 transition-transform", open && "rotate-180")}
        />
      </button>

      {open &&
        createPortal(
          <div
            className="fixed z-[200] overflow-hidden rounded-md border border-border bg-popover shadow-lg"
            ref={dropdownRef}
            style={{ left: pos.left, top: pos.top, width: pos.width }}
          >
            <input
              className="w-full border-b border-border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              ref={inputRef}
              type="text"
              value={search}
            />
            <div className="max-h-48 overflow-y-auto p-1" ref={listRef}>
              {filtered.map((option, i) => (
                <button
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none",
                    i === highlightedIndex &&
                      "bg-accent text-accent-foreground",
                    option.value === value && "font-medium"
                  )}
                  data-option
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
          </div>,
          document.body
        )}

      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Standard variant — base-ui select                                 */
/* ------------------------------------------------------------------ */

const StandardSelect = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  id,
  className,
  label,
  error
}: Omit<SelectProps, "searchable">) => (
  <div className={className}>
    {label && (
      <label className="mb-1 block text-sm font-medium" htmlFor={id}>
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
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus:ring-destructive"
        )}
        id={id}
      >
        <BaseSelect.Value placeholder={placeholder}>
          {(val: string) => {
            const match = options.find((o) => o.value === val);
            return match ? (
              <span className="flex items-center gap-2">
                {match.icon}
                {match.label}
              </span>
            ) : (
              val
            );
          }}
        </BaseSelect.Value>
        <BaseSelect.Icon className="ml-2">
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
    {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
  </div>
);

/* ------------------------------------------------------------------ */
/*  Exported component                                                */
/* ------------------------------------------------------------------ */

const Select = ({ searchable = false, ...props }: SelectProps) =>
  searchable ? <SearchableSelect {...props} /> : <StandardSelect {...props} />;

export type { SelectOption, SelectProps };
export { Select };
