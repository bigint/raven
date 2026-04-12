import type { ReactNode } from "react";
import { cn } from "../cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  bordered?: boolean;
  compact?: boolean;
}

const EmptyState = ({
  icon,
  title,
  description,
  action,
  bordered = true,
  compact = false
}: EmptyStateProps) => (
  <div
    className={cn(
      compact
        ? "py-8 px-4 flex flex-col items-center text-center"
        : "py-14 px-6 flex flex-col items-center text-center",
      bordered && "rounded-xl border border-border"
    )}
  >
    {icon && (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-muted text-muted-foreground",
          compact ? "size-8 mb-2" : "size-10 mb-3"
        )}
      >
        {icon}
      </div>
    )}
    <h2 className="text-sm font-medium text-foreground">{title}</h2>
    {description && (
      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
        {description}
      </p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export type { EmptyStateProps };
export { EmptyState };
