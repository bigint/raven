"use client";

import type { Column } from "@raven/ui";
import { Badge, Button, DataTable } from "@raven/ui";
import { ClipboardCheck, Eye, Play, Plus, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { Evaluation } from "../hooks/use-evaluations";

interface EvaluationListProps {
  evaluations: Evaluation[];
  loading: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onRun: (evaluation: Evaluation) => void;
  onView: (evaluation: Evaluation) => void;
}

const statusVariant = (status: Evaluation["status"]) => {
  switch (status) {
    case "completed":
      return "success";
    case "running":
      return "info";
    case "failed":
      return "error";
    case "pending":
      return "warning";
    default:
      return "neutral";
  }
};

const columns: Column<Evaluation>[] = [
  {
    className: "font-medium",
    header: "Name",
    key: "name",
    render: (e) => e.name
  },
  {
    header: "Model",
    key: "model",
    render: (e) => <Badge variant="neutral">{e.model}</Badge>
  },
  {
    header: "Status",
    key: "status",
    render: (e) => (
      <Badge dot variant={statusVariant(e.status)}>
        {e.status}
      </Badge>
    )
  },
  {
    header: "Score",
    key: "score",
    render: (e) =>
      e.score === null ? (
        <span className="text-muted-foreground">&mdash;</span>
      ) : (
        <span className="font-mono text-sm">
          {(Number(e.score) * 100).toFixed(1)}%
        </span>
      )
  },
  {
    header: "Pass / Fail",
    key: "passCount",
    render: (e) => (
      <span className="text-sm text-muted-foreground">
        {e.passCount} / {e.failCount}
      </span>
    )
  },
  {
    className: "text-muted-foreground",
    header: "Created",
    key: "createdAt",
    render: (e) => <span className="text-sm">{formatDate(e.createdAt)}</span>
  }
];

const EvaluationList = ({
  evaluations,
  loading,
  onAdd,
  onDelete,
  onRun,
  onView
}: EvaluationListProps) => {
  const allColumns: Column<Evaluation>[] = [
    ...columns,
    {
      className: "text-right",
      header: "Actions",
      headerClassName: "text-right",
      key: "actions",
      render: (e) => (
        <div className="flex items-center justify-end gap-1">
          {e.status === "completed" && (
            <Button
              onClick={() => onView(e)}
              size="sm"
              title="View results"
              variant="ghost"
            >
              <Eye className="size-4" />
            </Button>
          )}
          {(e.status === "pending" || e.status === "completed") && (
            <Button
              onClick={() => onRun(e)}
              size="sm"
              title="Run evaluation"
              variant="ghost"
            >
              <Play className="size-4" />
            </Button>
          )}
          <Button
            className="hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(e.id)}
            size="sm"
            title="Delete evaluation"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <DataTable
      columns={allColumns}
      data={evaluations}
      emptyAction={
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Create your first evaluation
        </Button>
      }
      emptyIcon={<ClipboardCheck className="size-8" />}
      emptyTitle="No evaluations yet"
      keyExtractor={(e) => e.id}
      loading={loading}
      loadingMessage="Loading evaluations..."
    />
  );
};

export { EvaluationList };
