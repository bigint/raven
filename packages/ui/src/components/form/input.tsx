"use client";

import { Field } from "@base-ui/react/field";
import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "../../cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  description?: string;
}

const Input = ({
  className,
  label,
  error,
  description,
  ref,
  ...props
}: InputProps & { ref?: Ref<HTMLInputElement> }) => (
  <Field.Root invalid={!!error}>
    {label && (
      <Field.Label className="mb-1 block text-sm font-medium">
        {label}
      </Field.Label>
    )}
    <Field.Control
      className={cn(
        "w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[invalid]:border-destructive data-[invalid]:focus-visible:ring-destructive",
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
);

export type { InputProps };
export { Input };
