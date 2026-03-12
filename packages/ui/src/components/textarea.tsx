import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
  description?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, description, id, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium" htmlFor={id}>
          {label}
        </label>
      )}
      <textarea
        className={cn(
          "w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-y",
          error && "border-destructive focus:ring-destructive",
          className
        )}
        id={id}
        ref={ref}
        {...props}
      />
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
export type { TextareaProps };
