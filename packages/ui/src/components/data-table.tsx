import type { ReactNode } from "react";

interface Column<T> {
  align?: "left" | "right";
  header: string;
  key: string;
  render: (row: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
}

const DataTable = <T,>({ columns, data, rowKey }: DataTableProps<T>) => (
  <div className="rounded-xl border border-border">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border">
          {columns.map((col) => (
            <th
              className={`px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground ${
                col.align === "right" ? "text-right" : "text-left"
              }`}
              key={col.key}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr
            className={`transition-colors hover:bg-muted/30 ${
              idx !== data.length - 1 ? "border-b border-border" : ""
            }`}
            key={rowKey(row)}
          >
            {columns.map((col) => (
              <td
                className={`px-5 py-4 ${
                  col.align === "right" ? "text-right" : ""
                }`}
                key={col.key}
              >
                {col.render(row, idx)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export { DataTable };
export type { Column, DataTableProps };
