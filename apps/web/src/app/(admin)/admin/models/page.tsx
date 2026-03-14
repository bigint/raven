"use client";

import { Badge } from "@raven/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { ProviderIcon } from "@/components/model-icon";
import { API_URL, api } from "@/lib/api";
import {
  type SyncResult,
  useAdminSyncedProviders
} from "../../hooks/use-admin";

const AdminModelsPage = () => {
  const queryClient = useQueryClient();
  const { data: providers = [], isPending } = useAdminSyncedProviders();
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");

  const syncMutation = useMutation({
    mutationFn: () => api.post<SyncResult>("/v1/admin/models/sync"),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "synced-providers"]
      });
    }
  });

  const addMutation = useMutation({
    mutationFn: (data: { slug: string; name: string }) =>
      api.post("/v1/admin/synced-providers", data),
    onSuccess: () => {
      setNewSlug("");
      setNewName("");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "synced-providers"]
      });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      slug,
      isEnabled
    }: {
      slug: string;
      isEnabled: boolean;
    }) => {
      const res = await fetch(`${API_URL}/v1/admin/synced-providers/${slug}`, {
        body: JSON.stringify({ isEnabled }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "PATCH"
      });
      if (!res.ok) throw new Error("Failed to update provider");
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "synced-providers"]
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (slug: string) =>
      api.delete(`/v1/admin/synced-providers/${slug}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "synced-providers"]
      });
    }
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Models</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage model providers and sync from OpenRouter.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          disabled={syncMutation.isPending}
          onClick={() => syncMutation.mutate()}
          type="button"
        >
          {syncMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Sync Now
        </button>
      </div>

      {syncMutation.isSuccess && syncMutation.data && (
        <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          Sync complete: {syncMutation.data.synced} models synced,{" "}
          {syncMutation.data.removed} removed.
        </div>
      )}

      {syncMutation.isError && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Sync failed: {syncMutation.error.message}
        </div>
      )}

      <div className="rounded-xl border border-border">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Synced Providers</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Models are fetched from OpenRouter for enabled providers every 5
            minutes.
          </p>
        </div>

        {isPending ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {providers.map((p) => (
              <div
                className="flex items-center justify-between px-5 py-4"
                key={p.slug}
              >
                <div className="flex items-center gap-3">
                  <ProviderIcon provider={p.slug} size={20} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{p.name}</span>
                      <Badge variant={p.isEnabled ? "success" : "neutral"}>
                        {p.isEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{p.modelCount} models</span>
                      <span>
                        {p.lastSyncedAt
                          ? `Last synced ${new Date(p.lastSyncedAt).toLocaleString()}`
                          : "Never synced"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                    onClick={() =>
                      toggleMutation.mutate({
                        isEnabled: !p.isEnabled,
                        slug: p.slug
                      })
                    }
                    type="button"
                  >
                    {p.isEnabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      if (
                        confirm(
                          `Remove ${p.name}? This will delete all its models.`
                        )
                      ) {
                        deleteMutation.mutate(p.slug);
                      }
                    }}
                    type="button"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-border px-5 py-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">
            Add Provider
          </p>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (newSlug && newName) {
                addMutation.mutate({ name: newName, slug: newSlug });
              }
            }}
          >
            <input
              className="h-9 w-36 rounded-md border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground/30"
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="slug (e.g. google)"
              type="text"
              value={newSlug}
            />
            <input
              className="h-9 w-44 rounded-md border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground/30"
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Display name"
              type="text"
              value={newName}
            />
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-muted px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
              disabled={!newSlug || !newName || addMutation.isPending}
              type="submit"
            >
              <Plus className="size-3.5" />
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminModelsPage;
