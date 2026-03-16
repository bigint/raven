"use client";

import type { Column } from "@raven/ui";
import { DataTable } from "@raven/ui";
import { DollarSign } from "lucide-react";
import type { CostBreakdown } from "../hooks/use-finops";

type BreakdownRow = CostBreakdown["breakdown"][number];

interface CostTableProps {
  data: CostBreakdown | null;
  loading: boolean;
  label: string;
}

const columns: Column<BreakdownRow>[] = [
  {
    className: "font-medium",
    header: "Name",
    key: "value",
    render: (row) => row.value
  },
  {
    className: "tabular-nums",
    header: "Cost",
    key: "cost",
    render: (row) => `$${row.cost.toFixed(4)}`
  },
  {
    className: "tabular-nums text-muted-foreground",
    header: "Requests",
    key: "requests",
    render: (row) => row.requests.toLocaleString()
  },
  {
    header: "Percentage",
    key: "percentage",
    render: (row) => (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-primary"
            style={{ width: `${row.percentage}%` }}
          />
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">
          {row.percentage.toFixed(1)}%
        </span>
      </div>
    )
  }
];

export const CostTable = ({ data, loading, label }: CostTableProps) => {
  const rows = data?.breakdown ?? [];

  return (
    <div>
      <h2 className="mb-4 text-base font-semibold">Cost by {label}</h2>
      <DataTable
        columns={columns}
        data={rows}
        emptyIcon={<DollarSign className="size-8" />}
        emptyTitle={`No ${label.toLowerCase()} cost data yet`}
        keyExtractor={(row) => `${row.key}-${row.value}`}
        loading={loading}
        loadingMessage="Loading cost data..."
      />
    </div>
  );
};
