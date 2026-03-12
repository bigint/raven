import type { ReactNode } from "react";

interface EmptyStateProps {
  action?: ReactNode;
  icon?: ReactNode;
  message: string;
}

const EmptyState = ({ action, icon, message }: EmptyStateProps) => (
  <div className="rounded-xl border border-border p-12 text-center">
    {icon && (
      <div className="mx-auto mb-3 text-muted-foreground/50">{icon}</div>
    )}
    <p className="text-muted-foreground">{message}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export { EmptyState };
export type { EmptyStateProps };
