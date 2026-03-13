"use client";

import { PillTabs } from "@raven/ui";
import type { DateRange } from "../hooks/use-logs";

interface LogsFiltersProps {
  dateRange: DateRange;
  dateRangeOptions: { value: DateRange; label: string }[];
  onDateRangeChange: (range: DateRange) => void;
}

export const LogsFilters = ({
  dateRange,
  dateRangeOptions,
  onDateRangeChange
}: LogsFiltersProps) => (
  <PillTabs
    className="mb-6"
    onChange={onDateRangeChange}
    options={dateRangeOptions}
    value={dateRange}
  />
);
