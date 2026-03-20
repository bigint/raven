"use client";

import { Button, PageHeader, Tabs } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { match } from "ts-pattern";
import { keysQueryOptions } from "@/app/(dashboard)/keys/hooks/use-keys";
import { AdoptionTab } from "./components/adoption-tab";
import { ModelsTab } from "./components/models-tab";
import { OverviewTab } from "./components/overview-tab";
import { ToolsTab } from "./components/tools-tab";

type AnalyticsTab = "overview" | "models" | "tools" | "adoption";

const TAB_DESCRIPTIONS: Record<AnalyticsTab, string> = {
  adoption: "Top users and usage statistics.",
  models: "Model usage analytics across all providers.",
  overview: "Token usage, costs, and cache performance.",
  tools: "Tool call activity and session breakdowns."
};

const KeyFilterBanner = ({ keyId }: { keyId: string }) => {
  const { data: keys } = useQuery(keysQueryOptions());
  const keyName = keys?.find((k) => k.id === keyId)?.name ?? keyId;

  return (
    <div className="mb-4 flex items-center justify-between rounded-md border border-border bg-muted/50 px-4 py-3">
      <span className="text-sm text-muted-foreground">
        Filtered by key:{" "}
        <span className="font-medium text-foreground">{keyName}</span>
      </span>
      <Link href="/analytics">
        <Button size="sm" variant="ghost">
          <X className="size-4" />
          Clear filter
        </Button>
      </Link>
    </div>
  );
};

const AnalyticsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const keyId = searchParams.get("keyId") ?? undefined;

  const tab = (searchParams.get("tab") as AnalyticsTab) ?? "overview";
  const setTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`?${params.toString()}`);
  };

  const tabs = [
    { label: "Overview", value: "overview" },
    { label: "Models", value: "models" },
    { label: "Tools", value: "tools" },
    { label: "Adoption", value: "adoption" }
  ];

  return (
    <div>
      <PageHeader description={TAB_DESCRIPTIONS[tab]} title="Analytics" />

      {keyId && <KeyFilterBanner keyId={keyId} />}

      <Tabs onChange={setTab} tabs={tabs} value={tab} />

      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}
      >
        {match(tab)
          .with("overview", () => <OverviewTab keyId={keyId} />)
          .with("models", () => <ModelsTab keyId={keyId} />)
          .with("tools", () => <ToolsTab keyId={keyId} />)
          .with("adoption", () => <AdoptionTab keyId={keyId} />)
          .otherwise(() => null)}
      </Suspense>
    </div>
  );
};

export default AnalyticsPage;
