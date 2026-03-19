"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "../cn";
import { EmptyState } from "./empty-state";
import { Spinner } from "./spinner";

interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
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
  hiddenColumns?: string[];
  onToggleColumn?: (key: string) => void;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string) => void;
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
  animateRows = false,
  hiddenColumns,
  onToggleColumn,
  sortKey,
  sortDirection,
  onSort
}: DataTableProps<T>) => {
  const visibleColumns = hiddenColumns
    ? columns.filter((col) => !hiddenColumns.includes(col.key))
    : columns;

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
    <div>
      {onToggleColumn && (
        <div className="mb-2 flex justify-end">
          <details className="relative">
            <summary className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50">
              Columns
            </summary>
            <div className="absolute right-0 z-10 mt-1 min-w-[160px] rounded-md border border-border bg-background p-2 shadow-md">
              {columns.map((col) => (
                <label
                  className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50"
                  key={col.key}
                >
                  <input
                    checked={!hiddenColumns?.includes(col.key)}
                    onChange={() => onToggleColumn(col.key)}
                    type="checkbox"
                  />
                  {col.header}
                </label>
              ))}
            </div>
          </details>
        </div>
      )}
      <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {visibleColumns.map((col) => {
                const isSortable = col.sortable && onSort;
                const isActiveSort = sortKey === col.key;

                const SortIcon = isActiveSort
                  ? sortDirection === "asc"
                    ? ArrowUp
                    : ArrowDown
                  : ArrowUpDown;

                return (
                  <th
                    className={cn(
                      "px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:px-5 sm:py-3",
                      col.headerClassName
                    )}
                    key={col.key}
                  >
                    {isSortable ? (
                      <button
                        className="inline-flex items-center gap-1 cursor-pointer select-none"
                        onClick={() => onSort(col.key)}
                        type="button"
                      >
                        {col.header}
                        <SortIcon
                          className={cn(
                            "size-3.5",
                            isActiveSort
                              ? "text-foreground"
                              : "text-muted-foreground/50"
                          )}
                        />
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        {col.header}
                      </span>
                    )}
                  </th>
                );
              })}
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
                      "border-b border-border last:border-b-0"
                    )}
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0, y: -8 }}
                    key={keyExtractor(item)}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {visibleColumns.map((col) => (
                      <td
                        className={cn(
                          "px-3 py-3 sm:px-5 sm:py-4",
                          col.className
                        )}
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
                  {visibleColumns.map((col) => (
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
    </div>
  );
};

export type { Column, DataTableProps };
export { DataTable };
