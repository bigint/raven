import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
  {
    defaultVariants: {
      mono: false,
      variant: "outline"
    },
    variants: {
      mono: {
        false: "",
        true: "font-mono text-[11px]"
      },
      variant: {
        outline: "border border-border text-muted-foreground bg-transparent",
        solid: "bg-primary text-primary-foreground",
        subtle: "bg-muted text-foreground"
      }
    }
  }
);

type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & {
    dot?: boolean;
  };

const Badge = ({
  className,
  variant,
  mono,
  dot,
  children,
  ...props
}: BadgeProps) => (
  <span className={cn(badgeVariants({ className, mono, variant }))} {...props}>
    {dot && <span className="size-1.5 rounded-full bg-current opacity-70" />}
    {children}
  </span>
);

export type { BadgeProps };
export { Badge, badgeVariants };
