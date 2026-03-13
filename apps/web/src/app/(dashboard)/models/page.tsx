"use client";

import { PageHeader, PillTabs } from "@raven/ui";
import { ModelsTable } from "./components/models-table";
import { useModels } from "./hooks/use-models";

const ModelsPage = () => {
  const { data, dateRange, dateRangeOptions, error, isLoading, setDateRange } =
    useModels();

  return (
    <div>
      <PageHeader
        description="Model usage analytics across all providers."
        title="Models"
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

      <ModelsTable data={data} loading={isLoading} />
    </div>
  );
};

export default ModelsPage;
