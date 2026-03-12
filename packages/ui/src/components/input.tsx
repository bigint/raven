import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  description?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, description, id, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        className={cn(
          "w-full rounded-[var(--radius-md)] border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
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
Input.displayName = "Input";

export { Input };
export type { InputProps };
