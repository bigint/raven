import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../cn";

const statusDotVariants = cva("inline-block shrink-0 rounded-full", {
  defaultVariants: {
    size: "md",
    variant: "filled"
  },
  variants: {
    size: {
      lg: "size-2",
      md: "size-1.5",
      sm: "size-1"
    },
    variant: {
      error:
        "bg-foreground ring-[1.5px] ring-offset-[1px] ring-foreground ring-offset-background",
      filled: "bg-foreground",
      ring: "bg-transparent border-[1.5px] border-muted-foreground",
      striped:
        "bg-[repeating-linear-gradient(45deg,var(--color-muted-foreground)_0_1.5px,transparent_1.5px_3px)]"
    }
  }
});

interface StatusDotProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusDotVariants> {
  label?: string;
}

const StatusDot = ({
  className,
  size,
  variant,
  label,
  ...props
}: StatusDotProps) => (
  <span
    aria-label={label}
    className={cn(statusDotVariants({ className, size, variant }))}
    role="status"
    {...props}
  />
);

export type { StatusDotProps };
export { StatusDot, statusDotVariants };
