import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "../cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
  {
    defaultVariants: {
      variant: "neutral",
    },
    variants: {
      variant: {
        error: "bg-destructive/10 text-destructive",
        neutral: "bg-muted text-muted-foreground",
        primary: "bg-primary/10 text-primary",
        success: "bg-green-500/10 text-green-600",
        warning: "bg-yellow-500/10 text-yellow-600",
      },
    },
  }
);

type BadgeVariants = VariantProps<typeof badgeVariants>;

interface BadgeProps extends BadgeVariants {
  children: React.ReactNode;
  className?: string;
}

const Badge = ({ children, className, variant }: BadgeProps) => (
  <span className={cn(badgeVariants({ className, variant }))}>{children}</span>
);

export { Badge, badgeVariants };
export type { BadgeProps };
