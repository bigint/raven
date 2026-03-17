"use client";

import { Spinner } from "@raven/ui";
import { ScrollText } from "lucide-react";
import type { LogSession } from "../hooks/use-logs";
import { SessionRow } from "./session-row";

interface LogsTableProps {
  data: LogSession[];
  loading: boolean;
  onRequestClick: (requestId: string, sessionId: string) => void;
}

const TABLE_HEADERS = [
  { className: "w-10", label: "" },
  { className: "text-left", label: "Key" },
  { className: "text-left", label: "User Agent" },
  { className: "text-center", label: "Status" },
  { className: "text-right", label: "Requests" },
  { className: "text-left", label: "Models" },
  { className: "text-right", label: "Input Tokens" },
  { className: "text-right", label: "Output Tokens" },
  { className: "text-right", label: "Cached" },
  { className: "text-right", label: "Reasoning" },
  { className: "text-right", label: "Tool Uses" },
  { className: "text-right", label: "Last Activity" }
];

export const LogsTable = ({
  data,
  loading,
  onRequestClick
}: LogsTableProps) => {
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

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border p-12 text-center">
        <ScrollText className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          No sessions found for the selected period.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {TABLE_HEADERS.map((h, i) => (
              <th
                className={`px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground ${h.className}`}
                key={h.label || `expand-${i}`}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((session, index) => (
            <SessionRow
              key={`${session.sessionId}-${index}`}
              onRequestClick={onRequestClick}
              session={session}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
