"use client";

import { cn } from "@raven/ui";
import { Star, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ModelIcon } from "@/components/model-icon";
import type { SessionRequest } from "../hooks/use-logs";
import { useToggleStar } from "../hooks/use-logs";

interface RequestDetailProps {
  request: SessionRequest | null;
  onClose: () => void;
}

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-sm font-medium">{value}</p>
  </div>
);

export const RequestDetail = ({ request, onClose }: RequestDetailProps) => {
  const toggleStar = useToggleStar();

  return (
    <AnimatePresence>
      {request && (
        <>
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 bg-black/30"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            animate={{ x: 0 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-border bg-background shadow-xl"
            exit={{ x: "100%" }}
            initial={{ x: "100%" }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold">Request Details</h2>
                  <button
                    className="rounded p-0.5 text-muted-foreground transition-colors hover:text-yellow-500"
                    onClick={() => toggleStar.mutate(request.id)}
                    type="button"
                  >
                    <Star
                      className={cn(
                        "size-4",
                        request.isStarred && "fill-yellow-500 text-yellow-500"
                      )}
                    />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  ID: {request.id}
                </p>
              </div>
              <button
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={onClose}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="border-b border-border px-6 py-5">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Metric Information
              </h3>
              <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                <Field
                  label="Session ID"
                  value={request.sessionId ?? "\u2014"}
                />
                <Field
                  label="Timestamp"
                  value={new Date(request.createdAt).toLocaleString()}
                />
                <div>
                  <p className="text-xs text-muted-foreground">Model</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium">
                    <ModelIcon
                      model={request.model}
                      provider={request.provider}
                    />
                    {request.model}
                  </p>
                </div>
                <Field
                  label="Duration"
                  value={`${request.latencyMs.toLocaleString()} ms`}
                />
                <Field
                  label="Input Tokens"
                  value={request.inputTokens.toLocaleString()}
                />
                <Field
                  label="Output Tokens"
                  value={request.outputTokens.toLocaleString()}
                />
                <Field
                  label="Cache Tokens"
                  value={request.cachedTokens.toLocaleString()}
                />
                <Field
                  label="Reasoning Tokens"
                  value={request.reasoningTokens.toLocaleString()}
                />
                <Field
                  label="Cost"
                  value={`$${Number(request.cost).toFixed(6)}`}
                />
                <Field
                  label="Tokens/Second"
                  value={
                    request.latencyMs > 0
                      ? (
                          request.outputTokens /
                          (request.latencyMs / 1000)
                        ).toFixed(1)
                      : "\u2014"
                  }
                />
                <Field
                  label="Total Tokens"
                  value={(
                    request.inputTokens +
                    request.outputTokens +
                    request.cachedTokens +
                    request.reasoningTokens
                  ).toLocaleString()}
                />
              </div>
            </div>

            <div className="border-b border-border px-6 py-5">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Request Metadata
              </h3>
              <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                <Field label="Method" value={request.method} />
                <Field label="Path" value={request.path} />
                <Field label="Status Code" value={String(request.statusCode)} />
                <Field label="Provider" value={request.provider} />
                <Field
                  label="Cache Hit"
                  value={request.cacheHit ? "Yes" : "No"}
                />
                <Field label="Tools Used" value={String(request.toolCount)} />
              </div>
            </div>

            <div className="border-b border-border px-6 py-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tool Use
                </h3>
                <span className="text-xs text-muted-foreground">
                  Tools Called: {request.toolCount}
                </span>
              </div>
              {request.toolCount === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No tool usage recorded.
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  {request.toolCount} tool call
                  {request.toolCount === 1 ? "" : "s"} in this request.
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
