import { cn } from "../cn";

interface SpinnerProps {
  className?: string;
  label?: string;
}

const Spinner = ({ className, label = "Loading..." }: SpinnerProps) => (
  <div className="flex flex-col items-center justify-center py-12">
    <div
      className={cn(
        "size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent",
        className
      )}
    />
    {label && (
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
    )}
  </div>
);

export { Spinner };
export type { SpinnerProps };
