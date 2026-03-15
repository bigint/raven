"use client";

import { Field } from "@base-ui/react/field";
import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
  description?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, description, id, ...props }, ref) => (
    <Field.Root invalid={!!error}>
      {label && (
        <Field.Label className="mb-1.5 block text-sm font-medium" htmlFor={id}>
          {label}
        </Field.Label>
      )}
      <textarea
        className={cn(
          "w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
          error && "border-destructive focus:ring-destructive",
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
        <Field.Error className="mt-1.5 text-xs text-destructive">
          {error}
        </Field.Error>
      )}
    </Field.Root>
  )
);
Textarea.displayName = "Textarea";

export type { TextareaProps };
export { Textarea };
