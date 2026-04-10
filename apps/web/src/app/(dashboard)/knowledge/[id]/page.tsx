"use client";

import { Button, ConfirmDialog, PageHeader, Spinner, Tabs } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Eraser, MessageSquare, Pencil, Terminal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  collectionDetailQueryOptions,
  useDeleteCollection,
  useTruncateCollection
} from "../hooks/use-collections";
import { useLiveLogs } from "../hooks/use-live-logs";
import { AnalyticsTab } from "./components/analytics-tab";
import { CollectionForm } from "./components/collection-form";
import { CollectionStats } from "./components/collection-stats";
import { DocumentsTab } from "./components/documents-tab";
import { ImportsTab } from "./components/imports-tab";
import { LiveLogsModal } from "./components/live-logs-modal";
import { SearchTab } from "./components/search-tab";

const TABS = [
  { label: "Overview", value: "overview" },
  { label: "Documents", value: "documents" },
  { label: "Imports", value: "imports" },
  { label: "Search", value: "search" },
  { label: "Analytics", value: "analytics" }
];

const CollectionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "overview";
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [truncateOpen, setTruncateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const deleteMutation = useDeleteCollection();
  const truncateMutation = useTruncateCollection();

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

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);
      router.push("/knowledge");
    } catch {
      // Error is handled by toast in the mutation hook
    }
  };

  const {
    data: collection,
    isLoading,
    error
  } = useQuery(collectionDetailQueryOptions(id));
  const {
    logs,
    connected,
    clear: clearLogs
  } = useLiveLogs(collection?.name ?? "", logsOpen);

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
        actions={
          <>
            <Link
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              href={`/chat?kb=${encodeURIComponent(id)}`}
            >
              <MessageSquare className="size-4" />
              Playground
            </Link>
            <Button onClick={() => setLogsOpen(true)} variant="secondary">
              <Terminal className="size-4" />
              Live Logs
            </Button>
            <Button onClick={() => setEditOpen(true)} variant="secondary">
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button onClick={() => setTruncateOpen(true)} variant="secondary">
              <Eraser className="size-4" />
              Truncate
            </Button>
            <Button onClick={() => setDeleteOpen(true)} variant="destructive">
              <Trash2 className="size-4" />
              Delete
            </Button>
          </>
        }
        backHref="/knowledge"
        description={collection.description ?? undefined}
        title={collection.name}
      />

      <Tabs onChange={setTab} tabs={TABS} value={tab} />

      {tab === "overview" && <CollectionStats collection={collection} />}
      {tab === "documents" && <DocumentsTab collectionId={id} />}
      {tab === "imports" && <ImportsTab collectionId={id} />}
      {tab === "search" && <SearchTab collectionId={id} />}
      {tab === "analytics" && <AnalyticsTab collectionId={id} />}

      <LiveLogsModal
        connected={connected}
        logs={logs}
        onClear={clearLogs}
        onClose={() => setLogsOpen(false)}
        open={logsOpen}
      />

      <CollectionForm
        editingCollection={collection}
        key={editOpen ? "edit" : "closed"}
        mode={editOpen ? "edit" : null}
        onClose={() => setEditOpen(false)}
      />

      <ConfirmDialog
        confirmLabel={truncateMutation.isPending ? "Truncating..." : "Truncate"}
        description="This will delete all documents, vectors, storage files, and cancel all S3 import jobs. The collection itself will be kept. This cannot be undone."
        loading={truncateMutation.isPending}
        onClose={() => setTruncateOpen(false)}
        onConfirm={async () => {
          await truncateMutation.mutateAsync(id);
          setTruncateOpen(false);
        }}
        open={truncateOpen}
        title="Truncate Collection"
      />

      <ConfirmDialog
        confirmLabel={deleteMutation.isPending ? "Deleting..." : "Delete"}
        description="Are you sure you want to delete this collection? All documents and chunks will be permanently removed. This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        open={deleteOpen}
        title="Delete Collection"
      />
    </div>
  );
};

export default CollectionDetailPage;
