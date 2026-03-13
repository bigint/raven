"use client";

import { PillTabs, Select } from "@raven/ui";
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

    <PillTabs
      onChange={onDateRangeChange}
      options={DATE_RANGE_OPTIONS}
      value={dateRange}
    />

    {total > 0 && (
      <span className="ml-auto text-sm text-muted-foreground">
        {total.toLocaleString()} total
      </span>
    )}
  </div>
);

export { RequestFilters };
