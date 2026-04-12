import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { cn } from "../cn";

interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  className?: string;
  segments: readonly BreadcrumbSegment[];
}

const Breadcrumb = ({ className, segments }: BreadcrumbProps): ReactNode => (
  <nav
    aria-label="Breadcrumb"
    className={cn("flex items-center gap-1.5 text-sm", className)}
  >
    {segments.map((segment, index) => {
      const isLast = index === segments.length - 1;
      return (
        <Fragment key={`${segment.label}-${index}`}>
          {index > 0 && (
            <span aria-hidden="true" className="text-border select-none">
              /
            </span>
          )}
          {segment.href && !isLast ? (
            <Link
              className="text-muted-foreground hover:text-foreground transition-colors"
              href={segment.href}
            >
              {segment.label}
            </Link>
          ) : (
            <span
              aria-current={isLast ? "page" : undefined}
              className={cn(
                isLast ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              {segment.label}
            </span>
          )}
        </Fragment>
      );
    })}
  </nav>
);

export type { BreadcrumbProps, BreadcrumbSegment };
export { Breadcrumb };
