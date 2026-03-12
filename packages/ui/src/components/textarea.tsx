"use client";

import type { TextareaHTMLAttributes } from "react";
import { cn } from "../cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  description?: string;
  error?: string;
  label?: string;
}

const Textarea = ({
  className,
  description,
  error,
  id,
  label,
  ...props
}: TextareaProps) => (
  <div className="space-y-1.5">
    {label && (
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
    )}
    <textarea
      className={cn(
        "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
        error && "border-destructive focus:ring-destructive",
        className
      )}
      id={id}
      {...props}
    />
    {description && !error && (
      <p className="text-xs text-muted-foreground">{description}</p>
    )}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

export { Textarea };
export type { TextareaProps };
