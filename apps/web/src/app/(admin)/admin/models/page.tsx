"use client";

import { Spinner } from "@raven/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ProviderIcon } from "@/components/model-icon";
import { api } from "@/lib/api";
import { useAdminProviders } from "../../hooks/use-admin";
import { ProviderModelsDialog } from "./provider-models-dialog";

const AdminModelsPage = () => {
  const { data: providers = [], isPending } = useAdminProviders();
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<{
    slug: string;
    name: string;
  } | null>(null);

  const cleanMutation = useMutation({
    mutationFn: () =>
      api.post<{ removedModels: number; removedConfigs: number }>(
        "/v1/admin/models/clean-dangling"
      ),
    onSuccess: (data) => {
      toast.success(
        `Removed ${data.removedModels} models and ${data.removedConfigs} provider configs`
      );
      void queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    }
  });

  const refreshMutation = useMutation({
    mutationFn: (provider: string) =>
      api.post<{ updated: number }>("/v1/admin/models/refresh-pricing", {
        provider
      }),
    onSuccess: (data) => {
      toast.success(`Updated pricing for ${data.updated} models`);
      void queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    }
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Models</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add and manage models from each provider.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          disabled={cleanMutation.isPending}
          onClick={() => cleanMutation.mutate()}
          type="button"
        >
          <Trash2 className="size-3.5" />
          Clean Dangling Models
        </button>
      </div>

      <div className="rounded-xl border border-border">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Providers</h2>
        </div>

        {isPending ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="sm" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {providers.map((p) => (
              <div
                className="flex items-center justify-between px-5 py-4"
                key={p.slug}
              >
                <button
                  className="flex flex-1 items-center gap-3 text-left"
                  onClick={() =>
                    setSelectedProvider({ name: p.name, slug: p.slug })
                  }
                  type="button"
                >
                  <ProviderIcon provider={p.slug} size={20} />
                  <div>
                    <span className="text-sm font-medium">{p.name}</span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.modelCount} {p.modelCount === 1 ? "model" : "models"}
                    </p>
                  </div>
                  <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                </button>
                <button
                  className="ml-2 inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  disabled={refreshMutation.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshMutation.mutate(p.slug);
                  }}
                  type="button"
                >
                  <RefreshCw
                    className={`size-3.5 ${refreshMutation.isPending && refreshMutation.variables === p.slug ? "animate-spin" : ""}`}
                  />
                  Refresh Pricing
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedProvider && (
        <ProviderModelsDialog
          onClose={() => setSelectedProvider(null)}
          open={!!selectedProvider}
          provider={selectedProvider}
        />
      )}
    </div>
  );
};

export default AdminModelsPage;
