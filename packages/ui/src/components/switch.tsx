"use client";

import { cn } from "../cn";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const Switch = ({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className
}: SwitchProps) => (
  <div className={cn("flex items-center gap-3", className)}>
    <button
      aria-checked={checked}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted"
      )}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform duration-150",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
    {label && <span className="text-sm">{label}</span>}
  </div>
);

export { Switch };
export type { SwitchProps };
