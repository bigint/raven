"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import type { ReactNode } from "react";
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
  searchable: _searchable = false
}: SelectProps) => (
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
          "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus:ring-destructive"
        )}
        id={id}
      >
        <BaseSelect.Value>
          {value ? options.find((o) => o.value === value)?.label : placeholder}
        </BaseSelect.Value>
        <BaseSelect.Icon className="ml-2">
          <svg
            className="size-4 text-muted-foreground"
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
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className="z-[100]" sideOffset={4}>
          <BaseSelect.Popup
            className="max-h-60 overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-lg"
            style={{ width: "var(--anchor-width)" }}
          >
            {options.map((option) => (
              <BaseSelect.Item
                className="flex w-full cursor-default items-center gap-2 px-3 py-2 text-sm text-muted-foreground outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[selected]:text-foreground"
                key={option.value}
                value={option.value}
              >
                <BaseSelect.ItemIndicator className="shrink-0">
                  <svg
                    className="size-3.5"
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
                </BaseSelect.ItemIndicator>
                {option.icon}
                <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
    {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
  </div>
);

export type { SelectOption, SelectProps };
export { Select };
