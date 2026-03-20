"use client";

import { Badge, Button, Spinner } from "@raven/ui";
import { Cpu, RefreshCw } from "lucide-react";
import { useAdminProviders, useSyncModels } from "../hooks/use-admin";

export const ModelsTab = () => {
  const { data: providers, isPending, error } = useAdminProviders();
  const syncModels = useSyncModels();

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Models grouped by provider. Sync to fetch the latest models from each
          provider.
        </p>
        <Button
          disabled={syncModels.isPending}
          onClick={() => syncModels.mutate()}
          size="sm"
          variant="secondary"
        >
          <RefreshCw
            className={`size-4 ${syncModels.isPending ? "animate-spin" : ""}`}
          />
          {syncModels.isPending ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      {providers && providers.length === 0 && (
        <div className="rounded-xl border border-border p-12 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <Cpu className="size-5 text-muted-foreground" />
          </div>
          <h2 className="font-medium text-foreground text-base">
            No providers configured
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a provider first, then sync models.
          </p>
        </div>
      )}

      {providers?.map((provider) => (
        <div
          className="rounded-xl border border-border overflow-hidden"
          key={provider.id}
        >
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{provider.provider}</span>
              {provider.name && (
                <span className="text-xs text-muted-foreground">
                  ({provider.name})
                </span>
              )}
            </div>
            <Badge dot variant={provider.isEnabled ? "success" : "neutral"}>
              {provider.isEnabled ? "Active" : "Disabled"}
            </Badge>
          </div>
          <div className="px-5 py-3">
            {provider.models.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                No models synced yet
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {provider.models.map((model) => (
                  <Badge key={model.id} variant="neutral">
                    {model.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
