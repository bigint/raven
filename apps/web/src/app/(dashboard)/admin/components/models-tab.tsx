"use client";

import { Badge, Button, Spinner } from "@raven/ui";
import { Cpu, RefreshCw } from "lucide-react";
import { ProviderIcon } from "@/components/model-icon";
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

  const totalModels =
    providers?.reduce((sum, p) => sum + p.modelCount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalModels} {totalModels === 1 ? "model" : "models"} across{" "}
          {providers?.length ?? 0} providers
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

      {providers && providers.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Provider
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Models
                </th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => (
                <tr
                  className="border-b border-border last:border-b-0"
                  key={provider.slug}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                        <ProviderIcon
                          provider={provider.slug}
                          size={18}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {provider.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Badge variant="neutral">
                      {provider.modelCount}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
