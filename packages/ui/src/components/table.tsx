"use client";

import { Popover } from "@base-ui/react/popover";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "../cn";
import { EmptyState } from "./empty";
import { Checkbox } from "./form/checkbox";
import { Spinner } from "./spinner";

interface Column<T> {
  readonly key: string;
  readonly header: string;
  readonly sortable?: boolean;
  readonly className?: string;
  readonly headerClassName?: string;
  readonly numeric?: boolean;
  readonly width?: string | number;
  readonly render: (item: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  readonly columns: Column<T>[];
  readonly data: T[];
  readonly keyExtractor: (item: T) => string;
  readonly loading?: boolean;
  readonly loadingMessage?: string;
  readonly emptyIcon?: ReactNode;
  readonly emptyTitle?: string;
  readonly emptyAction?: ReactNode;
  readonly animateRows?: boolean;
  readonly hiddenColumns?: string[];
  readonly onToggleColumn?: (key: string) => void;
  readonly sortKey?: string;
  readonly sortDirection?: "asc" | "desc";
  readonly onSort?: (key: string) => void;
  readonly maxDisplayRows?: number;
}

const DataTable = <T,>({
  columns,
  data,
  keyExtractor,
  loading = false,
  loadingMessage = "Loading…",
  emptyIcon,
  emptyTitle = "No data",
  emptyAction,
  animateRows = false,
  hiddenColumns,
  onToggleColumn,
  sortKey,
  sortDirection,
  onSort,
  maxDisplayRows
}: DataTableProps<T>) => {
  const visibleColumns = hiddenColumns
    ? columns.filter((col) => !hiddenColumns.includes(col.key))
    : columns;

  const displayData = maxDisplayRows ? data.slice(0, maxDisplayRows) : data;
  const isLargeDataset = animateRows && data.length > 50;

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
          <Popover.Root>
            <Popover.Trigger
              aria-label="Toggle columns"
              className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50"
            >
              Columns
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner align="end" sideOffset={4}>
                <Popover.Popup className="min-w-[160px] rounded-md border border-border bg-background p-2 shadow-md outline-none">
                  {columns.map((col) => (
                    <Checkbox
                      checked={!hiddenColumns?.includes(col.key)}
                      className="rounded px-2 py-1 text-sm hover:bg-muted/50"
                      key={col.key}
                      label={col.header}
                      onCheckedChange={() => onToggleColumn(col.key)}
                    />
                  ))}
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>
      )}
      <div className="border border-border rounded-lg overflow-hidden bg-card overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted border-b border-border">
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
                      "text-[10px] uppercase tracking-[0.08em] font-medium text-muted-foreground px-3 py-2 text-left",
                      col.numeric && "text-right",
                      col.headerClassName
                    )}
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {isSortable ? (
                      <button
                        aria-label={`Sort by ${col.header}`}
                        className="inline-flex items-center gap-1 cursor-pointer select-none"
                        onClick={() => onSort(col.key)}
                        type="button"
                      >
                        {col.header}
                        <SortIcon
                          aria-hidden="true"
                          className={cn(
                            "size-3",
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
                {displayData.map((item, idx) => (
                  <motion.tr
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
                    )}
                    {...(isLargeDataset
                      ? {}
                      : {
                          exit: { opacity: 0 },
                          initial: { opacity: 0, y: -8 }
                        })}
                    key={keyExtractor(item)}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {visibleColumns.map((col) => (
                      <td
                        className={cn(
                          "px-3 py-2.5 text-foreground",
                          col.numeric &&
                            "font-mono text-[12.5px] tabular-nums text-right",
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
              displayData.map((item, idx) => (
                <tr
                  className={cn(
                    "border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
                  )}
                  key={keyExtractor(item)}
                >
                  {visibleColumns.map((col) => (
                    <td
                      className={cn(
                        "px-3 py-2.5 text-foreground",
                        col.numeric &&
                          "font-mono text-[12.5px] tabular-nums text-right",
                        col.className
                      )}
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
