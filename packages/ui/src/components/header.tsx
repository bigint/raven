import { ArrowLeft } from "lucide-react";
import { Fragment, type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  breadcrumb?: ReactNode[];
  actions?: ReactNode;
  backHref?: string;
}

const PageHeader = ({
  title,
  subtitle,
  description,
  breadcrumb,
  actions,
  backHref
}: PageHeaderProps) => {
  const resolvedSubtitle = subtitle ?? description;

  return (
    <div className="flex items-start justify-between gap-4 pb-4 mb-6 border-b border-border">
      <div>
        {backHref && (
          <a
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            href={backHref}
          >
            <ArrowLeft className="size-3.5" />
            Back
          </a>
        )}
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            {breadcrumb.map((seg, i) => (
              <Fragment key={i}>
                {i > 0 && <span className="text-border">/</span>}
                <span>{seg}</span>
              </Fragment>
            ))}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {resolvedSubtitle && (
          <p className="text-sm text-muted-foreground mt-1">
            {resolvedSubtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
};

export type { PageHeaderProps };
export { PageHeader };
