"use client";

import { Field } from "@base-ui/react/field";
import type { Ref, TextareaHTMLAttributes } from "react";
import { cn } from "../../cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
  description?: string;
}

const Textarea = ({
  className,
  label,
  error,
  description,
  id,
  ref,
  ...props
}: TextareaProps & { ref?: Ref<HTMLTextAreaElement> }) => (
  <Field.Root invalid={!!error}>
    {label && (
      <Field.Label
        className="mb-1.5 block text-[10px] font-medium text-muted-foreground uppercase tracking-[0.08em]"
        htmlFor={id}
      >
        {label}
      </Field.Label>
    )}
    <textarea
      className={cn(
        "w-full min-h-[80px] rounded-md border border-input bg-background px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring resize-y data-[invalid]:border-foreground data-[invalid]:ring-1 data-[invalid]:ring-foreground",
        error && "border-foreground ring-1 ring-foreground",
        className
      )}
      id={id}
      ref={ref}
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

export type { TextareaProps };
export { Textarea };
