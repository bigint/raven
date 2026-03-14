"use client";

import { PageHeader, PillTabs } from "@raven/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { ModelCatalog } from "./components/model-catalog";
import { ModelsTable } from "./components/models-table";
import { useModels } from "./hooks/use-models";

type Tab = "catalog" | "usage";

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { label: "Catalog", value: "catalog" },
  { label: "Usage", value: "usage" }
];

const ModelsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tab = (searchParams.get("tab") as Tab) ?? "catalog";
  const setTab = (value: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`?${params.toString()}`);
  };

  const { data, dateRange, dateRangeOptions, error, isLoading, setDateRange } =
    useModels();

  return (
    <div>
      <PageHeader
        description={
          tab === "catalog"
            ? "All models supported by Raven across providers."
            : "Model usage analytics across all providers."
        }
        title="Models"
      />

      <PillTabs
        className="mb-6"
        onChange={setTab}
        options={TAB_OPTIONS}
        value={tab}
      />

      {tab === "catalog" && <ModelCatalog />}

      {tab === "usage" && (
        <>
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
        </>
      )}
    </div>
  );
};

export default ModelsPage;
