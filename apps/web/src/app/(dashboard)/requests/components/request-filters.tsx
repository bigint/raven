"use client";

import { Select } from "@raven/ui";
import {
  DATE_RANGE_OPTIONS,
  type DateRange,
  PROVIDER_FILTER_OPTIONS,
  STATUS_OPTIONS
} from "../hooks/use-requests";

interface RequestFiltersProps {
  provider: string;
  onProviderChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (value: DateRange) => void;
  total: number;
}

const RequestFilters = ({
  provider,
  onProviderChange,
  statusFilter,
  onStatusChange,
  dateRange,
  onDateRangeChange,
  total
}: RequestFiltersProps) => (
  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
    <Select
      className="w-full sm:w-44"
      onChange={onProviderChange}
      options={PROVIDER_FILTER_OPTIONS}
      value={provider}
    />

    <Select
      className="w-full sm:w-40"
      onChange={onStatusChange}
      options={STATUS_OPTIONS}
      value={statusFilter}
    />

    <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border p-1">
      {DATE_RANGE_OPTIONS.map((opt) => (
        <button
          className={`shrink-0 rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            dateRange === opt.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          key={opt.value}
          onClick={() => onDateRangeChange(opt.value)}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>

    {total > 0 && (
      <span className="ml-auto text-sm text-muted-foreground">
        {total.toLocaleString()} total
      </span>
    )}
  </div>
);

export { RequestFilters };
