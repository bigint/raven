"use client";

import { memo, type ReactNode } from "react";
import { cn } from "../cn";

interface LogStreamProps<T> {
  className?: string;
  rows: readonly T[];
  rowKey: (row: T, index: number) => string;
  renderRow: (row: T, index: number) => ReactNode;
  maxHeight?: string;
  emptyState?: ReactNode;
}

const LogRow = memo(
  ({ children }: { children: ReactNode }): ReactNode => (
    <div className="px-3.5 py-2 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors font-mono text-[12px] leading-5">
      {children}
    </div>
  )
);
LogRow.displayName = "LogRow";

const LogStream = <T,>({
  className,
  rows,
  rowKey,
  renderRow,
  maxHeight = "480px",
  emptyState
}: LogStreamProps<T>): ReactNode => {
  if (rows.length === 0 && emptyState) {
    return <div className={cn("p-6", className)}>{emptyState}</div>;
  }
  return (
    <div
      className={cn(
        "overflow-auto border border-border rounded-lg bg-card",
        className
      )}
      style={{ maxHeight }}
    >
      {rows.map((row, index) => (
        <LogRow key={rowKey(row, index)}>{renderRow(row, index)}</LogRow>
      ))}
    </div>
  );
};

export type { LogStreamProps };
export { LogStream };
