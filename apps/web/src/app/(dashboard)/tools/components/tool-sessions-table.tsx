"use client";

import { Button, Spinner } from "@raven/ui";
import { ChevronLeft, ChevronRight, MessageSquare, Wrench } from "lucide-react";
import type { ToolSession } from "../hooks/use-tools";

interface ToolSessionsTableProps {
  sessions: ToolSession[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const formatTimeAgo = (ts: string): string => {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export const ToolSessionsTable = ({
  sessions,
  loading,
  page,
  totalPages,
  onPageChange
}: ToolSessionsTableProps) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-border p-12 text-center">
        <Spinner className="mx-auto" />
        <p className="mt-3 text-sm text-muted-foreground">
          Loading sessions...
        </p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-border p-12 text-center">
        <Wrench className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          No sessions with tool usage found.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Key
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                User Agent
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Requests
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Models
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tool Uses
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Last Activity
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, idx) => (
              <tr
                className={`transition-colors hover:bg-muted/30 ${idx !== sessions.length - 1 ? "border-b border-border" : ""}`}
                key={s.sessionId}
              >
                <td className="px-5 py-4 font-medium text-primary">
                  {s.keyName}
                </td>
                <td className="px-5 py-4 text-sm text-muted-foreground">
                  {s.userAgent ?? "\u2014"}
                </td>
                <td className="px-5 py-4 text-right tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    {s.requestCount.toLocaleString()}
                    <MessageSquare className="size-3.5 text-muted-foreground" />
                  </span>
                </td>
                <td className="px-5 py-4 text-sm">
                  {s.models.map((m) => (
                    <div className="whitespace-nowrap" key={m}>
                      {m}
                    </div>
                  ))}
                </td>
                <td className="px-5 py-4 text-right tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    {s.toolUses.toLocaleString()}
                    <Wrench className="size-3.5 text-muted-foreground" />
                  </span>
                </td>
                <td className="px-5 py-4 text-right text-sm text-muted-foreground whitespace-nowrap">
                  {formatTimeAgo(s.endTime)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              disabled={page === 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
              size="sm"
              variant="secondary"
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <Button
              disabled={page === totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              size="sm"
              variant="secondary"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
