import { cn } from "../cn";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  lg: "size-8",
  md: "size-6",
  sm: "size-4"
};

const Spinner = ({ className, size = "md" }: SpinnerProps) => (
  // biome-ignore lint/a11y/useSemanticElements: spinner uses role="status" for a11y
  <div
    aria-label="Loading"
    className={cn(
      "animate-spin rounded-full border-2 border-muted-foreground border-t-transparent",
      sizeMap[size],
      className
    )}
    role="status"
  />
);

export type { SpinnerProps };
export { Spinner };
