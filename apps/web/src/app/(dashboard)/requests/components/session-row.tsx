"use client";

import { Badge, cn } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, MessageSquare, Star, Wrench } from "lucide-react";
import { useState } from "react";
import { ModelIcon } from "@/components/model-icon";
import { formatTimeAgo } from "@/lib/format";
import type { LogSession } from "../hooks/use-logs";
import { sessionDetailQueryOptions, useToggleStar } from "../hooks/use-logs";

interface SessionRowProps {
  readonly session: LogSession;
  readonly onRequestClick: (requestId: string, sessionId: string) => void;
}

const getStatusBadge = (statusCode: number) => {
  const variant =
    statusCode >= 500
      ? "error"
      : statusCode >= 400
        ? "warning"
        : statusCode >= 200 && statusCode < 300
          ? "success"
          : "neutral";
  return <Badge variant={variant}>{statusCode}</Badge>;
};

export const SessionRow = ({ session, onRequestClick }: SessionRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const toggleStar = useToggleStar();

  const { data: detail } = useQuery({
    ...sessionDetailQueryOptions(session.sessionId ?? ""),
    enabled: expanded && !!session.sessionId
  });

  const requests = detail ?? [];

  return (
    <>
      <tr
        className="cursor-pointer border-b border-border transition-colors hover:bg-muted/30"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-5 py-4">
          <ChevronRight
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              expanded && "rotate-90"
            )}
          />
        </td>
        <td className="px-5 py-4 font-medium text-primary">
          {session.keyName}
        </td>
        <td className="px-5 py-4 text-sm text-muted-foreground">
          {session.userAgent ?? "\u2014"}
        </td>
        <td className="px-5 py-4 text-center">
          {session.errorCount > 0 ? (
            <Badge variant="error">
              {session.errorCount} error{session.errorCount > 1 ? "s" : ""}
            </Badge>
          ) : (
            <Badge variant="success">OK</Badge>
          )}
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
          {session.inputTokens.toLocaleString()}
        </td>
        <td className="px-5 py-4 text-right tabular-nums">
          {session.outputTokens.toLocaleString()}
        </td>
        <td className="px-5 py-4 text-right tabular-nums">
          {session.cachedTokens.toLocaleString()}
        </td>
        <td className="px-5 py-4 text-right tabular-nums">
          {session.reasoningTokens.toLocaleString()}
        </td>
        <td className="px-5 py-4 text-right tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            {session.toolUses.toLocaleString()}
            <Wrench className="size-3.5 text-muted-foreground" />
          </span>
        </td>
        <td className="px-5 py-4 text-right tabular-nums">
          ${(Number(session.totalCost) || 0).toFixed(4)}
        </td>
        <td className="px-5 py-4 text-right text-sm text-muted-foreground whitespace-nowrap">
          {formatTimeAgo(session.endTime)}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td className="bg-muted/20 px-0 py-0" colSpan={13}>
            <div className="px-8 py-4">
              {requests.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Loading requests...
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
                      <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Status
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Latency
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Input
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Output
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Cost
                      </th>
                      <th className="w-8 px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => (
                      <tr
                        className="cursor-pointer border-b border-border/30 transition-colors hover:bg-muted/30"
                        key={req.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequestClick(req.id, session.sessionId ?? "");
                        }}
                      >
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
                        <td className="px-3 py-2.5 text-center">
                          {getStatusBadge(req.statusCode)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {req.latencyMs.toLocaleString()}ms
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {req.inputTokens.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {req.outputTokens.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          ${(Number(req.cost) || 0).toFixed(6)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-yellow-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStar.mutate(req.id);
                            }}
                            type="button"
                          >
                            <Star
                              className={cn(
                                "size-3.5",
                                req.isStarred &&
                                  "fill-yellow-500 text-yellow-500"
                              )}
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
