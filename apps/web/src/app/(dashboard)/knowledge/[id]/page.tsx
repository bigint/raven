"use client";

import { PageHeader, Spinner, Tabs } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { collectionDetailQueryOptions } from "../hooks/use-collections";
import { CollectionStats } from "./components/collection-stats";
import { DocumentsTab } from "./components/documents-tab";
import { SearchTab } from "./components/search-tab";

const TABS = [
  { label: "Overview", value: "overview" },
  { label: "Documents", value: "documents" },
  { label: "Search", value: "search" }
];

const CollectionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "overview";

  const setTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const qs = params.toString();
    router.replace(`?${qs}`, { scroll: false });
  };

  const {
    data: collection,
    isLoading,
    error
  } = useQuery(collectionDetailQueryOptions(id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div
        className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        role="alert"
      >
        {error?.message ?? "Collection not found"}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        description={collection.description ?? undefined}
        title={collection.name}
      />

      <Tabs onChange={setTab} tabs={TABS} value={tab} />

      {tab === "overview" && <CollectionStats collection={collection} />}
      {tab === "documents" && <DocumentsTab collectionId={id} />}
      {tab === "search" && <SearchTab collectionId={id} />}
    </div>
  );
};

export default CollectionDetailPage;
