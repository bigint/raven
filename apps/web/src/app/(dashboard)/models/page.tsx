"use client";

import { PageHeader } from "@raven/ui";
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

      <ModelsTable data={data} loading={isLoading} />
    </div>
  );
};

export default ModelsPage;
