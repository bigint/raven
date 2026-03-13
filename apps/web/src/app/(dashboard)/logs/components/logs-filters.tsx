"use client";

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
  <div className="mb-6 flex items-center gap-1 overflow-x-auto rounded-lg border border-border p-1 w-fit">
    {dateRangeOptions.map((opt) => (
      <button
        className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
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
);
