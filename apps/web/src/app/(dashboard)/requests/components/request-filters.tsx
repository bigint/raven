"use client";

import { Button, cn, PillTabs, Select } from "@raven/ui";
import { Radio } from "lucide-react";
import {
  DATE_RANGE_OPTIONS,
  type DateRange,
  PROVIDER_FILTER_OPTIONS,
  STATUS_OPTIONS
} from "../hooks/use-requests";

interface RequestFiltersProps {
  readonly provider: string;
  readonly onProviderChange: (value: string) => void;
  readonly statusFilter: string;
  readonly onStatusChange: (value: string) => void;
  readonly dateRange: DateRange;
  readonly onDateRangeChange: (value: DateRange) => void;
  readonly total: number;
  readonly isLive: boolean;
  readonly onToggleLive: () => void;
}

const RequestFilters = ({
  provider,
  onProviderChange,
  statusFilter,
  onStatusChange,
  dateRange,
  onDateRangeChange,
  total,
  isLive,
  onToggleLive
}: RequestFiltersProps) => (
  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
    <Select
      className="w-full sm:w-44"
      disabled={isLive}
      onChange={onProviderChange}
      options={PROVIDER_FILTER_OPTIONS}
      value={provider}
    />

    <Select
      className="w-full sm:w-40"
      disabled={isLive}
      onChange={onStatusChange}
      options={STATUS_OPTIONS}
      value={statusFilter}
    />

    {!isLive && (
      <PillTabs
        onChange={onDateRangeChange}
        options={DATE_RANGE_OPTIONS}
        value={dateRange}
      />
    )}

    <Button
      className={
        isLive
          ? "bg-red-500/10 text-red-600 border border-red-500/30 hover:bg-red-500/20"
          : ""
      }
      onClick={onToggleLive}
      variant={isLive ? "primary" : "secondary"}
    >
      <Radio className={cn("size-4", isLive && "animate-pulse")} />
      {isLive ? "Exit Live" : "Go Live"}
    </Button>

    {!isLive && total > 0 && (
      <span className="ml-auto text-sm text-muted-foreground">
        {total.toLocaleString()} total
      </span>
    )}
  </div>
);

export { RequestFilters };
