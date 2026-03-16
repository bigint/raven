"use client";

import { Badge, PageHeader, Select, Spinner } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Radio } from "lucide-react";
import { useState } from "react";
import { eventsQueryOptions, type RavenEvent } from "./hooks/use-events";

const EVENT_TYPE_OPTIONS = [
  { label: "All Events", value: "" },
  { label: "Requests", value: "request.*" },
  { label: "Guardrails", value: "guardrail.*" },
  { label: "Budgets", value: "budget.*" },
  { label: "Providers", value: "provider.*" },
  { label: "Agents", value: "agent.*" }
];

const CATEGORY_VARIANTS: Record<
  string,
  "primary" | "success" | "warning" | "error" | "info" | "neutral"
> = {
  agent: "neutral",
  budget: "warning",
  guardrail: "error",
  provider: "info",
  request: "primary"
};

const getCategoryVariant = (type: string) => {
  const category = type.split(".")[0];
  return CATEGORY_VARIANTS[category] ?? "neutral";
};

const formatRelativeTime = (timestamp: string) => {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const truncateJson = (data: Record<string, unknown>, maxLength = 120) => {
  const str = JSON.stringify(data);
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
};

const EventRow = ({ event }: { event: RavenEvent }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        {expanded ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <Badge variant={getCategoryVariant(event.type)}>{event.type}</Badge>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatRelativeTime(event.timestamp)}
        </span>
        <span className="truncate font-mono text-xs text-muted-foreground">
          {truncateJson(event.data)}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 py-3">
          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                Event ID
              </span>
              <p className="font-mono text-sm">{event.id}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                Timestamp
              </span>
              <p className="text-sm">
                {new Date(event.timestamp).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                Data
              </span>
              <pre className="mt-1 max-h-60 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
                {JSON.stringify(event.data, null, 2)}
              </pre>
            </div>
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Metadata
                </span>
                <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const EventsPage = () => {
  const [typeFilter, setTypeFilter] = useState("");
  const {
    data: events = [],
    isLoading,
    error
  } = useQuery(eventsQueryOptions(typeFilter || undefined));

  return (
    <div>
      <PageHeader
        actions={
          <Select
            onChange={setTypeFilter}
            options={EVENT_TYPE_OPTIONS}
            placeholder="Filter by type"
            value={typeFilter}
          />
        }
        description="Live feed of events across your organization."
        title="Events"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <Spinner className="mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">
            Loading events...
          </p>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <Radio className="size-8" />
          </div>
          <p className="font-medium text-foreground">No events yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Events will appear here as they occur. Auto-refreshes every 10
            seconds.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border">
          {events.map((event) => (
            <EventRow event={event} key={event.id} />
          ))}
        </div>
      )}
    </div>
  );
};

export default EventsPage;
