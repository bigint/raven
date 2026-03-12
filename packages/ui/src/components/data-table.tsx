"use client";

import type { ReactNode } from "react";
import { cn } from "../cn";
import { Spinner } from "./spinner";
import { EmptyState } from "./empty-state";

interface Column<T> {
  key: string;
  header: string;
  className?: string;
  headerClassName?: string;
  render: (item: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  loadingMessage?: string;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyAction?: ReactNode;
}

const DataTable = <T,>({
  columns,
  data,
  keyExtractor,
  loading = false,
  loadingMessage = "Loading...",
  emptyIcon,
  emptyTitle = "No data",
  emptyAction,
}: DataTableProps<T>) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-border p-12 text-center">
        <Spinner className="mx-auto" />
        <p className="mt-3 text-sm text-muted-foreground">{loadingMessage}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground",
                  col.headerClassName
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr
              key={keyExtractor(item)}
              className={cn(
                "transition-colors hover:bg-muted/30",
                idx !== data.length - 1 && "border-b border-border"
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn("px-5 py-4", col.className)}>
                  {col.render(item, idx)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export { DataTable };
export type { DataTableProps, Column };
