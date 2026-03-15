"use client";

import { Field } from "@base-ui/react/field";
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  description?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, description, ...props }, ref) => (
    <Field.Root invalid={!!error}>
      {label && (
        <Field.Label className="mb-1 block text-sm font-medium">
          {label}
        </Field.Label>
      )}
      <Field.Control
        className={cn(
          "w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring data-[invalid]:border-destructive data-[invalid]:focus:ring-destructive",
          className
        )}
        ref={ref}
        render={<input />}
        {...props}
      />
      {description && !error && (
        <Field.Description className="mt-1.5 text-xs text-muted-foreground">
          {description}
        </Field.Description>
      )}
      {error && (
        <Field.Error className="mt-1.5 text-xs text-destructive">
          {error}
        </Field.Error>
      )}
    </Field.Root>
  )
);
Input.displayName = "Input";

export type { InputProps };
export { Input };
