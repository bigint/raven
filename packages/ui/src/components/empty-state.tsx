import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <div className="rounded-xl border border-border p-12 text-center">
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
