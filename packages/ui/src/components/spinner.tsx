import { cn } from "../cn";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
};

const Spinner = ({ className, size = "md" }: SpinnerProps) => (
  <div
    className={cn(
      "animate-spin rounded-full border-2 border-muted-foreground border-t-transparent",
      sizeMap[size],
      className
    )}
    role="status"
    aria-label="Loading"
  />
);

export { Spinner };
export type { SpinnerProps };
