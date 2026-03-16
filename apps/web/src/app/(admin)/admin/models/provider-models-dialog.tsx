"use client";

import { Badge, Modal, Spinner } from "@raven/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { AvailableModel } from "../../hooks/use-admin";

interface ProviderModelsDialogProps {
  open: boolean;
  onClose: () => void;
  provider: { slug: string; name: string };
}

export const ProviderModelsDialog = ({
  open,
  onClose,
  provider
}: ProviderModelsDialogProps) => {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: models = [], isLoading } = useQuery({
    enabled: open,
    queryFn: () =>
      api.get<AvailableModel[]>(
        `/v1/admin/models/search?provider=${provider.slug}&q=${encodeURIComponent(search)}`
      ),
    queryKey: ["admin", "models-search", provider.slug, search]
  });

  const addMutation = useMutation({
    mutationFn: (modelId: string) =>
      api.post("/v1/admin/models", { modelId, provider: provider.slug }),
    onSuccess: (_data, modelId) => {
      toast.success(`Added ${modelId}`);
      void queryClient.invalidateQueries({
        queryKey: ["admin", "models-search", provider.slug]
      });
      void queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    }
  });

  const removeMutation = useMutation({
    mutationFn: (modelId: string) =>
      api.delete(`/v1/admin/models/${provider.slug}/${modelId}`),
    onSuccess: (_data, modelId) => {
      toast.success(`Removed ${modelId}`);
      void queryClient.invalidateQueries({
        queryKey: ["admin", "models-search", provider.slug]
      });
      void queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    }
  });

  return (
    <Modal onClose={onClose} open={open} size="lg" title={provider.name}>
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models..."
            value={search}
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : models.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No models found
            </p>
          ) : (
            <div className="divide-y divide-border">
              {models.map((model) => (
                <div
                  className="flex items-center justify-between py-3"
                  key={model.id}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {model.name}
                      </span>
                      <Badge variant="neutral">{model.category}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {model.id}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>${model.inputPrice}/M in</span>
                      <span>${model.outputPrice}/M out</span>
                      {model.contextWindow > 0 && (
                        <span>
                          {(model.contextWindow / 1000).toFixed(0)}K ctx
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className={`ml-3 inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      model.isAdded
                        ? "text-destructive hover:bg-destructive/10"
                        : "text-primary hover:bg-primary/10"
                    }`}
                    disabled={
                      addMutation.isPending || removeMutation.isPending
                    }
                    onClick={() =>
                      model.isAdded
                        ? removeMutation.mutate(model.id)
                        : addMutation.mutate(model.id)
                    }
                    type="button"
                  >
                    {model.isAdded ? (
                      <>
                        <Minus className="size-3.5" />
                        Remove
                      </>
                    ) : (
                      <>
                        <Plus className="size-3.5" />
                        Add
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
