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
      <Field.Label className="mb-1.5 block text-[10px] font-medium text-muted-foreground uppercase tracking-[0.08em]">
        {label}
      </Field.Label>
    )}
    <Field.Control
      className={cn(
        "w-full h-8 rounded-md border border-input bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring data-[invalid]:border-foreground data-[invalid]:ring-1 data-[invalid]:ring-foreground",
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
      <Field.Error className="mt-1.5 text-xs font-medium text-foreground">
        {error}
      </Field.Error>
    )}
  </Field.Root>
);

export type { InputProps };
export { Input };
