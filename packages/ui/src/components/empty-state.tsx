import type { ReactNode } from "react";
import { cn } from "../cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  bordered?: boolean;
}

const EmptyState = ({
  icon,
  title,
  description,
  action,
  bordered = true
}: EmptyStateProps) => (
  <div
    className={cn(
      "p-12 text-center",
      bordered && "rounded-xl border border-border"
    )}
  >
    {icon && (
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
    )}
    <p className="font-medium text-foreground">{title}</p>
    {description && (
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export { EmptyState };
export type { EmptyStateProps };
