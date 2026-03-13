"use client";

import { Button } from "@raven/ui";
import { Database, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TextMorph } from "torph/react";
import { api } from "@/lib/api";

interface FlushResult {
  deletedCount: number;
}

export const CacheManagement = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [flushing, setFlushing] = useState(false);

  const handleFlush = async () => {
    try {
      setFlushing(true);
      const result = await api.post<FlushResult>("/v1/cache/flush");
      toast.success(`Cache flushed — ${result.deletedCount} entries removed`);
      setShowConfirm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to flush cache");
    } finally {
      setFlushing(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-border">
        <div className="flex items-center gap-3 border-b border-border px-4 py-4 sm:px-6">
          <div className="rounded-lg bg-primary/10 p-2">
            <Database className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Cache Management</h2>
            <p className="text-xs text-muted-foreground">
              Manage cached proxy responses
            </p>
          </div>
        </div>
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Flush Cache</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Remove all cached proxy responses. New requests will be
                forwarded to upstream providers.
              </p>
            </div>
            <Button
              className="shrink-0"
              onClick={() => setShowConfirm(true)}
              type="button"
              variant="destructive"
            >
              Flush Cache
            </Button>
          </div>
        </div>
      </div>

      {showConfirm && (
        // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop dismiss
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowConfirm(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowConfirm(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="px-4 py-4 sm:px-6 sm:py-5">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="size-5 text-destructive" />
              </div>
              <h2 className="text-base font-semibold">Flush Cache</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This will remove all cached proxy responses. Subsequent requests
                will be forwarded directly to upstream providers until new
                responses are cached.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-4 py-4 sm:px-6">
              <Button
                disabled={flushing}
                onClick={() => setShowConfirm(false)}
                type="button"
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                disabled={flushing}
                onClick={handleFlush}
                type="button"
                variant="destructive"
              >
                <TextMorph>
                  {flushing ? "Flushing..." : "Flush Cache"}
                </TextMorph>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
