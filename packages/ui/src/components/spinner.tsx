import { cn } from "../cn";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  lg: "size-6",
  md: "size-4",
  sm: "size-3"
};

const Spinner = ({ className, size = "md" }: SpinnerProps) => (
  <div
    aria-label="Loading"
    className={cn(
      "animate-spin rounded-full border border-border border-t-foreground",
      sizeMap[size],
      className
    )}
    role="status"
  />
);

export type { SpinnerProps };
export { Spinner };
