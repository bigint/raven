"use client";

import { PageHeader, PillTabs } from "@raven/ui";
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

      <PillTabs
        className="mb-6"
        onChange={setDateRange}
        options={dateRangeOptions}
        value={dateRange}
      />

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
