import type { ReactNode } from "react";

interface PageHeaderProps {
  actions?: ReactNode;
  description?: string;
  title: string;
}

const PageHeader = ({ actions, description, title }: PageHeaderProps) => (
  <div className="mb-8 flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export { PageHeader };
export type { PageHeaderProps };
