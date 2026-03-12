"use client";

import { cn } from "../cn";

interface SwitchProps {
  checked: boolean;
  className?: string;
  disabled?: boolean;
  label?: string;
  onChange: (checked: boolean) => void;
}

const Switch = ({
  checked,
  className,
  disabled = false,
  label,
  onChange,
}: SwitchProps) => (
  <div className={cn("flex items-center gap-3", className)}>
    <button
      aria-checked={checked}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        checked ? "bg-primary" : "bg-muted",
        disabled && "cursor-not-allowed opacity-50"
      )}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
    {label && <span className="text-sm">{label}</span>}
  </div>
);

export { Switch };
export type { SwitchProps };
