"use client";

import { Spinner } from "@raven/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ProviderIcon } from "@/components/model-icon";
import { api } from "@/lib/api";
import { useAdminProviders } from "../../hooks/use-admin";

interface SyncResult {
  readonly added: number;
  readonly updated: number;
  readonly removed: number;
}

const AdminModelsPage = () => {
  const { data: providers = [], isPending } = useAdminProviders();
  const queryClient = useQueryClient();

  const totalModels = providers.reduce((sum, p) => sum + p.modelCount, 0);

  const syncMutation = useMutation({
    mutationFn: () => api.post<SyncResult>("/v1/admin/models/sync"),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: (data) => {
      toast.success(
        `Synced: ${data.added} added, ${data.updated} updated, ${data.removed} removed`
      );
      void queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    }
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Models</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Models are synced automatically from models.dev every 5 minutes.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          disabled={syncMutation.isPending}
          onClick={() => syncMutation.mutate()}
          type="button"
        >
          <RefreshCw
            className={`size-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`}
          />
          {syncMutation.isPending ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      <div className="mb-4 text-sm text-muted-foreground">
        {totalModels} models across {providers.length} providers
      </div>

      <div className="rounded-xl border border-border">
        {isPending ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="sm" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {providers.map((p) => (
              <div className="flex items-center gap-3 px-5 py-4" key={p.slug}>
                <ProviderIcon provider={p.slug} size={20} />
                <div className="flex-1">
                  <span className="text-sm font-medium">{p.name}</span>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.modelCount} {p.modelCount === 1 ? "model" : "models"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminModelsPage;
