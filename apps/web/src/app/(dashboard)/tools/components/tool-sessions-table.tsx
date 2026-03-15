"use client";

import { Badge, Spinner } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, MessageSquare, Wrench } from "lucide-react";
import { useState } from "react";
import { ModelIcon } from "@/components/model-icon";
import { formatTimeAgo } from "@/lib/format";
import type { ToolSession } from "../hooks/use-tools";
import {
  type SessionRequest,
  sessionDetailQueryOptions
} from "../hooks/use-tools";

interface ToolSessionsTableProps {
  sessions: ToolSession[];
  loading: boolean;
}

const ToolSessionRow = ({ session }: { session: ToolSession }) => {
  const [expanded, setExpanded] = useState(false);

  const { data: requests } = useQuery({
    ...sessionDetailQueryOptions(session.sessionId ?? ""),
    enabled: expanded && !!session.sessionId
  });

  const toolRequests = (requests ?? []).filter(
    (r: SessionRequest) =>
      r.toolCount > 0 || (r.toolNames && r.toolNames.length > 0)
  );

  return (
    <>
      <tr
        className="cursor-pointer border-b border-border transition-colors hover:bg-muted/30"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-5 py-4">
          <ChevronRight
            className={`size-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </td>
        <td className="px-5 py-4 font-medium text-primary">
          {session.keyName}
        </td>
        <td className="px-5 py-4 text-sm text-muted-foreground">
          {session.userAgent ?? "\u2014"}
        </td>
        <td className="px-5 py-4 text-right tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            {session.requestCount.toLocaleString()}
            <MessageSquare className="size-3.5 text-muted-foreground" />
          </span>
        </td>
        <td className="px-5 py-4 text-sm">
          {session.models.map((m) => (
            <div
              className="flex items-center gap-1.5 whitespace-nowrap"
              key={m}
            >
              <ModelIcon model={m} size={14} />
              {m}
            </div>
          ))}
        </td>
        <td className="px-5 py-4 text-right tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            {session.toolUses.toLocaleString()}
            <Wrench className="size-3.5 text-muted-foreground" />
          </span>
        </td>
        <td className="px-5 py-4 text-right text-sm text-muted-foreground whitespace-nowrap">
          {formatTimeAgo(session.endTime)}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td className="bg-muted/20 px-0 py-0" colSpan={7}>
            <div className="px-8 py-4">
              {requests ? (
                toolRequests.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No tool usage details available for this session.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Time
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Model
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Tools
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Tool Calls
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {toolRequests.map((req: SessionRequest) => (
                        <tr className="border-b border-border/30" key={req.id}>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(req.createdAt).toLocaleString(undefined, {
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              month: "short",
                              second: "2-digit"
                            })}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs">
                            <span className="inline-flex items-center gap-1.5">
                              <ModelIcon model={req.model} size={14} />
                              {req.model}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {req.toolNames && req.toolNames.length > 0 ? (
                                req.toolNames.map((name, i) => (
                                  <Badge key={`${name}-${i}`} variant="neutral">
                                    {name}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {req.toolCount} tool
                                  {req.toolCount === 1 ? "" : "s"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {req.toolCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Loading requests...
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export const ToolSessionsTable = ({
  sessions,
  loading
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
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="w-10 px-5 py-3" />
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
            {sessions.map((s) => (
              <ToolSessionRow key={s.sessionId} session={s} />
            ))}
          </tbody>
        </table>
      </div>
  );
};
