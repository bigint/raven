import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";
import { SectionLabel } from "./section-label";
import { Sparkline } from "./sparkline";

interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: string;
  sparkline?: readonly number[];
}

const MetricCard = ({
  className,
  label,
  value,
  unit,
  delta,
  sparkline,
  ...props
}: MetricCardProps) => (
  <div
    className={cn(
      "rounded-lg border border-border bg-card px-3.5 py-3",
      className
    )}
    {...props}
  >
    <SectionLabel>{label}</SectionLabel>
    <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums leading-none">
      {value}
      {unit && (
        <span className="ml-0.5 text-sm font-normal text-muted-foreground">
          {unit}
        </span>
      )}
    </div>
    {(sparkline || delta) && (
      <div className="mt-2.5 flex items-center gap-2">
        {sparkline && <Sparkline data={sparkline} height={16} width={60} />}
        {delta && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {delta}
          </span>
        )}
      </div>
    )}
  </div>
);

export type { MetricCardProps };
export { MetricCard };
