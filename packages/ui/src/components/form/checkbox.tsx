"use client";

import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { CheckIcon, MinusIcon } from "lucide-react";
import { useId } from "react";
import { cn } from "../../cn";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  indeterminate?: boolean;
  "aria-label"?: string;
}

const Checkbox = ({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className,
  id,
  indeterminate = false,
  "aria-label": ariaLabel
}: CheckboxProps) => {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <label
      className={cn("flex items-center gap-2", className)}
      htmlFor={checkboxId}
    >
      <BaseCheckbox.Root
        aria-label={ariaLabel}
        checked={checked}
        className={cn(
          "flex size-3.5 shrink-0 items-center justify-center rounded-sm border border-input bg-background transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground",
          (checked || indeterminate) && "bg-foreground border-foreground"
        )}
        disabled={disabled}
        id={checkboxId}
        indeterminate={indeterminate}
        onCheckedChange={onCheckedChange}
      >
        <BaseCheckbox.Indicator className="flex items-center justify-center text-background">
          {indeterminate ? (
            <MinusIcon aria-hidden="true" className="size-2.5" />
          ) : (
            <CheckIcon aria-hidden="true" className="size-2.5" />
          )}
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
};

export type { CheckboxProps };
export { Checkbox };
