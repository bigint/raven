"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "../cn";
import { EmptyState } from "./empty-state";
import { Spinner } from "./spinner";

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
  animateRows?: boolean;
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
  animateRows = false
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
      <EmptyState action={emptyAction} icon={emptyIcon} title={emptyTitle} />
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                className={cn(
                  "px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:px-5 sm:py-3",
                  col.headerClassName
                )}
                key={col.key}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {animateRows ? (
            <AnimatePresence initial={false}>
              {data.map((item, idx) => (
                <motion.tr
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "transition-colors hover:bg-muted/30",
                    idx !== data.length - 1 && "border-b border-border"
                  )}
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0, y: -8 }}
                  key={keyExtractor(item)}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {columns.map((col) => (
                    <td
                      className={cn("px-3 py-3 sm:px-5 sm:py-4", col.className)}
                      key={col.key}
                    >
                      {col.render(item, idx)}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          ) : (
            data.map((item, idx) => (
              <tr
                className={cn(
                  "transition-colors hover:bg-muted/30",
                  idx !== data.length - 1 && "border-b border-border"
                )}
                key={keyExtractor(item)}
              >
                {columns.map((col) => (
                  <td
                    className={cn("px-3 py-3 sm:px-5 sm:py-4", col.className)}
                    key={col.key}
                  >
                    {col.render(item, idx)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export type { Column, DataTableProps };
export { DataTable };
