"use client";

import { PageHeader } from "@raven/ui";
import { ToolChart } from "./components/tool-chart";
import { ToolSessionsTable } from "./components/tool-sessions-table";
import { useTools } from "./hooks/use-tools";

const ToolsPage = () => {
  const {
    chartData,
    dateRange,
    dateRangeOptions,
    error,
    isLoading,
    page,
    pagination,
    sessions,
    setDateRange,
    setPage
  } = useTools();

  return (
    <div>
      <PageHeader
        description="Sessions with tool use activity. View tool call breakdowns by type for each session."
        title="Tool Use"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mb-6 flex items-center gap-1 overflow-x-auto rounded-lg border border-border p-1 w-fit">
        {dateRangeOptions.map((opt) => (
          <button
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              dateRange === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            key={opt.value}
            onClick={() => setDateRange(opt.value)}
            type="button"
          >
            {opt.label}
          </button>
        ))}
      </div>

      <ToolChart data={chartData} />

      <ToolSessionsTable
        loading={isLoading}
        onPageChange={setPage}
        page={page}
        sessions={sessions}
        totalPages={pagination?.totalPages ?? 1}
      />
    </div>
  );
};

export default ToolsPage;
