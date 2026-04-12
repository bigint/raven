"use client";

import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { useId } from "react";
import { cn } from "../../cn";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

const Switch = ({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className,
  "aria-label": ariaLabel
}: SwitchProps) => {
  const labelId = useId();

  return (
    <label className={cn("flex items-center gap-3", className)}>
      <BaseSwitch.Root
        aria-label={label ? undefined : ariaLabel}
        aria-labelledby={label ? labelId : undefined}
        checked={checked}
        className={cn(
          "relative inline-flex w-[26px] h-3.5 shrink-0 cursor-pointer items-center rounded-full border border-input bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground",
          checked && "bg-foreground border-foreground"
        )}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      >
        <BaseSwitch.Thumb
          className={cn(
            "pointer-events-none inline-block size-2.5 rounded-full bg-muted-foreground transition-transform data-[state=checked]:translate-x-[11px] data-[state=checked]:bg-background",
            checked ? "translate-x-[11px] bg-background" : "translate-x-0.5"
          )}
        />
      </BaseSwitch.Root>
      {label && (
        <span className="text-sm" id={labelId}>
          {label}
        </span>
      )}
    </label>
  );
};

export type { SwitchProps };
export { Switch };
