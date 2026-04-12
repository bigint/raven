import type { HTMLAttributes } from "react";
import { cn } from "../cn";

type KbdProps = HTMLAttributes<HTMLElement>;

const Kbd = ({ className, children, ...props }: KbdProps) => (
  <kbd
    className={cn(
      "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-sm border border-border bg-muted font-mono text-[10px] font-medium text-muted-foreground leading-none",
      className
    )}
    {...props}
  >
    {children}
  </kbd>
);

export type { KbdProps };
export { Kbd };
