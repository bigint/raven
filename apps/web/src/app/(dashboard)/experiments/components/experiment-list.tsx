"use client";

import type { Column } from "@raven/ui";
import { Badge, Button, DataTable } from "@raven/ui";
import { FlaskConical, Pause, Play, Plus, Square } from "lucide-react";
import { formatTimeAgo } from "@/lib/format";
import type { Experiment } from "../hooks/use-experiments";

interface ExperimentListProps {
  experiments: Experiment[];
  loading: boolean;
  onAdd: () => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

const STATUS_BADGE: Record<
  Experiment["status"],
  { label: string; variant: "info" | "neutral" | "warning" | "success" }
> = {
  completed: { label: "Completed", variant: "success" },
  draft: { label: "Draft", variant: "neutral" },
  paused: { label: "Paused", variant: "warning" },
  running: { label: "Running", variant: "info" }
};

const columns: Column<Experiment>[] = [
  {
    className: "font-medium",
    header: "Name",
    key: "name",
    render: (exp) => (
      <div>
        <p className="font-medium">{exp.name}</p>
        {exp.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {exp.description}
          </p>
        )}
      </div>
    )
  },
  {
    header: "Status",
    key: "status",
    render: (exp) => {
      const badge = STATUS_BADGE[exp.status];
      return (
        <Badge dot variant={badge.variant}>
          {badge.label}
        </Badge>
      );
    }
  },
  {
    className: "capitalize text-muted-foreground",
    header: "Primary Metric",
    key: "primaryMetric",
    render: (exp) => exp.primaryMetric.replace(/_/g, " ")
  },
  {
    className: "tabular-nums text-muted-foreground",
    header: "Variants",
    key: "variants",
    render: (exp) => exp.variants?.length ?? 0
  },
  {
    className: "text-muted-foreground",
    header: "Created",
    key: "createdAt",
    render: (exp) => formatTimeAgo(exp.createdAt)
  }
];

export const ExperimentList = ({
  experiments,
  loading,
  onAdd,
  onStatusChange,
  onDelete
}: ExperimentListProps) => {
  const allColumns: Column<Experiment>[] = [
    ...columns,
    {
      className: "text-right",
      header: "Actions",
      headerClassName: "text-right",
      key: "actions",
      render: (exp) => (
        <div className="flex items-center justify-end gap-1">
          {exp.status === "draft" && (
            <Button
              onClick={() => onStatusChange(exp.id, "running")}
              size="sm"
              title="Start experiment"
              variant="ghost"
            >
              <Play className="size-4" />
            </Button>
          )}
          {exp.status === "running" && (
            <Button
              onClick={() => onStatusChange(exp.id, "paused")}
              size="sm"
              title="Pause experiment"
              variant="ghost"
            >
              <Pause className="size-4" />
            </Button>
          )}
          {exp.status === "paused" && (
            <>
              <Button
                onClick={() => onStatusChange(exp.id, "running")}
                size="sm"
                title="Resume experiment"
                variant="ghost"
              >
                <Play className="size-4" />
              </Button>
              <Button
                onClick={() => onStatusChange(exp.id, "completed")}
                size="sm"
                title="Complete experiment"
                variant="ghost"
              >
                <Square className="size-4" />
              </Button>
            </>
          )}
          {(exp.status === "draft" || exp.status === "completed") && (
            <Button
              className="hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDelete(exp.id)}
              size="sm"
              title="Delete experiment"
              variant="ghost"
            >
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <DataTable
      columns={allColumns}
      data={experiments}
      emptyAction={
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Create your first experiment
        </Button>
      }
      emptyIcon={<FlaskConical className="size-8" />}
      emptyTitle="No experiments yet"
      keyExtractor={(exp) => exp.id}
      loading={loading}
      loadingMessage="Loading experiments..."
    />
  );
};
