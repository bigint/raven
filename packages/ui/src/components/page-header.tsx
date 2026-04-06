import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  backHref?: string;
}

const PageHeader = ({
  title,
  description,
  actions,
  backHref
}: PageHeaderProps) => (
  <div className="mb-8">
    {backHref && (
      <a
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        href={backHref}
      >
        <ArrowLeft className="size-3.5" />
        Back
      </a>
    )}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  </div>
);

export type { PageHeaderProps };
export { PageHeader };
