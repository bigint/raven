import type { HTMLAttributes } from "react";
import { cn } from "../cn";

type SectionLabelProps = HTMLAttributes<HTMLDivElement>;

const SectionLabel = ({ className, children, ...props }: SectionLabelProps) => (
  <div
    className={cn(
      "text-[10px] uppercase tracking-[0.08em] font-medium text-muted-foreground",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type { SectionLabelProps };
export { SectionLabel };
