import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        error: "bg-destructive/10 text-destructive",
        info: "bg-info/10 text-info",
        primary: "bg-primary/10 text-primary",
      },
      dot: {
        true: "",
        false: "",
      },
    },
    defaultVariants: {
      variant: "neutral",
      dot: false,
    },
  }
);

const dotColorMap: Record<string, string> = {
  neutral: "bg-muted-foreground",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
  info: "bg-info",
  primary: "bg-primary",
};

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

const Badge = ({ className, variant, dot, children, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant, dot, className }))} {...props}>
    {dot && (
      <span
        className={cn(
          "size-1.5 rounded-full",
          dotColorMap[variant ?? "neutral"]
        )}
      />
    )}
    {children}
  </span>
);

export { Badge, badgeVariants };
export type { BadgeProps };
