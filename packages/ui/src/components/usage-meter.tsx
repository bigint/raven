import type { HTMLAttributes } from "react";
import { cn } from "../cn";
import { SectionLabel } from "./section-label";

interface UsageMeterProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  used: number;
  total: number;
  formatValue?: (value: number) => string;
  resetsAt?: string;
}

const defaultFormat = (value: number): string => value.toLocaleString("en-US");

const UsageMeter = ({
  className,
  label,
  used,
  total,
  formatValue = defaultFormat,
  resetsAt,
  ...props
}: UsageMeterProps) => {
  const percent = Math.min(100, Math.round((used / total) * 100));
  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...props}>
      <div className="flex items-center justify-between">
        <SectionLabel>{label}</SectionLabel>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {percent}%
        </span>
      </div>
      <div className="h-1 rounded-sm bg-muted overflow-hidden">
        <div
          className="h-full bg-foreground transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>
          {formatValue(used)} / {formatValue(total)}
        </span>
        {resetsAt && <span>Resets {resetsAt}</span>}
      </div>
    </div>
  );
};

export type { UsageMeterProps };
export { UsageMeter };
